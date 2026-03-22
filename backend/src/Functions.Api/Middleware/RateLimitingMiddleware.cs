using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Net;

namespace Functions.Api.Middleware;

/// <summary>
/// Simple in-memory rate limiter middleware for Azure Functions.
/// Limits requests per user (by UserId from JWT) with a sliding window approach.
/// Protects Azure OpenAI and DB resources from abuse.
/// </summary>
public class RateLimitingMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<RateLimitingMiddleware> _logger;

    // userId -> list of request timestamps
    private static readonly ConcurrentDictionary<string, List<DateTimeOffset>> _requestLog = new();

    // Configuration: max requests per window
    private static readonly int MaxRequests = int.TryParse(
        Environment.GetEnvironmentVariable("RATE_LIMIT_MAX_REQUESTS"), out var max) ? max : 30;

    private static readonly TimeSpan Window = TimeSpan.FromMinutes(
        int.TryParse(Environment.GetEnvironmentVariable("RATE_LIMIT_WINDOW_MINUTES"), out var min) ? min : 1);

    // Routes that should be rate-limited (expensive operations)
    private static readonly string[] RateLimitedRoutes =
    [
        "/api/query",
        "/api/connections/test"
    ];

    public RateLimitingMiddleware(ILogger<RateLimitingMiddleware> logger)
    {
        _logger = logger;
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var req = await context.GetHttpRequestDataAsync();

        if (req == null)
        {
            await next(context);
            return;
        }

        // Only rate-limit specific expensive routes
        var path = req.Url.AbsolutePath.ToLowerInvariant();
        if (!RateLimitedRoutes.Any(r => path.Contains(r)))
        {
            await next(context);
            return;
        }

        // Get user ID (set by JwtValidationMiddleware)
        var userId = context.Items.TryGetValue("UserId", out var uid) ? uid?.ToString() : null;

        // If no user ID, let the auth check in the endpoint handle it
        if (string.IsNullOrEmpty(userId))
        {
            await next(context);
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var cutoff = now - Window;

        var timestamps = _requestLog.GetOrAdd(userId, _ => new List<DateTimeOffset>());

        lock (timestamps)
        {
            // Remove expired entries
            timestamps.RemoveAll(t => t < cutoff);

            if (timestamps.Count >= MaxRequests)
            {
                _logger.LogWarning("Rate limit exceeded for user {UserId}. {Count} requests in {Window}",
                    userId, timestamps.Count, Window);

                // Return 429 Too Many Requests
                var response = req.CreateResponse(HttpStatusCode.TooManyRequests);
                response.Headers.Add("Retry-After", ((int)Window.TotalSeconds).ToString());
                response.WriteStringAsync(
                    $"Has excedido el límite de {MaxRequests} solicitudes por {Window.TotalMinutes} minuto(s). Intenta de nuevo en un momento.").Wait();

                context.GetInvocationResult().Value = response;
                return;
            }

            timestamps.Add(now);
        }

        await next(context);
    }
}
