using Core.Application.Contracts;

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
        var intent = new AnalyticalIntent(
            "fraud",
            "anomaly_detection",
            "chargeback_rate",
            ["merchant"],
            new Dictionary<string, string>(),
            new TimeWindow("last_7_days", "last_30_days"),
            "daily",
            "low",
            0.93,
            false);

        return Task.FromResult(intent);
    }
}

public sealed class SqlGenerationService : ISqlGenerationService
{
    public Task<string> GenerateSqlAsync(AnalyticalIntent intent)
    {
        const string sql = @"
SELECT TOP 50
    merchant_id,
    merchant_name,
    chargeback_rate,
    baseline_rate,
    delta_factor
FROM dbo.vw_merchant_chargeback_trends
WHERE observation_window = 'last_7_days'
ORDER BY delta_factor DESC";
        return Task.FromResult(sql.Trim());
    }
}

public sealed class SummaryService : ISummaryService
{
    public Task<string> SummarizeAsync(string question, string sql, List<Dictionary<string, object?>> rows)
    {
        var count = rows.Count;
        var summary = count == 0
            ? "No se encontraron anomalías relevantes para la consulta solicitada."
            : $"Se identificaron {count} resultados relevantes. El principal hallazgo muestra un comercio con incremento material en la tasa de chargeback frente a su línea base.";
        return Task.FromResult(summary);
    }
}
