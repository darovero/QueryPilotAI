using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;
using System.Net;
using Microsoft.Azure.Functions.Worker.Http;

namespace Functions.Api.Middleware;

public class JwtValidationMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<JwtValidationMiddleware> _logger;
    private readonly IEntraTokenValidator _tokenValidator;

    public JwtValidationMiddleware(ILogger<JwtValidationMiddleware> logger, IEntraTokenValidator tokenValidator)
    {
        _logger = logger;
        _tokenValidator = tokenValidator;
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var req = await context.GetHttpRequestDataAsync();
        
        if (req == null)
        {
            await next(context);
            return;
        }

        if (!req.Headers.TryGetValues("Authorization", out var authHeaders))
        {
            await RejectAsync(context, req, "Authorization header is required.");
            return;
        }

        var tokenStr = authHeaders.FirstOrDefault()?.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(tokenStr))
        {
            await RejectAsync(context, req, "Bearer token is required.");
            return;
        }

        var principal = await _tokenValidator.ValidateAsync(tokenStr, context.CancellationToken);
        if (principal == null)
        {
            await RejectAsync(context, req, "Invalid bearer token.");
            return;
        }

        var userId = principal.Claims.FirstOrDefault(c =>
            c.Type == "oid" ||
            c.Type == "sub" ||
            c.Type == "http://schemas.microsoft.com/identity/claims/objectidentifier" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

        if (string.IsNullOrWhiteSpace(userId))
        {
            await RejectAsync(context, req, "Validated token is missing user identifier claims.");
            return;
        }

        context.Items["UserId"] = userId;
        context.Items["UserPrincipal"] = principal;

        await next(context);
    }

    private static async Task RejectAsync(FunctionContext context, HttpRequestData req, string message)
    {
        var response = req.CreateResponse(HttpStatusCode.Unauthorized);
        await response.WriteAsJsonAsync(new { error = message });
        context.GetInvocationResult().Value = response;
    }
}
