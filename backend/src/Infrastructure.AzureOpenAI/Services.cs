using Core.Application.Contracts;
using Azure;
using Azure.Core;
using Azure.Identity;
using System.Collections.Concurrent;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Infrastructure.AzureOpenAI;

public interface IIntentService
{
    Task<AnalyticalIntent> ParseIntentAsync(QueryRequest request, List<ConversationTurn> conversationContext);
}

public interface IConversationMemoryService
{
    Task<List<ConversationTurn>> GetRecentTurnsAsync(string userId, string? sessionId, int maxTurns);
    Task AppendTurnAsync(ConversationTurnUpsert turn);
}

public interface ISqlGenerationService
{
    Task<string> GenerateSqlAsync(AnalyticalIntent intent);
}

public interface ISummaryService
{
    Task<string> SummarizeAsync(string question, string sql, List<Dictionary<string, object?>> rows);
}

public sealed class ConversationMemoryService : IConversationMemoryService
{
    private const int MaxTurnsPerSession = 20;
    private readonly ConcurrentDictionary<string, ConcurrentQueue<ConversationTurn>> _memory = new(StringComparer.OrdinalIgnoreCase);

    public Task<List<ConversationTurn>> GetRecentTurnsAsync(string userId, string? sessionId, int maxTurns)
    {
        var key = BuildSessionKey(userId, sessionId);
        if (!_memory.TryGetValue(key, out var queue))
        {
            return Task.FromResult(new List<ConversationTurn>());
        }

        var turns = queue.ToArray().TakeLast(Math.Max(maxTurns, 1)).ToList();
        return Task.FromResult(turns);
    }

    public Task AppendTurnAsync(ConversationTurnUpsert turn)
    {
        var key = BuildSessionKey(turn.UserId, turn.SessionId);
        var queue = _memory.GetOrAdd(key, _ => new ConcurrentQueue<ConversationTurn>());

        queue.Enqueue(new ConversationTurn(
            turn.Question,
            turn.ExecutiveSummary,
            turn.Sql,
            turn.IntentType,
            turn.Metric,
            turn.Timestamp));

        while (queue.Count > MaxTurnsPerSession)
        {
            queue.TryDequeue(out _);
        }

        return Task.CompletedTask;
    }

    private static string BuildSessionKey(string userId, string? sessionId)
    {
        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            return $"session:{sessionId.Trim()}";
        }

        return $"user:{userId.Trim()}";
    }
}

public sealed class IntentService : IIntentService
{
    private static readonly AzureOpenAiChatClient ChatClient = new();

    public async Task<AnalyticalIntent> ParseIntentAsync(QueryRequest request, List<ConversationTurn> conversationContext)
    {
        var question = request.Question.Trim();
        var questionLower = question.ToLowerInvariant();
        var latestTurn = conversationContext.LastOrDefault();
        var aiIntent = await TryInferWithAiAsync(request, conversationContext);

        if (aiIntent is not null)
        {
            var aiFilters = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["question"] = question
            };

            if (latestTurn is not null)
            {
                aiFilters["previous_question"] = latestTurn.Question;
                aiFilters["conversation_turns"] = conversationContext.Count.ToString(CultureInfo.InvariantCulture);
            }

            if (TryExtractTop(questionLower, out var topFromQuestion))
            {
                aiFilters["top"] = topFromQuestion.ToString(CultureInfo.InvariantCulture);
            }
            else if (aiIntent.Top is > 0)
            {
                aiFilters["top"] = Math.Clamp(aiIntent.Top.Value, 1, 100).ToString(CultureInfo.InvariantCulture);
            }

            var currentWindow = NormalizeWindow(aiIntent.TimeWindowCurrent) ?? "last_7_days";
            var baselineWindow = NormalizeWindow(aiIntent.TimeWindowBaseline) ?? InferBaseline(currentWindow);

            return new AnalyticalIntent(
                "fraud",
                NormalizeIntentType(aiIntent.IntentType) ?? "overview",
                NormalizeMetric(aiIntent.Metric) ?? "fraud_rate",
                NormalizeDimensions(aiIntent.Dimensions),
                aiFilters,
                new TimeWindow(currentWindow, baselineWindow),
                NormalizeGrain(aiIntent.Grain) ?? "daily",
                NormalizeSensitivity(aiIntent.Sensitivity) ?? InferSensitivity(request.Role, questionLower),
                NormalizeConfidence(aiIntent.Confidence),
                aiIntent.ClarificationNeeded ?? false);
        }

        var followUp = IsFollowUpQuestion(questionLower);

