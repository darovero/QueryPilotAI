using Functions.Api.Extensions;
using Infrastructure.Sql;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace Functions.Api.Functions;

public class SessionFunctions(
    IAppDatabaseService appDb,
    ILogger<SessionFunctions> logger)
{
    private static readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public record CreateSessionRequest(Guid Id, string UserId, Guid? ConnectionId, string? Title);

    [Function("CreateSession")]
    public async Task<HttpResponseData> CreateSession(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "sessions")] HttpRequestData req)
    {
        try
        {
            using var bodyReader = new StreamReader(req.Body);
            var body = await bodyReader.ReadToEndAsync();
            var payload = JsonSerializer.Deserialize<CreateSessionRequest>(body, _jsonOptions);

            if (!req.TryGetAuthenticatedUserId(out var userId, out var unauth))
                return unauth!;

            if (payload == null)
                return req.CreateResponse(HttpStatusCode.BadRequest);

            var id = await appDb.CreateSessionAsync(payload.Id, userId, payload.ConnectionId, payload.Title);

            var res = req.CreateResponse(HttpStatusCode.OK);
            await res.WriteAsJsonAsync(new { id });
            return res;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create session.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }

    [Function("GetSessions")]
    public async Task<HttpResponseData> GetSessions(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "sessions/{userId}")] HttpRequestData req, string userId)
    {
        try
        {
            var list = await appDb.GetSessionsByUserAsync(userId);
            var res = req.CreateResponse(HttpStatusCode.OK);
            res.Headers.Add("Content-Type", "application/json");
            await res.WriteStringAsync(JsonSerializer.Serialize(list, _jsonOptions));
            return res;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get sessions.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }

    [Function("DeleteSession")]
    public async Task<HttpResponseData> DeleteSession(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "sessions/{sessionId}")] HttpRequestData req, string sessionId)
    {
        try
        {
            if (!req.TryGetAuthenticatedUserId(out var userId, out var unauth))
                return unauth!;

            await appDb.DeleteSessionAsync(Guid.Parse(sessionId), userId);

            var res = req.CreateResponse(HttpStatusCode.OK);
            await res.WriteAsJsonAsync(new { success = true });
            return res;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete session.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }
}
