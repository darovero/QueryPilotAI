using Azure.Identity;
using Azure.Core;
using Azure.AI.Projects;
using Azure.AI.Extensions.OpenAI;
using Core.Application.Contracts;
using OpenAI.Responses;
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

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("warnings")]
    public string[]? Warnings { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("subtitle")]
    public string? Subtitle { get; set; }
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
    private readonly ProjectResponsesClient _sqlPlannerResponsesClient;
    private readonly ProjectResponsesClient _resultInterpreterResponsesClient;
    private readonly ProjectResponsesClient _conciergeResponsesClient;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    public FoundryAgentClient(
        string projectEndpoint,
        string sqlPlannerAgentReference,
        string resultInterpreterAgentReference,
        string conciergeAgentReference,
        string? apiKey = null,
        string? tenantId = null)
    {
        var credentialOptions = new DefaultAzureCredentialOptions();
        if (!string.IsNullOrWhiteSpace(tenantId))
        {
            credentialOptions.TenantId = tenantId;
        }

        TokenCredential credential = new ChainedTokenCredential(
            new AzureCliCredential(new AzureCliCredentialOptions
            {
                TenantId = credentialOptions.TenantId
            }),
            new DefaultAzureCredential(credentialOptions));

        AIProjectClient projectClient = new(
            endpoint: new Uri(projectEndpoint.Trim()),
            tokenProvider: credential);

        var sqlPlannerAgent = ParseAgentReference(sqlPlannerAgentReference, nameof(sqlPlannerAgentReference));
        var resultInterpreterAgent = ParseAgentReference(resultInterpreterAgentReference, nameof(resultInterpreterAgentReference));
        var conciergeAgent = ParseAgentReference(conciergeAgentReference, nameof(conciergeAgentReference));

        Console.WriteLine($"[FOUNDRY AGENT CONFIG] SQL Planner: {sqlPlannerAgent.Name}:{sqlPlannerAgent.Version}");
        Console.WriteLine($"[FOUNDRY AGENT CONFIG] Result Interpreter: {resultInterpreterAgent.Name}:{resultInterpreterAgent.Version}");
        Console.WriteLine($"[FOUNDRY AGENT CONFIG] Concierge: {conciergeAgent.Name}:{conciergeAgent.Version}");

        _sqlPlannerResponsesClient = projectClient.OpenAI.GetProjectResponsesClientForAgent(sqlPlannerAgent);
        _resultInterpreterResponsesClient = projectClient.OpenAI.GetProjectResponsesClientForAgent(resultInterpreterAgent);
        _conciergeResponsesClient = projectClient.OpenAI.GetProjectResponsesClientForAgent(conciergeAgent);
    }

    public async Task<SqlPlannerResponse> PlanSqlAsync(string question, string dbSchema, string? conversationContext = null)
    {
        var userMessage = BuildSqlPlannerMessage(question, dbSchema, conversationContext);
        var responseText = await RunAgentAsync(_sqlPlannerResponsesClient, userMessage, "sql-planner");
        
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
        var responseText = await RunAgentAsync(_resultInterpreterResponsesClient, userMessage, "result-interpreter");

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
            var classificationPrompt = BuildConciergeClassificationMessage(message);
            var responseText = await RunAgentAsync(_conciergeResponsesClient, classificationPrompt, "concierge");

            Console.WriteLine($"[CONCIERGE RAW RESPONSE]:\n{responseText}\n----------------------");

            if (string.IsNullOrWhiteSpace(responseText) || responseText == "{}")
            {
                Console.WriteLine("[CONCIERGE] Empty response — defaulting to analytical.");
                return new ConversationalClassification("analytical", string.Empty, 0.5);
            }

            try
            {
                var classification = JsonSerializer.Deserialize<ConciergeClassification>(responseText, JsonOptions);
                if (classification?.Category != null)
                {
                    Console.WriteLine($"[CONCIERGE CLASSIFICATION] Category={classification.Category}, Confidence={classification.Confidence}");
                    return new ConversationalClassification(
                        classification.Category,
                        classification.Reply ?? string.Empty,
                        classification.Confidence);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CONCIERGE DESERIALIZATION ERROR]: {ex.Message}\nRaw: {responseText}");
            }

            // Could not parse JSON — default to analytical so the pipeline runs.
            // The SQL Planner and safety checks will handle non-data queries gracefully.
            Console.WriteLine("[CONCIERGE] Could not parse JSON classification — defaulting to analytical.");
            return new ConversationalClassification("analytical", string.Empty, 0.5);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CONCIERGE EXCEPTION]: {ex.Message}");
            return null;
        }
    }

    private static async Task<string> RunAgentAsync(ProjectResponsesClient responseClient, string userMessage, string agentRole)
    {
        ResponseResult response = await responseClient.CreateResponseAsync(userMessage);
        var output = response.GetOutputText()?.Trim();

        if (string.IsNullOrWhiteSpace(output))
        {
            Console.WriteLine($"[FOUNDRY RESPONSE EMPTY] role={agentRole}; responseId={response.Id}; status={response.Status}");
            return "{}";
        }

        if (output.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            output = output[7..];
        else if (output.StartsWith("```", StringComparison.OrdinalIgnoreCase))
            output = output[3..];
        if (output.EndsWith("```", StringComparison.OrdinalIgnoreCase))
            output = output[..^3];

        return output.Trim();
    }

    private static AgentReference ParseAgentReference(string rawReference, string settingName)
    {
        if (string.IsNullOrWhiteSpace(rawReference))
        {
            throw new ArgumentException($"Missing Foundry agent reference: {settingName}.", settingName);
        }

        var trimmed = rawReference.Trim();
        var separatorIndex = trimmed.IndexOf(':');
        if (separatorIndex <= 0 || separatorIndex == trimmed.Length - 1)
        {
            return new AgentReference(name: trimmed);
        }

        var name = trimmed[..separatorIndex].Trim();
        var version = trimmed[(separatorIndex + 1)..].Trim();
        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(version))
        {
            return new AgentReference(name: trimmed);
        }

        return new AgentReference(name: name, version: version);
    }

    private static string BuildConciergeClassificationMessage(string userMessage)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("=== INSTRUCCIÓN DE CLASIFICACIÓN ===");
        sb.AppendLine("Tu tarea es clasificar si el mensaje del usuario requiere análisis de datos (consulta a base de datos, métricas, estadísticas, reportes, gráficas, tendencias, fraude) o es conversacional (saludo, pregunta general, ayuda, agradecimiento, prueba).");
        sb.AppendLine();
        sb.AppendLine("=== MENSAJE DEL USUARIO ===");
        sb.AppendLine(userMessage);
        sb.AppendLine();
        sb.AppendLine("=== INSTRUCCIÓN CRÍTICA DE RESPUESTA ===");
        sb.AppendLine("RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO. SIN TEXTO ADICIONAL, SIN MARKDOWN, SIN EXPLICACIONES.");
        sb.AppendLine("Reglas:");
        sb.AppendLine("- Si el mensaje pide datos, métricas, reportes, gráficas, estadísticas, consultas SQL o análisis → category: \"analytical\"");
        sb.AppendLine("- Si es un saludo, conversación casual, prueba o pregunta de ayuda → category: \"conversational\" y reply con tu respuesta");
        sb.AppendLine();
        sb.AppendLine("FORMATO SI ES ANALÍTICO:");
        sb.AppendLine("{");
        sb.AppendLine("  \"category\": \"analytical\",");
        sb.AppendLine("  \"reply\": \"\",");
        sb.AppendLine("  \"confidence\": 0.95");
        sb.AppendLine("}");
        sb.AppendLine();
        sb.AppendLine("FORMATO SI ES CONVERSACIONAL:");
        sb.AppendLine("{");
        sb.AppendLine("  \"category\": \"conversational\",");
        sb.AppendLine("  \"reply\": \"Tu respuesta amigable al usuario aquí\",");
        sb.AppendLine("  \"confidence\": 0.95");
        sb.AppendLine("}");
        return sb.ToString();
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
            sb.AppendLine("=== REGLAS DE MEMORIA CONVERSACIONAL ===");
            sb.AppendLine("- Si la pregunta actual hace referencia al contexto previo (por ejemplo: 'esa', 'dicha', 'la misma', 'genera una gráfica de eso'), debes resolverla usando el último turno analítico disponible.");
            sb.AppendLine("- Si el usuario pide visualización o continuación de un análisis previo, reutiliza la misma lógica analítica y produce SQL listo para ejecutarse.");
            sb.AppendLine("- No marques 'unsupported' cuando exista contexto suficiente en los turnos previos para responder la intención actual.");
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
        sb.AppendLine("NO menciones gráficas, charts, visualizaciones ni recomendaciones visuales en 'response_for_user' o 'executive_summary' salvo que el usuario lo haya pedido explícitamente.");
        sb.AppendLine("Si consideras una visualización útil pero no fue solicitada, omítela del texto visible al usuario.");
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