        var intentType = InferIntentType(questionLower);
        var metric = InferMetric(questionLower);
        var dimensions = InferDimensions(questionLower);
        var window = InferWindow(questionLower);

        if (followUp && latestTurn is not null)
        {
            if (IsGenericIntent(intentType))
            {
                intentType = latestTurn.IntentType;
            }

            if (metric == "fraud_rate")
            {
                metric = InferMetricFromSql(latestTurn.Sql);
            }

            if (dimensions.SequenceEqual(["time"]))
            {
                dimensions = InferDimensionsFromSql(latestTurn.Sql);
            }

            if (window.Current == "last_7_days")
            {
                window = InferWindowFromSql(latestTurn.Sql);
            }
        }

        var sensitivity = InferSensitivity(request.Role, questionLower);

        var filters = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["question"] = question
        };

        if (latestTurn is not null)
        {
            filters["previous_question"] = latestTurn.Question;
            filters["conversation_turns"] = conversationContext.Count.ToString(CultureInfo.InvariantCulture);
        }

        if (TryExtractTop(questionLower, out var top))
        {
            filters["top"] = top.ToString(CultureInfo.InvariantCulture);
        }

        var intent = new AnalyticalIntent(
            "fraud",
            intentType,
            metric,
            dimensions,
            filters,
            window,
            "daily",
            sensitivity,
            0.81,
            false);

        return intent;
    }

    private static async Task<IntentLlmOutput?> TryInferWithAiAsync(QueryRequest request, List<ConversationTurn> conversationContext)
    {
        var conversationJson = JsonSerializer.Serialize(conversationContext.TakeLast(6));
        var systemPrompt =
            "Eres un parser de intencion para analitica antifraude. " +
            "Devuelve SOLO JSON valido sin markdown. " +
            "Debes usar exclusivamente valores permitidos para mantener seguridad. " +
            "intentType permitido: overview, trend_analysis, ranking, anomaly_detection. " +
            "metric permitido: fraud_rate, chargeback_rate, customer_risk_score, failed_then_successful, device_reuse_risk. " +
            "dimensions permitido: time, merchant, customer, device, channel, city. " +
            "timeWindowCurrent permitido: last_7_days, last_30_days, last_90_days. " +
            "timeWindowBaseline permitido: previous_7_days, previous_30_days, previous_90_days. " +
            "grain permitido: daily, weekly, monthly. " +
            "sensitivity permitido: low, medium, high. " +
            "Si falta contexto, marca clarificationNeeded=true.";

        var userPrompt =
            "Analiza esta consulta con su historial y devuelve JSON con esta estructura exacta: " +
            "{\"intentType\":string,\"metric\":string,\"dimensions\":string[],\"timeWindowCurrent\":string,\"timeWindowBaseline\":string,\"grain\":string,\"sensitivity\":string,\"confidence\":number,\"clarificationNeeded\":boolean,\"top\":number|null}. " +
            "No agregues llaves extra. " +
            $"Pregunta actual: {request.Question}\n" +
            $"Rol: {request.Role}\n" +
            $"Historial JSON: {conversationJson}";

        var aiRaw = await ChatClient.CompleteAsync(systemPrompt, userPrompt, jsonResponse: true, maxTokens: 450, temperature: 0.0);
        if (string.IsNullOrWhiteSpace(aiRaw))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<IntentLlmOutput>(aiRaw, JsonDefaults.Options);
        }
        catch
        {
            return null;
        }
    }

    private static string[] NormalizeDimensions(List<string>? dimensions)
    {
        var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "time",
            "merchant",
            "customer",
            "device",
            "channel",
            "city"
        };

        var normalized = (dimensions ?? new List<string>())
            .Select(d => d?.Trim().ToLowerInvariant())
            .Where(d => !string.IsNullOrWhiteSpace(d) && allowed.Contains(d!))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Cast<string>()
            .ToArray();

        return normalized.Length > 0 ? normalized : ["time"];
    }

    private static string? NormalizeIntentType(string? intentType)
    {
        return intentType?.Trim().ToLowerInvariant() switch
        {
            "overview" => "overview",
            "trend_analysis" => "trend_analysis",
            "ranking" => "ranking",
            "anomaly_detection" => "anomaly_detection",
            _ => null
        };
    }

    private static string? NormalizeMetric(string? metric)
    {
        return metric?.Trim().ToLowerInvariant() switch
        {
            "fraud_rate" => "fraud_rate",
            "chargeback_rate" => "chargeback_rate",
            "customer_risk_score" => "customer_risk_score",
            "failed_then_successful" => "failed_then_successful",
            "device_reuse_risk" => "device_reuse_risk",
            _ => null
        };
    }

    private static string? NormalizeWindow(string? window)
    {
        return window?.Trim().ToLowerInvariant() switch
        {
            "last_7_days" => "last_7_days",
            "last_30_days" => "last_30_days",
            "last_90_days" => "last_90_days",
            "previous_7_days" => "previous_7_days",
            "previous_30_days" => "previous_30_days",
            "previous_90_days" => "previous_90_days",
            _ => null
        };
    }

    private static string InferBaseline(string currentWindow)
    {
        return currentWindow switch
        {
            "last_30_days" => "previous_30_days",
            "last_90_days" => "previous_90_days",
            _ => "previous_7_days"
        };
    }

    private static string? NormalizeGrain(string? grain)
    {
        return grain?.Trim().ToLowerInvariant() switch
        {
            "daily" => "daily",
            "weekly" => "weekly",
            "monthly" => "monthly",
            _ => null
        };
    }

    private static string? NormalizeSensitivity(string? sensitivity)
    {
        return sensitivity?.Trim().ToLowerInvariant() switch
        {
            "low" => "low",
            "medium" => "medium",
            "high" => "high",
            _ => null
        };
    }

    private static double NormalizeConfidence(double? confidence)
    {
        if (!confidence.HasValue)
        {
            return 0.8;
        }

        return Math.Clamp(confidence.Value, 0.0, 1.0);
    }

    private static string InferIntentType(string questionLower)
    {
        if (questionLower.Contains("tendencia") || questionLower.Contains("trend"))
        {
            return "trend_analysis";
        }

        if (questionLower.Contains("top") || questionLower.Contains("ranking"))
        {
            return "ranking";
        }

        if (questionLower.Contains("anom") || questionLower.Contains("outlier"))
        {
            return "anomaly_detection";
        }

        return "overview";
    }

    private static bool IsGenericIntent(string intentType) =>
        intentType is "overview";

    private static string InferMetric(string questionLower)
    {
        if (questionLower.Contains("chargeback"))
        {
            return "chargeback_rate";
        }

        if (questionLower.Contains("device") || questionLower.Contains("dispositivo"))
        {
            return "device_reuse_risk";
        }

        if (questionLower.Contains("failed") || questionLower.Contains("fallid"))
        {
            return "failed_then_successful";
        }

        if (questionLower.Contains("customer") || questionLower.Contains("cliente"))
        {
            return "customer_risk_score";
        }

        return "fraud_rate";
    }

    private static string[] InferDimensions(string questionLower)
    {
        var dimensions = new List<string>();

        if (questionLower.Contains("merchant") || questionLower.Contains("comercio"))
        {
            dimensions.Add("merchant");
        }

        if (questionLower.Contains("customer") || questionLower.Contains("cliente"))
        {
            dimensions.Add("customer");
        }

        if (questionLower.Contains("device") || questionLower.Contains("dispositivo"))
        {
            dimensions.Add("device");
        }

        if (dimensions.Count == 0)
        {
            dimensions.Add("time");
        }

        return dimensions.ToArray();
    }

    private static string[] InferDimensionsFromSql(string sql)
    {
        var normalized = sql.ToLowerInvariant();

        if (normalized.Contains("merchant_"))
        {
            return ["merchant"];
        }

        if (normalized.Contains("customer_"))
        {
            return ["customer"];
        }

        if (normalized.Contains("device_") || normalized.Contains("fingerprint"))
        {
            return ["device"];
        }

        return ["time"];
    }

    private static TimeWindow InferWindow(string questionLower)
    {
        if (questionLower.Contains("30") || questionLower.Contains("mes") || questionLower.Contains("month"))
        {
            return new TimeWindow("last_30_days", "previous_30_days");
        }

        if (questionLower.Contains("90") || questionLower.Contains("quarter") || questionLower.Contains("trimestre"))
        {
            return new TimeWindow("last_90_days", "previous_90_days");
        }

        return new TimeWindow("last_7_days", "previous_7_days");
    }

    private static TimeWindow InferWindowFromSql(string sql)
    {
        var normalized = sql.ToLowerInvariant();
        if (normalized.Contains("last_90_days"))
        {
            return new TimeWindow("last_90_days", "previous_90_days");
        }

        if (normalized.Contains("last_30_days"))
        {
            return new TimeWindow("last_30_days", "previous_30_days");
        }

        return new TimeWindow("last_7_days", "previous_7_days");
    }

    private static string InferMetricFromSql(string sql)
    {
        var normalized = sql.ToLowerInvariant();

        if (normalized.Contains("vw_merchant_chargeback_trends"))
        {
            return "chargeback_rate";
        }

        if (normalized.Contains("vw_high_risk_device_reuse"))
        {
            return "device_reuse_risk";
        }

        if (normalized.Contains("vw_failed_then_successful_transactions"))
        {
            return "failed_then_successful";
        }

        if (normalized.Contains("vw_customer_risk_profile"))
        {
            return "customer_risk_score";
        }

        return "fraud_rate";
    }

    private static bool IsFollowUpQuestion(string questionLower)
    {
        return questionLower.Contains("y ahora") ||
            questionLower.Contains("ahora") ||
            questionLower.Contains("tambien") ||
            questionLower.Contains("mismo") ||
            questionLower.Contains("eso") ||
            questionLower.Contains("those") ||
            questionLower.Contains("same") ||
            questionLower.Contains("also");
    }

    private static string InferSensitivity(string role, string questionLower)
    {
        var roleLower = role.ToLowerInvariant();
        var asksSensitive = questionLower.Contains("customer_id") ||
            questionLower.Contains("full_name") ||
            questionLower.Contains("cliente") ||
            questionLower.Contains("customer");

        if (asksSensitive && !roleLower.Contains("admin"))
        {
            return "high";
        }

        return asksSensitive ? "medium" : "low";
    }

    private static bool TryExtractTop(string questionLower, out int top)
    {
        top = 0;
        var match = Regex.Match(questionLower, @"\btop\s+(\d{1,3})\b", RegexOptions.IgnoreCase);
        if (!match.Success)
        {
            return false;
        }

        if (!int.TryParse(match.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
        {
            return false;
        }

        top = Math.Clamp(parsed, 1, 100);
        return true;
    }
}

public sealed class SqlGenerationService : ISqlGenerationService
{
    private static readonly AzureOpenAiChatClient ChatClient = new();

    public async Task<string> GenerateSqlAsync(AnalyticalIntent intent)
    {
        var top = intent.Filters.TryGetValue("top", out var topText) && int.TryParse(topText, out var parsedTop)
            ? Math.Clamp(parsedTop, 1, 100)
            : 25;

        var windowLabel = intent.TimeWindow.Current;
        var sql = intent.Metric switch
        {
            "chargeback_rate" => $@"
SELECT TOP {top}
    merchant_id,
    merchant_name,
    chargeback_rate,
    baseline_rate,
    delta_factor
FROM dbo.vw_merchant_chargeback_trends
WHERE observation_window = '{windowLabel}'
ORDER BY delta_factor DESC",

            "customer_risk_score" => $@"
SELECT TOP {top}
    customer_id,
    segment,
    city,
    risk_level,
    total_transactions,
    total_alerts,
    total_chargebacks
FROM dbo.vw_customer_risk_profile
ORDER BY total_chargebacks DESC, total_alerts DESC",

            "failed_then_successful" => $@"
SELECT TOP {top}
    customer_id,
    account_id,
    first_attempt_ts,
    last_attempt_ts,
    attempts_count
FROM dbo.vw_failed_then_successful_transactions
ORDER BY attempts_count DESC, last_attempt_ts DESC",

            "device_reuse_risk" => $@"
SELECT TOP {top}
    device_id,
    fingerprint,
    distinct_customers,
    max_risk_level
FROM dbo.vw_high_risk_device_reuse
ORDER BY distinct_customers DESC",

            _ => $@"
SELECT TOP {top}
    metric_date,
    channel,
    geo_city,
    total_transactions,
    total_chargebacks,
    chargeback_rate
FROM dbo.vw_daily_fraud_metrics
ORDER BY metric_date DESC"
        };

        var aiSql = await TryGenerateWithAiAsync(intent, top);
        if (!string.IsNullOrWhiteSpace(aiSql))
        {
            return aiSql;
        }

        return sql.Trim();
    }

    private static async Task<string?> TryGenerateWithAiAsync(AnalyticalIntent intent, int top)
    {
        var intentJson = JsonSerializer.Serialize(intent);
        var systemPrompt =
            "Eres un generador de SQL para Azure SQL en un sistema antifraude. " +
            "Devuelve SOLO una sentencia SQL valida, sin markdown ni texto adicional. " +
            "Reglas obligatorias: una sola sentencia SELECT, sin comentarios, sin ; extra, sin DML/DDL, sin EXEC, sin CTE recursiva. " +
            "Solo se permite consultar estas vistas con estos esquemas exactos:\n" +
            "- dbo.vw_daily_fraud_metrics (metric_date, channel, geo_city, total_transactions, total_chargebacks, chargeback_rate)\n" +
            "- dbo.vw_merchant_chargeback_trends (merchant_id, merchant_name, chargeback_rate, baseline_rate, delta_factor, observation_window)\n" +
            "- dbo.vw_customer_risk_profile (customer_id, segment, city, risk_level, total_transactions, total_alerts, total_chargebacks)\n" +
            "- dbo.vw_failed_then_successful_transactions (customer_id, account_id, first_attempt_ts, last_attempt_ts, attempts_count)\n" +
            "- dbo.vw_high_risk_device_reuse (device_id, fingerprint, distinct_customers, max_risk_level)\n\n" +
            "Debes incluir TOP con el valor solicitado y ordenar por relevancia.";

        var userPrompt =
            $"Genera SQL para esta intencion: {intentJson}\n" +
            $"TOP solicitado: {top}\n" +
            "Usa el campo observation_window cuando exista en la vista de chargebacks.";

        var raw = await ChatClient.CompleteAsync(systemPrompt, userPrompt, jsonResponse: false, maxTokens: 450, temperature: 0.1);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        var cleaned = raw.Trim();
        if (cleaned.StartsWith("```", StringComparison.Ordinal))
        {
            cleaned = Regex.Replace(cleaned, "^```[a-zA-Z]*\\s*|\\s*```$", string.Empty, RegexOptions.Singleline).Trim();
        }

        return cleaned;
    }
}

public sealed class SummaryService : ISummaryService
{
    private static readonly AzureOpenAiChatClient ChatClient = new();

    public async Task<string> SummarizeAsync(string question, string sql, List<Dictionary<string, object?>> rows)
    {
        if (rows.Count == 0)
        {
            var emptyJson = new
            {
                summary = "No encontré registros que cumplan esa condición en este momento. Si quieres, podemos ajustar la ventana de tiempo o el filtro para ampliar la búsqueda.",
                chart = new { type = "none" }
            };
            return JsonSerializer.Serialize(emptyJson, JsonDefaults.Options);
        }

        var aiSummary = await TrySummarizeWithAiAsync(question, sql, rows);
        if (!string.IsNullOrWhiteSpace(aiSummary))
        {
            return aiSummary;
        }

        var first = rows[0];

        if (first.ContainsKey("merchant_name") && first.ContainsKey("chargeback_rate"))
        {
            var topMerchant = AsString(first, "merchant_name", "N/D");
            var topRate = AsDecimal(first, "chargeback_rate");
            var baseline = AsDecimal(first, "baseline_rate");
            var delta = AsDecimal(first, "delta_factor");

            var trendText = delta.HasValue
                ? $"con una variación de {FormatDecimal(delta)}x frente a su línea base"
                : "sin variación calculable frente a la línea base";

            var json = new
            {
                summary = $"### Análisis Rápido\n\nAnalicé **{rows.Count}** comercios. El principal foco es **{topMerchant}**, con una tasa de contracargos de **{FormatDecimal(topRate)}** y **{trendText}**.\n\n### Recomendación\nVerificar transacciones recientes de este comercio.",
                extendedReport = $"# Análisis Detallado: Riesgo en Comercios\n\nEste reporte proporciona una vista profunda sobre el comercio **{topMerchant}**.\n\n### Observaciones Clave\n- **Tasa de Contracargos:** {FormatDecimal(topRate)}\n- **Línea Base:** {FormatDecimal(baseline)}\n- **Variación:** {trendText}\n\n### Recomendación Estratégica\nSe sugiere mantener en observación preventiva a este comercio, validando la legitimidad de sus últimas operaciones para determinar si el aumento en la tasa responde a un ataque estructurado o estacionalidad.",
                chart = new
                {
                    type = "bar",
                    title = "Tendencia de Comercios",
                    xAxisKey = "merchant_name",
                    yAxisKey = "chargeback_rate"
                }
            };
            return JsonSerializer.Serialize(json, JsonDefaults.Options);
        }

        if (first.ContainsKey("risk_level") && first.ContainsKey("total_chargebacks"))
        {
            var customer = AsString(first, "customer_id", "N/D");
            var riskLevel = AsString(first, "risk_level", "N/D");
            var chargebacks = AsInt(first, "total_chargebacks");
            var alerts = AsInt(first, "total_alerts");

            var json = new
            {
                summary = $"### Análisis de Riesgo Cliente\n\nEncontré **{rows.Count}** perfiles relevantes. El cliente **{customer}** es prioridad (Riesgo: **{riskLevel}**), con **{chargebacks}** contracargos y **{alerts}** alertas.\n\n### Acción Recomendada\nRevisar manualmente este segmento antes de escalar límites transaccionales.",
                extendedReport = $"# Perfilamiento de Riesgo por Cliente\n\nEl sistema ha identificado comportamientos atípicos en **{rows.Count}** clientes, destacando severamente el cliente **{customer}**.\n\n### Métricas del Cliente\n- **Nivel de Riesgo Evaluado:** {riskLevel}\n- **Alertas Totales:** {alerts}\n- **Contracargos Históricos:** {chargebacks}\n\n### Recomendación Operativa\nUn perfil con riesgo '{riskLevel}' y esta cantidad de contracargos requiere intervención inmediata. Congelar subida de límites e iniciar proceso de debida diligencia ampliada.",
                chart = new
                {
                    type = "bar",
                    title = "Riesgo de Clientes",
                    xAxisKey = "customer_id",
                    yAxisKey = "total_chargebacks"
                }
            };
            return JsonSerializer.Serialize(json, JsonDefaults.Options);
        }

        if (first.ContainsKey("fingerprint") && first.ContainsKey("distinct_customers"))
        {
            var fingerprint = AsString(first, "fingerprint", "N/D");
            var customers = AsInt(first, "distinct_customers");
            var risk = AsString(first, "max_risk_level", "N/D");

            var json = new
            {
                summary = $"### Alerta de Abuso Coordinado\n\nDetecté **{rows.Count}** dispositivos compartidos con señal de riesgo. El fingerprint **{fingerprint}** está asociado a **{customers}** clientes y su riesgo máximo es **{risk}**.\n\n### Conclusión\nEste patrón suele indicar abuso coordinado o account sharing.",
                extendedReport = $"# Análisis de Dispositivos y Redes\n\nLa huella digital (fingerprint) cruzada revela un cluster de riesgo.\n\n### Detalles de la Huella\n- **Fingerprint ID:** {fingerprint}\n- **Clientes Únicos Vinculados:** {customers}\n- **Riesgo Máximo en Cluster:** {risk}\n\n### Diagnóstico y Mitigación\nLa superposición de más de múltiples cuentas en un solo dispositivo físico o red de origen ('fingerprint') levanta alertas de robo de cuentas sistemático o granjas de fraude. Validar IP, geolocalización e implementar fricción MFA a los implicados.",
                chart = new
                {
                    type = "none"
                }
            };
            return JsonSerializer.Serialize(json, JsonDefaults.Options);
        }

        if (first.ContainsKey("attempts_count") && first.ContainsKey("customer_id"))
        {
            var customer = AsString(first, "customer_id", "N/D");
            var account = AsString(first, "account_id", "N/D");
            var attempts = AsInt(first, "attempts_count");

            var json = new
            {
                summary = $"### Secuencias Iterativas\n\nIdentifiqué **{rows.Count}** secuencias de intentos fallidos. El cliente **{customer}** (cuenta **{account}**) cuenta con **{attempts}** intentos.\n\n### Impacto\nComportamiento compatible con prueba escalonada de credenciales.",
                extendedReport = $"# Detección de Fricción Baja o Carding\n\nSe han observado patrones continuos de falla y éxito que simulan pruebas de autorización.\n\n### Anomalía Primaria\n- **Cliente:** {customer}\n- **Cuenta Afectada:** {account}\n- **Secuencia de Intentos:** {attempts}\n\n### Mitigación\nBloquear preventivamente el origen de estas pruebas temporalmente e instalar lógicas de rate-limiting (velocity checks) más estrictas para rechazar iteraciones.",
                chart = new
                {
                    type = "none"
                }
            };
            return JsonSerializer.Serialize(json, JsonDefaults.Options);
        }

        var preview = first
            .Where(kv => kv.Value is not null)
            .Take(3)
            .Select(kv => $"{kv.Key}: {kv.Value}")
            .ToArray();

        var previewText = preview.Length == 0 ? "sin métricas clave" : string.Join(", ", preview);

        var fallbackJson = new
        {
            summary = $"### Informe Analítico\n\nProcesé tu consulta y devolví **{rows.Count}** registros. El primer hallazgo muestra: `{previewText}`.\n\n### Nota\nNo se detectó un patrón predefinido de hiper-riesgo, pero los datos han sido extraídos exitosamente.",
            extendedReport = $"# Resumen Extendido de Datos\n\nLa base de datos retornó **{rows.Count}** entidades que cumplen los filtros indicados.\n\n### Exploración Inicial\nUna muestra rápida de los datos arroja los siguientes valores:\n> {previewText}\n\n### Próximos Pasos Recomendados\nSe sugiere realizar cruces adicionales con bases de listas negras (watchlists) o acotar temporalmente la búsqueda para aislar comportamientos anómalos más focalizados.",
            chart = new { type = "none" }
        };
        return JsonSerializer.Serialize(fallbackJson, JsonDefaults.Options);
    }

    private static async Task<string?> TrySummarizeWithAiAsync(string question, string sql, List<Dictionary<string, object?>> rows)
    {
        var sampleRows = rows.Take(25).ToList();
        var rowsJson = JsonSerializer.Serialize(sampleRows);

        var systemPrompt =
            "Eres un analista senior de fraude. Responde generando un JSON válido. No inventes datos ni menciones la base de datos subyacente.\n" +
            "Debe contener:\n" +
            "1. 'summary': Un resumen profesional visual en formato Markdown (usa ### títulos de sección, **negritas** y viñetas). Debe incluir siempre '### Resumen', '### Hallazgos Clave' y '### Recomendación'.\n" +
            "2. 'extendedReport': Un reporte analítico profundo en Markdown para lectura detallada (al menos 3 párrafos y viñetas). Explica contexto, riesgos y planes de acción extendidos.\n" +
            "3. 'chart': La configuracion visual. IMPORTANTE: type debe ser 'none' A MENOS QUE el usuario explícitamente pida visualizar un gráfico (grafico, chart, gráfica, barras, pastel, grafica) en su pregunta.\n" +
            "Estructura JSON requerida:\n" +
            "{\n" +
            "  \"summary\": \"Resumen ejecutivo en Markdown...\",\n" +
            "  \"extendedReport\": \"Reporte largo en Markdown...\",\n" +
            "  \"chart\": { \"type\": \"none\", \"title\": \"Titulo\", \"xAxisKey\": \"x_col\", \"yAxisKey\": \"y_col\" }\n" +
            "}";

        var userPrompt =
            $"Pregunta del usuario: {question}\n" +
            $"Filas devueltas: {rows.Count}\n" +
            $"Muestra JSON (max 25 filas): {rowsJson}\n" +
            "Genera el JSON estructurado respondiendo a la pregunta de manera profesional.";

        var raw = await ChatClient.CompleteAsync(systemPrompt, userPrompt, jsonResponse: true, maxTokens: 1200, temperature: 0.2);
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        raw = raw.Trim();
        if (raw.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            raw = raw.Substring(7);
        }
        else if (raw.StartsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            raw = raw.Substring(3);
        }

        if (raw.EndsWith("```", StringComparison.OrdinalIgnoreCase))
        {
            raw = raw.Substring(0, raw.Length - 3);
        }

        return raw.Trim();
    }

    private static string AsString(Dictionary<string, object?> row, string key, string fallback)
    {
        if (!row.TryGetValue(key, out var value) || value is null)
        {
            return fallback;
        }

        return Convert.ToString(value, CultureInfo.InvariantCulture) ?? fallback;
    }

    private static decimal? AsDecimal(Dictionary<string, object?> row, string key)
    {
        if (!row.TryGetValue(key, out var value) || value is null)
        {
            return null;
        }

        return value switch
        {
            decimal d => d,
            double db => Convert.ToDecimal(db, CultureInfo.InvariantCulture),
            float f => Convert.ToDecimal(f, CultureInfo.InvariantCulture),
            int i => i,
            long l => l,
            _ when decimal.TryParse(
                Convert.ToString(value, CultureInfo.InvariantCulture),
                NumberStyles.Any,
                CultureInfo.InvariantCulture,
                out var parsed) => parsed,
            _ => null
        };
    }

    private static int AsInt(Dictionary<string, object?> row, string key)
    {
        if (!row.TryGetValue(key, out var value) || value is null)
        {
            return 0;
        }

        return value switch
        {
            int i => i,
            long l => (int)l,
            decimal d => (int)d,
            double db => (int)db,
            _ when int.TryParse(
                Convert.ToString(value, CultureInfo.InvariantCulture),
                NumberStyles.Any,
                CultureInfo.InvariantCulture,
                out var parsed) => parsed,
            _ => 0
        };
    }

    private static string FormatDecimal(decimal? value)
    {
        if (!value.HasValue)
        {
            return "N/D";
        }

        return value.Value.ToString("0.####", CultureInfo.InvariantCulture);
    }
}

internal sealed class IntentLlmOutput
{
    [JsonPropertyName("intentType")]
    public string? IntentType { get; set; }

    [JsonPropertyName("metric")]
    public string? Metric { get; set; }

    [JsonPropertyName("dimensions")]
    public List<string>? Dimensions { get; set; }

    [JsonPropertyName("timeWindowCurrent")]
    public string? TimeWindowCurrent { get; set; }

    [JsonPropertyName("timeWindowBaseline")]
    public string? TimeWindowBaseline { get; set; }

    [JsonPropertyName("grain")]
    public string? Grain { get; set; }

    [JsonPropertyName("sensitivity")]
    public string? Sensitivity { get; set; }

    [JsonPropertyName("confidence")]
    public double? Confidence { get; set; }

    [JsonPropertyName("clarificationNeeded")]
    public bool? ClarificationNeeded { get; set; }

    [JsonPropertyName("top")]
    public int? Top { get; set; }
}

internal static class JsonDefaults
{
    internal static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };
}

