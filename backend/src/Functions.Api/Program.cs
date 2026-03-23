using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults(builder =>
    {
        builder.UseMiddleware<Functions.Api.Middleware.JwtValidationMiddleware>();
        builder.UseMiddleware<Functions.Api.Middleware.RateLimitingMiddleware>();
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

        // --- Security ---
        services.AddSingleton<Infrastructure.Security.IEncryptionService, Infrastructure.Security.AesEncryptionService>();
        services.AddSingleton<Infrastructure.Security.IPromptSafetyService, Infrastructure.Security.PromptSafetyService>();

        // --- Database Services (Scoped — each request gets its own instance) ---
        services.AddScoped<Infrastructure.Sql.ISqlExecutionService, Infrastructure.Sql.SqlExecutionService>();
        services.AddScoped<Infrastructure.Sql.IAppDatabaseService, Infrastructure.Sql.AppDatabaseService>();
        services.AddScoped<Infrastructure.Sql.ISchemaExtractorService, Infrastructure.Sql.SchemaExtractorService>();

        // --- Foundry Agent Client ---
        var projectEndpoint = Environment.GetEnvironmentVariable("FoundryAgent__ProjectEndpoint")
            ?? throw new InvalidOperationException("FoundryAgent__ProjectEndpoint is required.");
        var sqlPlannerAgentId = Environment.GetEnvironmentVariable("FoundryAgent__SqlPlannerAgentId")
            ?? throw new InvalidOperationException("FoundryAgent__SqlPlannerAgentId is required.");
        var resultInterpreterAgentId = Environment.GetEnvironmentVariable("FoundryAgent__ResultInterpreterAgentId")
            ?? throw new InvalidOperationException("FoundryAgent__ResultInterpreterAgentId is required.");
        var conciergeAgentId = Environment.GetEnvironmentVariable("FoundryAgent__ConciergeAgentId")
            ?? throw new InvalidOperationException("FoundryAgent__ConciergeAgentId is required.");

        services.AddSingleton<Infrastructure.AzureOpenAI.IFoundryAgentClient>(
            _ => new Infrastructure.AzureOpenAI.FoundryAgentClient(
                projectEndpoint, sqlPlannerAgentId, resultInterpreterAgentId, conciergeAgentId));
    })
    .Build();

host.Run();
