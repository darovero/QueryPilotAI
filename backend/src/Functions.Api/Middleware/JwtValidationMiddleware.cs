using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;
using System.IdentityModel.Tokens.Jwt;

namespace Functions.Api.Middleware;

public class JwtValidationMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<JwtValidationMiddleware> _logger;

    public JwtValidationMiddleware(ILogger<JwtValidationMiddleware> logger)
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

        if (req.Headers.TryGetValues("Authorization", out var authHeaders))
        {
            var tokenStr = authHeaders.FirstOrDefault()?.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase);
            if (!string.IsNullOrEmpty(tokenStr))
            {
                try
                {
                    var handler = new JwtSecurityTokenHandler();
                    if (handler.CanReadToken(tokenStr))
                    {
                        var token = handler.ReadJwtToken(tokenStr);
                        
                        // Try multiple claim types used by Microsoft Entra ID
                        var userId = token.Claims.FirstOrDefault(c => 
                            c.Type == "oid" || 
                            c.Type == "sub" ||
                            c.Type == "http://schemas.microsoft.com/identity/claims/objectidentifier" ||
                            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
                        
                        if (!string.IsNullOrEmpty(userId))
                        {
                            context.Items["UserId"] = userId;
                            _logger.LogInformation($"JWT UserId extracted: {userId}");
                        }
                        else
                        {
                            _logger.LogWarning($"JWT token present but no UserId claim found. Available claims: {string.Join(", ", token.Claims.Select(c => c.Type))}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning($"Fallo al parsear el Token JWT: {ex.Message}");
                }
            }
        }

        await next(context);
    }
}