internal sealed class AzureOpenAiChatClient
{
    private const string TokenScope = "https://cognitiveservices.azure.com/.default";
    private const string ApiVersion = "2024-10-21";

    private static readonly HttpClient HttpClient = new();
    private static readonly TokenCredential Credential = new DefaultAzureCredential();
    private static readonly SemaphoreSlim TokenSemaphore = new(1, 1);
    private static AccessToken _cachedToken;

    public async Task<string?> CompleteAsync(
        string systemPrompt,
        string userPrompt,
        bool jsonResponse,
        int maxTokens,
        double temperature)
    {
        var endpoint = GetSetting("AzureOpenAI__Endpoint");
        var deployment = GetSetting("AzureOpenAI__Deployment");

        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(deployment))
        {
            return null;
        }

        var requestUri = BuildChatCompletionsUri(endpoint, deployment);
        var payload = BuildPayload(systemPrompt, userPrompt, jsonResponse, maxTokens, temperature);
        var json = JsonSerializer.Serialize(payload, JsonDefaults.Options);

        using var request = new HttpRequestMessage(HttpMethod.Post, requestUri)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        var apiKey = GetSetting("AzureOpenAI__ApiKey");
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            request.Headers.Add("api-key", apiKey);
        }
        else
        {
            var token = await GetAccessTokenAsync();
            if (string.IsNullOrWhiteSpace(token))
            {
                return null;
            }

            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        using var response = await HttpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var responseText = await response.Content.ReadAsStringAsync();
        return TryExtractContent(responseText);
    }

    private static Uri BuildChatCompletionsUri(string endpoint, string deployment)
    {
        var trimmedEndpoint = endpoint.Trim().TrimEnd('/');
        var encodedDeployment = Uri.EscapeDataString(deployment.Trim());
        var url = $"{trimmedEndpoint}/openai/deployments/{encodedDeployment}/chat/completions?api-version={ApiVersion}";
        return new Uri(url, UriKind.Absolute);
    }

    private static object BuildPayload(string systemPrompt, string userPrompt, bool jsonResponse, int maxTokens, double temperature)
    {
        return new
        {
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            temperature,
            max_tokens = maxTokens,
            response_format = jsonResponse ? new { type = "json_object" } : null
        };
    }

    private static async Task<string?> GetAccessTokenAsync()
    {
        if (_cachedToken.ExpiresOn > DateTimeOffset.UtcNow.AddMinutes(2))
        {
            return _cachedToken.Token;
        }

        await TokenSemaphore.WaitAsync();
        try
        {
            if (_cachedToken.ExpiresOn > DateTimeOffset.UtcNow.AddMinutes(2))
            {
                return _cachedToken.Token;
            }

            _cachedToken = await Credential.GetTokenAsync(new TokenRequestContext([TokenScope]), CancellationToken.None);
            return _cachedToken.Token;
        }
        catch
        {
            return null;
        }
        finally
        {
            TokenSemaphore.Release();
        }
    }

    private static string? TryExtractContent(string responseText)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseText);

            if (!doc.RootElement.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0)
            {
                return null;
            }

            var message = choices[0].GetProperty("message");
            if (!message.TryGetProperty("content", out var contentElement))
            {
                return null;
            }

            if (contentElement.ValueKind == JsonValueKind.String)
            {
                return contentElement.GetString();
            }

            if (contentElement.ValueKind == JsonValueKind.Array)
            {
                var parts = contentElement
                    .EnumerateArray()
                    .Where(e => e.TryGetProperty("type", out var type) && type.GetString() == "text")
                    .Select(e => e.TryGetProperty("text", out var text) ? text.GetString() : null)
                    .Where(s => !string.IsNullOrWhiteSpace(s));

                return string.Join("\n", parts!);
            }

            return null;
        }
        catch
        {
            return null;
        }
    }

    private static string? GetSetting(string key)
    {
        var value = Environment.GetEnvironmentVariable(key);
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
