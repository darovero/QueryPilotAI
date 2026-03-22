using Microsoft.Azure.Functions.Worker.Http;
using System.Net;

namespace Functions.Api.Extensions;

public static class HttpContextExtensions
{
    /// <summary>
    /// Extracts the authenticated user ID from the function context.
    /// Returns null if not authenticated.
    /// </summary>
    public static string? GetAuthenticatedUserId(this HttpRequestData req)
    {
        return req.FunctionContext.Items.TryGetValue("UserId", out var uid)
            ? uid?.ToString()
            : null;
    }

    /// <summary>
    /// Gets the authenticated user ID or returns an Unauthorized response.
    /// </summary>
    public static bool TryGetAuthenticatedUserId(this HttpRequestData req, out string userId, out HttpResponseData? unauthorizedResponse)
    {
        var id = req.GetAuthenticatedUserId();
        if (string.IsNullOrEmpty(id))
        {
            userId = string.Empty;
            unauthorizedResponse = req.CreateResponse(HttpStatusCode.Unauthorized);
            return false;
        }

        userId = id;
        unauthorizedResponse = null;
        return true;
    }
}
