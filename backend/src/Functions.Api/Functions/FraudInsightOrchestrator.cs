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

        var requestId = Guid.Parse(context.InstanceId.Length >= 32
            ? context.InstanceId[..32].Replace("-", "")
            : context.InstanceId.PadRight(32, '0'));

        // --- Step 0: Foundry Agent (Conversational Concierge) ---
        context.SetCustomStatus(new PipelineStep("concierge_routing", "El Agente Conversacional está analizando el contexto", "Active", context.CurrentUtcDateTime));

        var classification = await context.CallActivityAsync<ConversationalClassification?>(nameof(ClassifyConversationActivity), request);

        if (classification is not null && !string.Equals(classification.Category, "analytical", StringComparison.OrdinalIgnoreCase))
        {
            context.SetCustomStatus(new PipelineStep("conversational", "El Agente respondió directamente", "Completed", context.CurrentUtcDateTime));

            return new InsightResponse(
                context.InstanceId, "Conversational",
                classification.FriendlyReply ?? "Hola, ¿en qué puedo ayudarte?",
                Array.Empty<string>(), string.Empty, Array.Empty<string>(),
                new List<Dictionary<string, object?>>(),
                new AuditMetadata("None", null));
        }

        context.SetCustomStatus(new PipelineStep("concierge_routing", "El Agente requiere análisis de datos, invocando Pipeline Especialista", "Completed", context.CurrentUtcDateTime));

        // --- Step 1: Prompt Safety ---
        context.SetCustomStatus(new PipelineStep("safety_check", "Verificando seguridad del prompt", "Active", context.CurrentUtcDateTime));

        var safety = await context.CallActivityAsync<PromptSafetyResult>(nameof(AnalyzePromptSafetyActivity), request);

        if (!safety.IsSafe)
        {
            context.SetCustomStatus(new PipelineStep("safety_check", "Prompt bloqueado por seguridad", "Failed", context.CurrentUtcDateTime));

            await context.CallActivityAsync(nameof(SaveAuditTrailActivity), new AuditTrailRecord(
                requestId, request.UserId, request.Role, request.Question,
                null, null, null, "Blocked", context.CurrentUtcDateTime, context.CurrentUtcDateTime));

            return new InsightResponse(
                context.InstanceId, "Blocked",
                "La solicitud fue bloqueada por controles de seguridad.",
                new[] { safety.Reason }, string.Empty, Array.Empty<string>(),
                new List<Dictionary<string, object?>>(),
                new AuditMetadata("Critical", null));
        }

        context.SetCustomStatus(new PipelineStep("safety_check", "Prompt seguro", "Completed", context.CurrentUtcDateTime));

        // --- Step 2: Conversation Context ---
        context.SetCustomStatus(new PipelineStep("conversation_context", "Recuperando contexto de conversación", "Active", context.CurrentUtcDateTime));

        var conversationContext = await context.CallActivityAsync<List<ConversationTurn>>(
            nameof(GetConversationContextActivity),
            new ConversationContextRequest(request.UserId, request.SessionId, 6));

        context.SetCustomStatus(new PipelineStep("conversation_context", "Contexto recuperado", "Completed", context.CurrentUtcDateTime));

        // --- Step 3: Intent Decomposition ---
        context.SetCustomStatus(new PipelineStep("intent_parsing", "Descomponiendo intención analítica", "Active", context.CurrentUtcDateTime));

        var intent = await context.CallActivityAsync<AnalyticalIntent>(
            nameof(DecomposeIntentActivity),
            new IntentParsingInput(request, conversationContext));

        context.SetCustomStatus(new PipelineStep("intent_parsing", "Intención identificada", "Completed", context.CurrentUtcDateTime));

        // --- Step 4: SQL Generation ---
        context.SetCustomStatus(new PipelineStep("sql_generation", "Generando SQL restringido", "Active", context.CurrentUtcDateTime));

        var sqlDraft = await context.CallActivityAsync<string>(nameof(GenerateSqlActivity), intent);

        context.SetCustomStatus(new PipelineStep("sql_generation", "SQL generado", "Completed", context.CurrentUtcDateTime));

        // --- Step 5: SQL Policy Validation ---
        context.SetCustomStatus(new PipelineStep("sql_validation", "Aplicando políticas y scoring de riesgo", "Active", context.CurrentUtcDateTime));

        var validation = await context.CallActivityAsync<SqlValidationResult>(nameof(ValidateSqlPolicyActivity), sqlDraft);

        if (!validation.IsValid)
        {
            context.SetCustomStatus(new PipelineStep("sql_validation", "SQL rechazado por política", "Failed", context.CurrentUtcDateTime));

            await context.CallActivityAsync(nameof(SaveAuditTrailActivity), new AuditTrailRecord(
                requestId, request.UserId, request.Role, request.Question,
                intent.IntentType, sqlDraft, string.Join("; ", validation.Reasons),
                "PolicyBlocked", context.CurrentUtcDateTime, context.CurrentUtcDateTime));

            return new InsightResponse(
                context.InstanceId, "Blocked",
                "La consulta generada no superó la validación de política.",
                validation.Reasons, sqlDraft, Array.Empty<string>(),
                new List<Dictionary<string, object?>>(),
                new AuditMetadata(validation.RiskLevel, null));
        }

        context.SetCustomStatus(new PipelineStep("sql_validation", "SQL validado", "Completed", context.CurrentUtcDateTime));

        // --- Step 6: Approval Flow (if required) ---
        if (validation.RequiresApproval)
        {
            context.SetCustomStatus(new PipelineStep("approval", "Esperando aprobación humana", "Active", context.CurrentUtcDateTime));

            await context.CallActivityAsync(nameof(SaveAuditTrailActivity), new AuditTrailRecord(
                requestId, request.UserId, request.Role, request.Question,
                intent.IntentType, validation.NormalizedSql, string.Join("; ", validation.Reasons),
                "PendingApproval", context.CurrentUtcDateTime, null));

            ApprovalDecision decision;
            try
            {
                decision = await context.WaitForExternalEvent<ApprovalDecision>("ApprovalEvent", TimeSpan.FromMinutes(30));
            }
            catch (TaskCanceledException)
            {
                context.SetCustomStatus(new PipelineStep("approval", "Tiempo de aprobación agotado", "Failed", context.CurrentUtcDateTime));

                return new InsightResponse(
                    context.InstanceId, "TimedOut",
                    "La solicitud de aprobación expiró. El SQL no fue ejecutado.",
                    validation.Reasons, validation.NormalizedSql, Array.Empty<string>(),
                    new List<Dictionary<string, object?>>(),
                    new AuditMetadata(validation.RiskLevel, null));
            }

            if (!string.Equals(decision.Decision, "Approved", StringComparison.OrdinalIgnoreCase))
            {
                context.SetCustomStatus(new PipelineStep("approval", "Rechazado por " + decision.ApproverUserId, "Failed", context.CurrentUtcDateTime));

                await context.CallActivityAsync(nameof(SaveAuditTrailActivity), new AuditTrailRecord(
                    requestId, request.UserId, request.Role, request.Question,
                    intent.IntentType, validation.NormalizedSql, $"Rejected: {decision.Comments}",
                    "Rejected", context.CurrentUtcDateTime, context.CurrentUtcDateTime));

                return new InsightResponse(
                    context.InstanceId, "Rejected",
                    $"La consulta fue rechazada. Motivo: {decision.Comments ?? "Sin comentario"}",
                    validation.Reasons, validation.NormalizedSql, Array.Empty<string>(),
                    new List<Dictionary<string, object?>>(),
                    new AuditMetadata(validation.RiskLevel, decision.ApproverUserId));
            }

            context.SetCustomStatus(new PipelineStep("approval", "Aprobado por " + decision.ApproverUserId, "Completed", context.CurrentUtcDateTime));
        }

        // --- Step 7: SQL Execution ---
        context.SetCustomStatus(new PipelineStep("sql_execution", "Ejecutando SQL en Azure SQL", "Active", context.CurrentUtcDateTime));

        var rows = await context.CallActivityAsync<List<Dictionary<string, object?>>>(nameof(ExecuteSqlActivity), new SqlExecutionInput(validation.NormalizedSql, request.Connection));

        context.SetCustomStatus(new PipelineStep("sql_execution", "Consulta ejecutada", "Completed", context.CurrentUtcDateTime));

        // --- Step 8: Executive Summary ---
        context.SetCustomStatus(new PipelineStep("summarize", "Generando resumen ejecutivo", "Active", context.CurrentUtcDateTime));

        var summary = await context.CallActivityAsync<string>(nameof(SummarizeInsightActivity), new SummaryInput(request.Question, validation.NormalizedSql, rows));

        context.SetCustomStatus(new PipelineStep("summarize", "Insight generado", "Completed", context.CurrentUtcDateTime));

        // Save conversation turn
        await context.CallActivityAsync(
            nameof(SaveConversationTurnActivity),
            new ConversationTurnUpsert(
                request.UserId, request.SessionId, request.Question, summary,
                validation.NormalizedSql, intent.IntentType, intent.Metric,
                DateTimeOffset.UtcNow));

        // Save audit trail
        await context.CallActivityAsync(nameof(SaveAuditTrailActivity), new AuditTrailRecord(
            requestId, request.UserId, request.Role, request.Question,
            intent.IntentType, validation.NormalizedSql, null,
            "Completed", context.CurrentUtcDateTime, context.CurrentUtcDateTime));

        return new InsightResponse(
            context.InstanceId, "Completed", summary,
            Array.Empty<string>(), validation.NormalizedSql, Array.Empty<string>(),
            rows, new AuditMetadata(validation.RiskLevel, null));
    }
}
