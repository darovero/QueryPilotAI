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
                        
                        // En Entra ID External típicamente se usa 'oid' o 'sub' para identificar al usuario único
                        var userId = token.Claims.FirstOrDefault(c => c.Type == "oid" || c.Type == "sub")?.Value;
                        
                        if (!string.IsNullOrEmpty(userId))
                        {
                            context.Items["UserId"] = userId;
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
