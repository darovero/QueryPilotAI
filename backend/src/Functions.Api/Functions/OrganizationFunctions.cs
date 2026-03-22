using Functions.Api.Extensions;
using Infrastructure.Sql;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace Functions.Api.Functions;

public class OrganizationFunctions(
    IAppDatabaseService appDb,
    ILogger<OrganizationFunctions> logger)
{
    private static readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    [Function("GetOrganizations")]
    public async Task<HttpResponseData> GetOrganizations(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "organizations/me")] HttpRequestData req)
    {
        try
        {
            if (!req.TryGetAuthenticatedUserId(out var userId, out var unauth))
                return unauth!;

            var orgs = await appDb.GetOrganizationsByUserIdAsync(userId);
            var res = req.CreateResponse(HttpStatusCode.OK);
            res.Headers.Add("Content-Type", "application/json");
            await res.WriteStringAsync(JsonSerializer.Serialize(orgs, _jsonOptions));
            return res;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get organizations.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }

    [Function("CreateOrganization")]
    public async Task<HttpResponseData> CreateOrganization(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "organizations")] HttpRequestData req)
    {
        try
        {
            if (!req.TryGetAuthenticatedUserId(out var userId, out var unauth))
                return unauth!;

            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var org = JsonSerializer.Deserialize<OrganizationRecord>(body, _jsonOptions);

            if (org == null || string.IsNullOrWhiteSpace(org.Name))
                return req.CreateResponse(HttpStatusCode.BadRequest);

            var count = await appDb.GetOrganizationCountAsync(userId);
            if (count >= 3)
            {
                var badRes = req.CreateResponse(HttpStatusCode.BadRequest);
                await badRes.WriteAsJsonAsync(new { error = "Maximum of 3 organizations allowed per user." });
                return badRes;
            }

            var id = await appDb.CreateOrganizationAsync(org, userId);
            var res = req.CreateResponse(HttpStatusCode.OK);
            await res.WriteAsJsonAsync(new { id });
            return res;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create organization.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }

    [Function("DeleteOrganization")]
    public async Task<HttpResponseData> DeleteOrganization(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "organizations/{id}")] HttpRequestData req, string id)
    {
        try
        {
            if (!req.TryGetAuthenticatedUserId(out var userId, out var unauth))
                return unauth!;
            
            if (!Guid.TryParse(id, out var orgId))
                return req.CreateResponse(HttpStatusCode.BadRequest);

            await appDb.DeleteOrganizationAsync(orgId, userId);
            
            var res = req.CreateResponse(HttpStatusCode.OK);
            await res.WriteAsJsonAsync(new { success = true });
            return res;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete organization.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }
}
