using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        services
            .AddApplicationInsightsTelemetryWorkerService()
            .ConfigureFunctionsApplicationInsights();

        services.AddLogging();
        services.AddHttpClient();

        services.AddSingleton<Core.Application.Services.IClock, Core.Application.Services.SystemClock>();
        services.AddSingleton<Core.Domain.Policies.ISqlPolicyEngine, Infrastructure.Security.SqlPolicyEngine>();
        services.AddSingleton<Infrastructure.Sql.ISqlExecutionService, Infrastructure.Sql.SqlExecutionService>();
        services.AddSingleton<Infrastructure.AzureOpenAI.IConversationMemoryService, Infrastructure.AzureOpenAI.ConversationMemoryService>();
        services.AddSingleton<Infrastructure.AzureOpenAI.IIntentService, Infrastructure.AzureOpenAI.IntentService>();
        services.AddSingleton<Infrastructure.AzureOpenAI.ISqlGenerationService, Infrastructure.AzureOpenAI.SqlGenerationService>();
        services.AddSingleton<Infrastructure.AzureOpenAI.ISummaryService, Infrastructure.AzureOpenAI.SummaryService>();
        services.AddSingleton<Infrastructure.Security.IPromptSafetyService, Infrastructure.Security.PromptSafetyService>();
    })
    .Build();

host.Run();
