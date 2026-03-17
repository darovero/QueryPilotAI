using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = FunctionsApplication.CreateBuilder(args);

builder.Services
    .AddApplicationInsightsTelemetryWorkerService()
    .ConfigureFunctionsApplicationInsights();

builder.Services.AddLogging();
builder.Services.AddHttpClient();

builder.Services.AddSingleton<Core.Application.Services.IClock, Core.Application.Services.SystemClock>();
builder.Services.AddSingleton<Core.Domain.Policies.ISqlPolicyEngine, Infrastructure.Security.SqlPolicyEngine>();
builder.Services.AddSingleton<Infrastructure.Sql.ISqlExecutionService, Infrastructure.Sql.SqlExecutionService>();
builder.Services.AddSingleton<Infrastructure.AzureOpenAI.IIntentService, Infrastructure.AzureOpenAI.IntentService>();
builder.Services.AddSingleton<Infrastructure.AzureOpenAI.ISqlGenerationService, Infrastructure.AzureOpenAI.SqlGenerationService>();
builder.Services.AddSingleton<Infrastructure.AzureOpenAI.ISummaryService, Infrastructure.AzureOpenAI.SummaryService>();
builder.Services.AddSingleton<Infrastructure.Security.IPromptSafetyService, Infrastructure.Security.PromptSafetyService>();

builder.Build().Run();
