using Core.Application.Contracts;
using Core.Domain.Policies;
using Microsoft.Azure.Functions.Worker;
using Microsoft.DurableTask;

namespace Functions.Api.Functions;

public class FraudInsightOrchestrator
{
    [Function(nameof(FraudInsightOrchestrator))]
    public async Task<InsightResponse> Run([OrchestrationTrigger] TaskOrchestrationContext context)
    {
        var request = context.GetInput<QueryRequest>() 
            ?? throw new InvalidOperationException("QueryRequest is required.");

        var safety = await context.CallActivityAsync<PromptSafetyResult>(nameof(AnalyzePromptSafetyActivity), request);
        if (!safety.IsSafe)
        {
            return new InsightResponse(
                context.InstanceId,
                "Blocked",
                "La solicitud fue bloqueada por controles de seguridad.",
                new[] { safety.Reason },
                string.Empty,
                Array.Empty<string>(),
                new List<Dictionary<string, object?>>(),
                new AuditMetadata("Critical", null));
        }

        var conversationContext = await context.CallActivityAsync<List<ConversationTurn>>(
            nameof(GetConversationContextActivity),
            new ConversationContextRequest(request.UserId, request.SessionId, 6));

        var intent = await context.CallActivityAsync<AnalyticalIntent>(
            nameof(DecomposeIntentActivity),
            new IntentParsingInput(request, conversationContext));

        var sqlDraft = await context.CallActivityAsync<string>(nameof(GenerateSqlActivity), intent);
        var validation = await context.CallActivityAsync<SqlValidationResult>(nameof(ValidateSqlPolicyActivity), sqlDraft);

        if (!validation.IsValid)
        {
            return new InsightResponse(
                context.InstanceId,
                "Blocked",
                "La consulta generada no superó la validación de política.",
                validation.Reasons,
                sqlDraft,
                Array.Empty<string>(),
                new List<Dictionary<string, object?>>(),
                new AuditMetadata(validation.RiskLevel, null));
        }

        if (validation.RequiresApproval)
        {
            // Placeholder: completar con flujo real de aprobación.
            return new InsightResponse(
                context.InstanceId,
                "PendingApproval",
                "La consulta requiere aprobación humana antes de ejecutarse.",
                validation.Reasons,
                validation.NormalizedSql,
                Array.Empty<string>(),
                new List<Dictionary<string, object?>>(),
                new AuditMetadata(validation.RiskLevel, null));
        }

        var rows = await context.CallActivityAsync<List<Dictionary<string, object?>>>(nameof(ExecuteSqlActivity), validation.NormalizedSql);
        var summary = await context.CallActivityAsync<string>(nameof(SummarizeInsightActivity), new SummaryInput(request.Question, validation.NormalizedSql, rows));

        await context.CallActivityAsync(
            nameof(SaveConversationTurnActivity),
            new ConversationTurnUpsert(
                request.UserId,
                request.SessionId,
                request.Question,
                summary,
                validation.NormalizedSql,
                intent.IntentType,
                intent.Metric,
                DateTimeOffset.UtcNow));

        return new InsightResponse(
            context.InstanceId,
            "Completed",
            summary,
            Array.Empty<string>(),
            validation.NormalizedSql,
            Array.Empty<string>(),
            rows,
            new AuditMetadata(validation.RiskLevel, null));
    }
}
