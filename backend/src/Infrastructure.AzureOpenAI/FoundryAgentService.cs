using Azure;
using Azure.Core;
using Azure.Identity;
using Azure.AI.OpenAI;
using OpenAI.Assistants;
using Core.Application.Contracts;
using System.Text.Json;
using System.Collections.Concurrent;

namespace Infrastructure.AzureOpenAI;

public interface IFoundryAgentService
{
    Task<ConversationalClassification?> ProcessUserMessageAsync(string userId, string? sessionId, string message);
}

public sealed class FoundryAgentService : IFoundryAgentService
{
    private static readonly AzureOpenAIClient Client;
    private static readonly AssistantClient AssistantClient;
    private static string? _assistantId;
    private static readonly SemaphoreSlim InitSemaphore = new(1, 1);
    private static readonly ConcurrentDictionary<string, string> ThreadMap = new(StringComparer.OrdinalIgnoreCase);

    static FoundryAgentService()
    {
        var endpoint = Environment.GetEnvironmentVariable("AzureOpenAI__Endpoint")?.Trim().TrimEnd('/');
        var apiKey = Environment.GetEnvironmentVariable("AzureOpenAI__ApiKey");
        
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            throw new InvalidOperationException("AzureOpenAI__Endpoint is missing.");
        }

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            Client = new AzureOpenAIClient(new Uri(endpoint), new System.ClientModel.ApiKeyCredential(apiKey));
        }
        else
        {
            Client = new AzureOpenAIClient(new Uri(endpoint), new DefaultAzureCredential());
        }
        AssistantClient = Client.GetAssistantClient();
    }

    private static async Task EnsureAssistantExistsAsync()
    {
        if (_assistantId is not null) return;
        
        await InitSemaphore.WaitAsync();
        try
        {
            if (_assistantId is not null) return;

            var deployment = Environment.GetEnvironmentVariable("AzureOpenAI__Deployment") ?? "gpt41mini-std";

            var options = new AssistantCreationOptions
            {
                Name = "FraudAnalyticsConcierge",
                Instructions = 
                    "Eres un Conserje experto en analítica antifraude empresarial. " +
                    "Tu misión es responder amistosamente. Si el usuario dice 'Hola', 'Buenos días', o pregunta '¿Qué puedes hacer?', " +
                    "DEBES responder con texto directamente y explicar tu propósito. BAJO NINGUNA CIRCUNSTANCIA uses herramientas para responder saludos o preguntas de tus capacidades. " +
                    "SOLO debes invocar la herramienta 'query_fraud_analytics' SI Y SOLO SI el usuario explícitamente pide métricas, tablas, rankings, promedios o datos numéricos de fraude.",
                Tools = { 
                    new FunctionToolDefinition()
                    {
                        FunctionName = "query_fraud_analytics",
                        Description = "Ejecuta una consulta analítica en la base de datos empresarial de fraude a partir de una petición en lenguaje natural.",
                        Parameters = BinaryData.FromString("{\"type\":\"object\",\"properties\":{\"question\":{\"type\":\"string\",\"description\":\"La pregunta analítica explícita.\"}},\"required\":[\"question\"]}")
                    }
                }
            };

            var assistant = await AssistantClient.CreateAssistantAsync(deployment, options);
            _assistantId = assistant.Value.Id;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error creando asistente: {ex.Message}");
        }
        finally
        {
            InitSemaphore.Release();
        }
    }

    private static string GetThreadKey(string userId, string? sessionId) 
        => !string.IsNullOrWhiteSpace(sessionId) ? $"session:{sessionId}" : $"user:{userId}";

    public async Task<ConversationalClassification?> ProcessUserMessageAsync(string userId, string? sessionId, string message)
    {
        await EnsureAssistantExistsAsync();
        if (string.IsNullOrWhiteSpace(_assistantId)) return null;

        var key = GetThreadKey(userId, sessionId);
        if (!ThreadMap.TryGetValue(key, out var threadId))
        {
            var thread = await AssistantClient.CreateThreadAsync();
            threadId = thread.Value.Id;
            ThreadMap.TryAdd(key, threadId);
        }

        await AssistantClient.CreateMessageAsync(threadId, MessageRole.User, [MessageContent.FromText(message)]);

        var run = await AssistantClient.CreateRunAsync(threadId, _assistantId);
        var runId = run.Value.Id;

        do
        {
            await Task.Delay(1000);
            run = await AssistantClient.GetRunAsync(threadId, runId);
        }
        while (run.Value.Status == RunStatus.Queued || run.Value.Status == RunStatus.InProgress);

        if (run.Value.Status == RunStatus.RequiresAction)
        {
            var action = run.Value.RequiredActions.FirstOrDefault();
            if (action?.FunctionName == "query_fraud_analytics")
            {
                // We return null to indicate: "Continue with the analytical pipeline!"
                // We won't submit tool outputs back because the Orchestrator produces its own summary.
                // We cancel the run so the assistant thread is ready for the next message.
                await AssistantClient.CancelRunAsync(threadId, runId);
                return new ConversationalClassification("analytical", string.Empty, 1.0);
            }
        }

        if (run.Value.Status == RunStatus.Completed)
        {
            ThreadMessage? lastMessage = null;
            await foreach (var msg in AssistantClient.GetMessagesAsync(threadId, new MessageCollectionOptions { Order = MessageCollectionOrder.Descending }))
            {
                if (msg.Role == MessageRole.Assistant)
                {
                    lastMessage = msg;
                    break; // Just get the latest assistant message
                }
            }
            
            var text = lastMessage?.Content.FirstOrDefault()?.Text ?? "Hola, ¿en qué puedo ayudarte?";
            
            return new ConversationalClassification("conversational", text, 1.0);
        }

        // Cancel on fail or expire
        if (run.Value.Status == RunStatus.Failed || run.Value.Status == RunStatus.Expired)
        {
            return new ConversationalClassification("error", "Perdona, tuve un error procesando tu solicitud. ¿Puedes repetirla?", 0);
        }

        return null;
    }
}
