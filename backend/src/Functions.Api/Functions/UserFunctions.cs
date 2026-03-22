using Functions.Api.Extensions;
using Infrastructure.Sql;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;

namespace Functions.Api.Functions;

public class UserFunctions(
    IAppDatabaseService appDb,
    ILogger<UserFunctions> logger)
{
    [Function("DeleteAccount")]
    public async Task<HttpResponseData> DeleteAccount(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "users/me")] HttpRequestData req)
    {
        try
        {
            if (!req.TryGetAuthenticatedUserId(out var userId, out var unauth))
                return unauth!;

            await appDb.DeleteUserAccountAsync(userId);
            return req.CreateResponse(HttpStatusCode.OK);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete account.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }
}
