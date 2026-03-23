using Azure.Identity;
using Azure.AI.Agents.Persistent;
using Core.Application.Contracts;
using System.Text.Json;

namespace Infrastructure.AzureOpenAI;

public sealed class FoundryAgentClient : IFoundryAgentClient
{
    private readonly PersistentAgentsClient _agentsClient;
    private readonly string _sqlPlannerAgentId;
    private readonly string _resultInterpreterAgentId;
    private readonly string _conciergeAgentId;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    public FoundryAgentClient(
        string projectEndpoint,
        string sqlPlannerAgentId,
        string resultInterpreterAgentId,
        string conciergeAgentId)
    {
        _agentsClient = new PersistentAgentsClient(projectEndpoint, new DefaultAzureCredential());
        _sqlPlannerAgentId = sqlPlannerAgentId;
        _resultInterpreterAgentId = resultInterpreterAgentId;
        _conciergeAgentId = conciergeAgentId;
    }

    public async Task<SqlPlannerResponse> PlanSqlAsync(string question, string dbSchema, string? conversationContext = null)
    {
        var userMessage = BuildSqlPlannerMessage(question, dbSchema, conversationContext);
        var responseText = await RunAgentAsync(_sqlPlannerAgentId, userMessage);
        
        Console.WriteLine($"[SQL PLANNER RAW RESPONSE]:\n{responseText}\n----------------------");

        try
        {
            return JsonSerializer.Deserialize<SqlPlannerResponse>(responseText, JsonOptions)
                ?? new SqlPlannerResponse { Status = "unsupported" };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SQL PLANNER DESERIALIZATION ERROR]: {ex.Message}");
            return new SqlPlannerResponse
            {
                Status = "needs_clarification",
                Clarification = new ClarificationInfo { QuestionForUser = responseText },
                UserQuestion = question
            };
        }
    }

    public async Task<ResultInterpretation> InterpretResultsAsync(
        string question, string intentJson, string sql,
        List<Dictionary<string, object?>> rows, string? governanceJson = null)
    {
        var userMessage = BuildResultInterpreterMessage(question, intentJson, sql, rows, governanceJson);
        var responseText = await RunAgentAsync(_resultInterpreterAgentId, userMessage);

        Console.WriteLine("[RESULT INTERPRETER RAW RESPONSE]:");
        Console.WriteLine(responseText);
        Console.WriteLine("----------------------");

        try
        {
            return JsonSerializer.Deserialize<ResultInterpretation>(responseText, JsonOptions)
                ?? new ResultInterpretation { Status = "no_data" };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RESULT INTERPRETER DESERIALIZATION ERROR]: {ex.Message}");
            return new ResultInterpretation
            {
                Status = "success",
                ResponseForUser = responseText,
                ExecutiveSummary = responseText
            };
        }
    }

    public async Task<ConversationalClassification?> ClassifyMessageAsync(string userId, string message)
    {
        try
        {
            var responseText = await RunAgentAsync(_conciergeAgentId, message);

            if (string.IsNullOrWhiteSpace(responseText))
                return null;

            try
            {
                var classification = JsonSerializer.Deserialize<ConciergeClassification>(responseText, JsonOptions);
                if (classification?.Category != null)
                {
                    return new ConversationalClassification(
                        classification.Category,
                        classification.Reply ?? string.Empty,
                        classification.Confidence);
                }
            }
            catch
            {
                // Not JSON — it's a direct conversational reply
            }

            return new ConversationalClassification("conversational", responseText, 1.0);
        }
        catch
        {
            return null;
        }
    }

    private async Task<string> RunAgentAsync(string agentId, string userMessage)
    {
        var options = new ThreadAndRunOptions
        {
            ThreadOptions = new PersistentAgentThreadCreationOptions
            {
                Messages =
                {
                    new ThreadMessageOptions(MessageRole.User, userMessage)
                }
            }
        };

        ThreadRun run = await _agentsClient.CreateThreadAndRunAsync(agentId, options);
        var threadId = run.ThreadId;

        while (run.Status == RunStatus.Queued || run.Status == RunStatus.InProgress)
        {
            await Task.Delay(1000);
            run = await _agentsClient.Runs.GetRunAsync(threadId, run.Id);
        }

        if (run.Status != RunStatus.Completed)
        {
            if (run.Status == RunStatus.RequiresAction)
            {
                await _agentsClient.Runs.CancelRunAsync(threadId, run.Id);
            }
            throw new InvalidOperationException($"Agent run failed with status: {run.Status}");
        }

        var messages = _agentsClient.Messages.GetMessagesAsync(threadId, order: ListSortOrder.Descending);
        await foreach (var msg in messages)
        {
            if (msg.Role == MessageRole.Agent)
            {
                foreach (var content in msg.ContentItems)
                {
                    if (content is MessageTextContent textContent)
                    {
                        var text = textContent.Text;
                        if (text.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
                            text = text[7..];
                        else if (text.StartsWith("```", StringComparison.OrdinalIgnoreCase))
                            text = text[3..];
                        if (text.EndsWith("```", StringComparison.OrdinalIgnoreCase))
                            text = text[..^3];
                        return text.Trim();
                    }
                }
            }
        }

        await _agentsClient.Threads.DeleteThreadAsync(threadId);
        return "{}";
    }

    private static string BuildSqlPlannerMessage(string question, string dbSchema, string? conversationContext)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("=== CATÁLOGO DE DATOS DISPONIBLE ===");
        sb.AppendLine(dbSchema);
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(conversationContext))
        {
            sb.AppendLine("=== CONTEXTO DE CONVERSACIÓN ===");
            sb.AppendLine(conversationContext);
            sb.AppendLine();
        }

        sb.AppendLine("=== PREGUNTA DEL USUARIO ===");
        sb.AppendLine(question);
        sb.AppendLine();
        sb.AppendLine("=== INSTRUCCIÓN CRÍTICA DE RESPUESTA ===");
        sb.AppendLine("TU RESPUESTA DEBE SER ÚNICA Y EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO QUE CUMPLA CON TU ESQUEMA DE SALIDA (status, sql, etc). NO DEBES ENVIAR NINGÚN TEXTO CONVERSACIONAL, SALUDOS, NI MARKTOWN FUEL DEL JSON. SOLO EL JSON PURO.");
        sb.AppendLine("FORMATO ESPERADO:");
        sb.AppendLine("{");
        sb.AppendLine("  \"status\": \"ready\",");
        sb.AppendLine("  \"sql\": {");
        sb.AppendLine("    \"dialect\": \"tsql\",");
        sb.AppendLine("    \"query\": \"TU CONSULTA SQL AQUÍ\",");
        sb.AppendLine("    \"explanation\": \"breve explicación opcional\"");
        sb.AppendLine("  }");
        sb.AppendLine("}");

        return sb.ToString();
    }

    private static string BuildResultInterpreterMessage(
        string question, string intentJson, string sql,
        List<Dictionary<string, object?>> rows, string? governanceJson)
    {
        var sampleRows = rows.Take(50).ToList();
        var rowsJson = JsonSerializer.Serialize(sampleRows);

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("=== PREGUNTA ORIGINAL ===");
        sb.AppendLine(question);
        sb.AppendLine();
        sb.AppendLine("=== INTENCIÓN ANALÍTICA ===");
        sb.AppendLine(intentJson);
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(governanceJson))
        {
            sb.AppendLine("=== GOBERNANZA ===");
            sb.AppendLine(governanceJson);
            sb.AppendLine();
        }

        sb.AppendLine("=== SQL EJECUTADO ===");
        sb.AppendLine(sql);
        sb.AppendLine();
        sb.AppendLine($"=== RESULTADOS ({rows.Count} filas totales, muestra de {sampleRows.Count}) ===");
        sb.AppendLine(rowsJson);
        sb.AppendLine();
        sb.AppendLine("=== INSTRUCCIÓN CRÍTICA DE RESPUESTA ===");
        sb.AppendLine("TU RESPUESTA DEBE SER ÚNICA Y EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO. NO ENVÍES TEXTO CONVERSACIONAL FUERA DEL JSON.");
        sb.AppendLine("FORMATO ESPERADO:");
        sb.AppendLine("{");
        sb.AppendLine("  \"status\": \"success\",");
        sb.AppendLine("  \"executive_summary\": \"Resumen ejecutivo claro y profesional de los resultados\",");
        sb.AppendLine("  \"response_for_user\": \"Explicación completa en lenguaje natural para el usuario, con datos concretos de los resultados\",");
        sb.AppendLine("  \"observations\": [\"observación 1\", \"observación 2\"],");
        sb.AppendLine("  \"recommendations\": [\"recomendación 1\"],");
        sb.AppendLine("  \"confidence\": 0.95");
        sb.AppendLine("}");

        return sb.ToString();
    }
}
