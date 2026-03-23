using Azure.Identity;
using Azure.AI.Agents.Persistent;
using Core.Application.Contracts;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Infrastructure.AzureOpenAI;

/// <summary>
/// Client that invokes agents hosted in Azure AI Foundry.
/// Agents (SQL Planner, Result Interpreter, Concierge) are created and configured
/// in Foundry with their prompts managed there — not hardcoded in this codebase.
/// This service only sends messages and retrieves responses.
/// </summary>
public interface IFoundryAgentClient
{
    /// <summary>
    /// Sends the user's question + database schema to the SQL Planner agent in Foundry.
    /// Returns a structured JSON response with status, intent, SQL, and governance info.
    /// </summary>
    Task<SqlPlannerResponse> PlanSqlAsync(string question, string dbSchema, string? conversationContext = null);

    /// <summary>
    /// Sends the executed SQL results to the Result Interpreter agent in Foundry.
    /// Returns a structured JSON interpretation with findings, recommendations, etc.
    /// </summary>
    Task<ResultInterpretation> InterpretResultsAsync(
        string question, string intentJson, string sql,
        List<Dictionary<string, object?>> rows, string? governanceJson = null);

    /// <summary>
    /// Sends a message to the Concierge agent to classify whether it's conversational or analytical.
    /// </summary>
    Task<ConversationalClassification?> ClassifyMessageAsync(string userId, string message);
}

// --- Response DTOs ---

public sealed class SqlPlannerResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "unsupported";

    [JsonPropertyName("user_question")]
    public string? UserQuestion { get; set; }

    [JsonPropertyName("intent")]
    public JsonElement? Intent { get; set; }

    [JsonPropertyName("understanding")]
    public JsonElement? Understanding { get; set; }

    [JsonPropertyName("data_mapping")]
    public JsonElement? DataMapping { get; set; }

    [JsonPropertyName("governance")]
    public GovernanceInfo? Governance { get; set; }

    [JsonPropertyName("sql")]
    public SqlInfo? Sql { get; set; }

    [JsonPropertyName("clarification")]
    public ClarificationInfo? Clarification { get; set; }
}

public sealed class GovernanceInfo
{
    [JsonPropertyName("safe_to_execute")]
    public bool SafeToExecute { get; set; }

    [JsonPropertyName("risk_level")]
    public string RiskLevel { get; set; } = "low";

    [JsonPropertyName("policy_flags")]
    public string[]? PolicyFlags { get; set; }

    [JsonPropertyName("approval_required")]
    public bool ApprovalRequired { get; set; }

    [JsonPropertyName("approval_reason")]
    public string? ApprovalReason { get; set; }
}

public sealed class SqlInfo
{
    [JsonPropertyName("dialect")]
    public string Dialect { get; set; } = "tsql";

    [JsonPropertyName("query")]
    public string Query { get; set; } = string.Empty;

    [JsonPropertyName("explanation")]
    public string? Explanation { get; set; }
}

public sealed class ClarificationInfo
{
    [JsonPropertyName("question_for_user")]
    public string? QuestionForUser { get; set; }
}

public sealed class ResultInterpretation
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "no_data";

    [JsonPropertyName("question_answered")]
    public string? QuestionAnswered { get; set; }

    [JsonPropertyName("executive_summary")]
    public string? ExecutiveSummary { get; set; }

    [JsonPropertyName("key_findings")]
    public List<KeyFinding>? KeyFindings { get; set; }

    [JsonPropertyName("observations")]
    public string[]? Observations { get; set; }

    [JsonPropertyName("inferences")]
    public string[]? Inferences { get; set; }

    [JsonPropertyName("recommendations")]
    public string[]? Recommendations { get; set; }

    [JsonPropertyName("risk_interpretation")]
    public RiskInterpretation? Risk { get; set; }

    [JsonPropertyName("limitations")]
    public string[]? Limitations { get; set; }

    [JsonPropertyName("follow_up_questions")]
    public string[]? FollowUpQuestions { get; set; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; }

    [JsonPropertyName("response_for_user")]
    public string? ResponseForUser { get; set; }
}

public sealed class KeyFinding
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("evidence")]
    public string? Evidence { get; set; }
}

public sealed class RiskInterpretation
{
    [JsonPropertyName("level")]
    public string Level { get; set; } = "unknown";

    [JsonPropertyName("rationale")]
    public string? Rationale { get; set; }
}

// --- Implementation ---

public sealed class FoundryAgentClient : IFoundryAgentClient
{
    private readonly PersistentAgentsClient _agentsClient;
    private readonly string _sqlPlannerAgentId;
    private readonly string _resultInterpreterAgentId;
    private readonly string _conciergeAgentId;
    private static readonly TimeSpan RunPollingTimeout = TimeSpan.FromSeconds(75);

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
        string conciergeAgentId,
        string? apiKey = null,
        string? tenantId = null)
    {
        var credentialOptions = new DefaultAzureCredentialOptions();
        if (!string.IsNullOrWhiteSpace(tenantId))
        {
            credentialOptions.TenantId = tenantId;
        }

        _agentsClient = new PersistentAgentsClient(
            projectEndpoint,
            new DefaultAzureCredential(credentialOptions));
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
            // The agent responded conversationally — use its text directly
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

            // If the Concierge responded with text, it's conversational
            // If it returned an analytical classification JSON, parse it
            if (string.IsNullOrWhiteSpace(responseText))
                return null;

            // Try to detect if the response is a direct conversational reply
            // vs. a structured classification
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

            // Treat as direct conversational response
            return new ConversationalClassification("conversational", responseText, 1.0);
        }
        catch
        {
            return null;
        }
    }

    private async Task<string> RunAgentAsync(string agentId, string userMessage)
    {
        // Create thread options with the user message included
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

        // Create thread and run in one call 
        ThreadRun run = await _agentsClient.CreateThreadAndRunAsync(agentId, options);
        var threadId = run.ThreadId;

        try
        {
            var deadline = DateTimeOffset.UtcNow + RunPollingTimeout;

            // Poll until complete, but fail fast if the remote run stalls.
            while (run.Status == RunStatus.Queued || run.Status == RunStatus.InProgress)
            {
                if (DateTimeOffset.UtcNow >= deadline)
                {
                    await _agentsClient.Runs.CancelRunAsync(threadId, run.Id);
                    throw new TimeoutException($"Agent run timed out after {RunPollingTimeout.TotalSeconds:F0} seconds.");
                }

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

            // Get the assistant's response
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
                            // Clean markdown wrapping if present
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

            return "{}";
        }
        finally
        {
            await _agentsClient.Threads.DeleteThreadAsync(threadId);
        }
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

// Internal DTO for Concierge parsing
internal sealed class ConciergeClassification
{
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("reply")]
    public string? Reply { get; set; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; } = 1.0;
}
