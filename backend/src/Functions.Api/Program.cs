using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Infrastructure.AzureOpenAI.Configuration;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults(builder =>
    {
        builder.UseMiddleware<Functions.Api.Middleware.JwtValidationMiddleware>();
    })
    .ConfigureServices(services =>
    {
        services
            .AddApplicationInsightsTelemetryWorkerService()
            .ConfigureFunctionsApplicationInsights();

        services.AddLogging();
        services.AddHttpClient();

        // --- Core ---
        services.AddSingleton<Core.Application.Services.IClock, Core.Application.Services.SystemClock>();
        services.AddSingleton<Core.Domain.Policies.ISqlPolicyEngine, Infrastructure.Security.SqlPolicyEngine>();

        // --- Database Services ---
        services.AddSingleton<Infrastructure.Sql.ISqlExecutionService, Infrastructure.Sql.SqlExecutionService>();
        services.AddSingleton<Infrastructure.Sql.IAppDatabaseService, Infrastructure.Sql.AppDatabaseService>();
        services.AddSingleton<Infrastructure.Sql.ISchemaExtractorService, Infrastructure.Sql.SchemaExtractorService>();

        // --- Security ---
        services.AddSingleton<Infrastructure.Security.IPromptSafetyService, Infrastructure.Security.PromptSafetyService>();

        // --- Foundry Agent Client ---
        var projectEndpoint = Environment.GetEnvironmentVariable("FoundryAgent__ProjectEndpoint")
            ?? throw new InvalidOperationException("FoundryAgent__ProjectEndpoint is required.");
        var sqlPlannerAgentId = Environment.GetEnvironmentVariable("FoundryAgent__SqlPlannerAgentId")
            ?? throw new InvalidOperationException("FoundryAgent__SqlPlannerAgentId is required.");
        var resultInterpreterAgentId = Environment.GetEnvironmentVariable("FoundryAgent__ResultInterpreterAgentId")
            ?? throw new InvalidOperationException("FoundryAgent__ResultInterpreterAgentId is required.");
        var conciergeAgentId = Environment.GetEnvironmentVariable("FoundryAgent__ConciergeAgentId")
            ?? throw new InvalidOperationException("FoundryAgent__ConciergeAgentId is required.");
        var foundryApiKey = Environment.GetEnvironmentVariable("AzureOpenAI__ApiKey"); // optional: use key auth for local dev
        var foundryTenantId = Environment.GetEnvironmentVariable("FoundryAgent__TenantId");

        services.AddSingleton<Infrastructure.AzureOpenAI.IFoundryAgentClient>(
            _ => new Infrastructure.AzureOpenAI.FoundryAgentClient(
                projectEndpoint, sqlPlannerAgentId, resultInterpreterAgentId, conciergeAgentId, foundryApiKey, foundryTenantId));

        // --- Semantic Kernel Integration ---
        // Variables de entorno cargadas por el host de Azure Functions
        services.AddSemanticKernelServices();

        // Register advanced patterns example (optional; for demonstration)
        services.AddTransient<Infrastructure.AzureOpenAI.Examples.AdvancedSemanticKernelPatterns>();
    })
    .Build();

host.Run();
