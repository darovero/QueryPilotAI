using Core.Application.Contracts;
using Microsoft.Azure.Functions.Worker;

namespace Functions.Api.Functions;

public class AnalyzePromptSafetyActivity(Infrastructure.Security.IPromptSafetyService safetyService)
{
    [Function(nameof(AnalyzePromptSafetyActivity))]
    public Task<PromptSafetyResult> Run([ActivityTrigger] QueryRequest request) =>
        safetyService.AnalyzeAsync(request.Question, request.Role);
}

public class DecomposeIntentActivity(Infrastructure.AzureOpenAI.IIntentService intentService)
{
    [Function(nameof(DecomposeIntentActivity))]
    public Task<AnalyticalIntent> Run([ActivityTrigger] QueryRequest request) =>
        intentService.ParseIntentAsync(request);
}

public class GenerateSqlActivity(Infrastructure.AzureOpenAI.ISqlGenerationService sqlService)
{
    [Function(nameof(GenerateSqlActivity))]
    public Task<string> Run([ActivityTrigger] AnalyticalIntent intent) =>
        sqlService.GenerateSqlAsync(intent);
}

public class ValidateSqlPolicyActivity(Core.Domain.Policies.ISqlPolicyEngine sqlPolicyEngine)
{
    [Function(nameof(ValidateSqlPolicyActivity))]
    public Task<SqlValidationResult> Run([ActivityTrigger] string sql) =>
        Task.FromResult(sqlPolicyEngine.Validate(sql));
}

public class ExecuteSqlActivity(Infrastructure.Sql.ISqlExecutionService sqlExecutionService)
{
    [Function(nameof(ExecuteSqlActivity))]
    public Task<List<Dictionary<string, object?>>> Run([ActivityTrigger] string sql) =>
        sqlExecutionService.ExecuteQueryAsync(sql);
}

public class SummarizeInsightActivity(Infrastructure.AzureOpenAI.ISummaryService summaryService)
{
    [Function(nameof(SummarizeInsightActivity))]
    public Task<string> Run([ActivityTrigger] SummaryInput input) =>
        summaryService.SummarizeAsync(input.Question, input.Sql, input.Rows);
}
