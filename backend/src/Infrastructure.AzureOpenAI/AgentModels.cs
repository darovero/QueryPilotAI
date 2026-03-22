using System.Text.Json.Serialization;

namespace Infrastructure.AzureOpenAI;

// --- SQL Planner Response ---

public sealed class SqlPlannerResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "unsupported";

    [JsonPropertyName("user_question")]
    public string? UserQuestion { get; set; }

    [JsonPropertyName("intent")]
    public System.Text.Json.JsonElement? Intent { get; set; }

    [JsonPropertyName("understanding")]
    public System.Text.Json.JsonElement? Understanding { get; set; }

    [JsonPropertyName("data_mapping")]
    public System.Text.Json.JsonElement? DataMapping { get; set; }

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

// --- Result Interpretation ---

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

// --- Concierge Classification ---

internal sealed class ConciergeClassification
{
    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("reply")]
    public string? Reply { get; set; }

    [JsonPropertyName("confidence")]
    public double Confidence { get; set; } = 1.0;
}
