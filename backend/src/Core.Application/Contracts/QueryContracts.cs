namespace Core.Application.Contracts;

public sealed record QueryRequest(string Question, string UserId, string Role, string? CorrelationId = null);

public sealed record PromptSafetyResult(bool IsSafe, string Reason);

public sealed record AnalyticalIntent(
    string Domain,
    string IntentType,
    string Metric,
    string[] Dimensions,
    Dictionary<string, string> Filters,
    TimeWindow TimeWindow,
    string Grain,
    string Sensitivity,
    double Confidence,
    bool ClarificationNeeded);

public sealed record TimeWindow(string Current, string Baseline);

public sealed record SummaryInput(string Question, string Sql, List<Dictionary<string, object?>> Rows);

public sealed record AuditMetadata(string RiskLevel, string? ApprovedBy);

public sealed record InsightResponse(
    string RequestId,
    string Status,
    string ExecutiveSummary,
    string[] KeyFindings,
    string Sql,
    string[] Warnings,
    List<Dictionary<string, object?>> ResultPreview,
    AuditMetadata Audit);
