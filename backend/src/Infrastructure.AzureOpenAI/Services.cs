using Core.Application.Contracts;
using System.Collections.Concurrent;
using System.Globalization;
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
    public Task<AnalyticalIntent> ParseIntentAsync(QueryRequest request, List<ConversationTurn> conversationContext)
    {
        var question = request.Question.Trim();
        var questionLower = question.ToLowerInvariant();
        var latestTurn = conversationContext.LastOrDefault();
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

        return Task.FromResult(intent);
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
    public Task<string> GenerateSqlAsync(AnalyticalIntent intent)
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

        return Task.FromResult(sql.Trim());
    }
}

public sealed class SummaryService : ISummaryService
{
    public Task<string> SummarizeAsync(string question, string sql, List<Dictionary<string, object?>> rows)
    {
        var count = rows.Count;
        if (count == 0)
        {
            return Task.FromResult("No se encontraron resultados para la pregunta solicitada con las reglas de seguridad actuales.");
        }

        var first = rows[0];
        var keyMetrics = first
            .Where(kv => kv.Value is not null)
            .Take(3)
            .Select(kv => $"{kv.Key}: {kv.Value}")
            .ToArray();

        var keyMetricsText = keyMetrics.Length == 0
            ? "sin métricas clave disponibles"
            : string.Join(", ", keyMetrics);

        var summary = $"Para la pregunta '{question}', se devolvieron {count} filas. Hallazgo principal: {keyMetricsText}.";
        return Task.FromResult(summary);
    }
}
