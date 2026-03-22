using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;

namespace Functions.Api.Middleware;

public class JwtValidationMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<JwtValidationMiddleware> _logger;
    private readonly ConfigurationManager<OpenIdConnectConfiguration> _configManager;
    private readonly string _validAudience;

    public JwtValidationMiddleware(ILogger<JwtValidationMiddleware> logger)
    {
        _logger = logger;

        // Azure AD "common" endpoint for multi-tenant validation
        var tenantId = Environment.GetEnvironmentVariable("AZURE_AD_TENANT_ID") ?? "common";
        var metadataUrl = $"https://login.microsoftonline.com/{tenantId}/v2.0/.well-known/openid-configuration";

        _configManager = new ConfigurationManager<OpenIdConnectConfiguration>(
            metadataUrl, new OpenIdConnectConfigurationRetriever());

        _validAudience = Environment.GetEnvironmentVariable("AZURE_AD_CLIENT_ID") ?? "";
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
                    var config = await _configManager.GetConfigurationAsync(CancellationToken.None);

                    var validationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKeys = config.SigningKeys,
                        ValidateIssuer = true,
                        ValidIssuers = new[]
                        {
                            $"https://login.microsoftonline.com/{Environment.GetEnvironmentVariable("AZURE_AD_TENANT_ID") ?? "common"}/v2.0",
                            $"https://sts.windows.net/{Environment.GetEnvironmentVariable("AZURE_AD_TENANT_ID") ?? "common"}/"
                        },
                        ValidateAudience = !string.IsNullOrEmpty(_validAudience),
                        ValidAudience = _validAudience,
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.FromMinutes(5)
                    };

                    // If tenant is "common", accept any issuer (multi-tenant)
                    if ((Environment.GetEnvironmentVariable("AZURE_AD_TENANT_ID") ?? "common") == "common")
                    {
                        validationParameters.ValidateIssuer = false;
                    }

                    var handler = new JwtSecurityTokenHandler();
                    var principal = handler.ValidateToken(tokenStr, validationParameters, out var validatedToken);

                    // Extract user ID from validated claims
                    var userId = principal.FindFirst("oid")?.Value
                        ?? principal.FindFirst("http://schemas.microsoft.com/identity/claims/objectidentifier")?.Value
                        ?? principal.FindFirst("sub")?.Value;

                    if (!string.IsNullOrEmpty(userId))
                    {
                        context.Items["UserId"] = userId;
                        _logger.LogInformation("JWT validated. UserId: {UserId}", userId);
                    }
                    else
                    {
                        _logger.LogWarning("JWT validated but no UserId claim found. Claims: {Claims}",
                            string.Join(", ", principal.Claims.Select(c => c.Type)));
                    }
                }
                catch (SecurityTokenValidationException ex)
                {
                    _logger.LogWarning("JWT validation failed: {Error}", ex.Message);
                    // Token is invalid — proceed without setting UserId
                    // Endpoints that require auth will return 401
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("JWT processing error: {Error}", ex.Message);
                }
            }
        }

        await next(context);
    }
}
