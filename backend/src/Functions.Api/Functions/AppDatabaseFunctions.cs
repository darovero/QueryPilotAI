using Core.Application.Contracts;
using Infrastructure.Sql;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace Functions.Api.Functions;

public class AppDatabaseFunctions(
    IAppDatabaseService appDb,
    ILogger<AppDatabaseFunctions> logger)
{
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    // --- Connections ---

    [Function("SaveConnection")]
    public async Task<HttpResponseData> SaveConnection(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "connections")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var config = JsonSerializer.Deserialize<UserConnectionRecord>(body, _jsonOptions);

            if (config == null || string.IsNullOrWhiteSpace(config.UserId) || string.IsNullOrWhiteSpace(config.ConnectionName))
                return req.CreateResponse(HttpStatusCode.BadRequest);

            var id = await appDb.SaveConnectionAsync(config);
            var res = req.CreateResponse(HttpStatusCode.OK);
            await res.WriteAsJsonAsync(new { id });
            return res;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save connection.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }

    [Function("GetConnections")]
    public async Task<HttpResponseData> GetConnections(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "connections/{userId}")] HttpRequestData req, string userId)
    {
        try
        {
            var list = await appDb.GetConnectionsByUserAsync(userId);
            var res = req.CreateResponse(HttpStatusCode.OK);
            await res.WriteAsJsonAsync(list);
            return res;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get connections.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }

    // --- Sessions ---

    public record CreateSessionRequest(Guid Id, string UserId, Guid? ConnectionId, string? Title);

    [Function("CreateSession")]
    public async Task<HttpResponseData> CreateSession(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "sessions")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var payload = JsonSerializer.Deserialize<CreateSessionRequest>(body, _jsonOptions);

            if (payload == null || string.IsNullOrWhiteSpace(payload.UserId))
                return req.CreateResponse(HttpStatusCode.BadRequest);

            // We use the ID provided by the frontend payload, otherwise AppDatabaseService generates one.
            // Wait, AppDatabaseService.CreateSessionAsync signature:
            // Task<Guid> CreateSessionAsync(string userId, Guid? connectionId, string? title);
            // Let's call a minimal version or use AppDatabaseService.SaveSessionAsync if it exists.
            var id = await appDb.CreateSessionAsync(payload.Id, payload.UserId, payload.ConnectionId, payload.Title);

            // Because the frontend generated its own ID, we must return the backend's generated ID so the frontend can update it.
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
            await res.WriteAsJsonAsync(list);
            return res;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get sessions.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }
}
