using Core.Application.Contracts;
using System.Globalization;
using System.Text.RegularExpressions;

namespace Infrastructure.AzureOpenAI;

public interface IIntentService
{
    Task<AnalyticalIntent> ParseIntentAsync(QueryRequest request);
}

public interface ISqlGenerationService
{
    Task<string> GenerateSqlAsync(AnalyticalIntent intent);
}

public interface ISummaryService
{
    Task<string> SummarizeAsync(string question, string sql, List<Dictionary<string, object?>> rows);
}

public sealed class IntentService : IIntentService
{
    public Task<AnalyticalIntent> ParseIntentAsync(QueryRequest request)
    {
        var question = request.Question.Trim();
        var questionLower = question.ToLowerInvariant();

        var intentType = InferIntentType(questionLower);
        var metric = InferMetric(questionLower);
        var dimensions = InferDimensions(questionLower);
        var window = InferWindow(questionLower);
        var sensitivity = InferSensitivity(request.Role, questionLower);

        var filters = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["question"] = question
        };

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
