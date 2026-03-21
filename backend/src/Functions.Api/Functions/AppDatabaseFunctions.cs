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

            var authenticatedUserId = req.FunctionContext.Items["UserId"]?.ToString();
            
            if (config == null || string.IsNullOrWhiteSpace(config.ConnectionName))
                return req.CreateResponse(HttpStatusCode.BadRequest);

            // Force the authenticated user
            if (!string.IsNullOrEmpty(authenticatedUserId))
            {
                config = config with { UserId = authenticatedUserId };
            }
            else if (string.IsNullOrWhiteSpace(config.UserId))
            {
                return req.CreateResponse(HttpStatusCode.Unauthorized);
            }
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
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "connections")] HttpRequestData req)
    {
        try
        {
            var authenticatedUserId = req.FunctionContext.Items["UserId"]?.ToString();
            if (string.IsNullOrEmpty(authenticatedUserId))
            {
                return req.CreateResponse(HttpStatusCode.Unauthorized);
            }

            var list = await appDb.GetConnectionsByUserAsync(authenticatedUserId);
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

    [Function("DeleteConnection")]
    public async Task<HttpResponseData> DeleteConnection(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "connections/{id}")] HttpRequestData req, string id)
    {
        try
        {
            var authenticatedUserId = req.FunctionContext.Items["UserId"]?.ToString();
            if (string.IsNullOrEmpty(authenticatedUserId))
                return req.CreateResponse(HttpStatusCode.Unauthorized);

            if (!Guid.TryParse(id, out var connectionId))
                return req.CreateResponse(HttpStatusCode.BadRequest);

            await appDb.DeleteConnectionAsync(connectionId, authenticatedUserId);
            return req.CreateResponse(HttpStatusCode.OK);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete connection.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }

    [Function("DeleteAccount")]
    public async Task<HttpResponseData> DeleteAccount(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "users/me")] HttpRequestData req)
    {
        try
        {
            var authenticatedUserId = req.FunctionContext.Items["UserId"]?.ToString();
            if (string.IsNullOrEmpty(authenticatedUserId))
                return req.CreateResponse(HttpStatusCode.Unauthorized);

            await appDb.DeleteUserAccountAsync(authenticatedUserId);
            return req.CreateResponse(HttpStatusCode.OK);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete account.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }

    [Function("TestConnection")]
    public async Task<HttpResponseData> TestConnection(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "connections/test")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var config = JsonSerializer.Deserialize<UserConnectionRecord>(body, _jsonOptions);

            var authenticatedUserId = req.FunctionContext.Items["UserId"]?.ToString();
            if (string.IsNullOrEmpty(authenticatedUserId))
                return req.CreateResponse(HttpStatusCode.Unauthorized);

            if (config == null || string.IsNullOrWhiteSpace(config.Host))
                return req.CreateResponse(HttpStatusCode.BadRequest);

            bool success = false;
            string error = "Unsupported database type.";

            if (config.DbType?.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase) == true)
            {
                var builder = new Npgsql.NpgsqlConnectionStringBuilder
                {
                    Host = config.Host,
                    Port = int.TryParse(config.Port, out int p) ? p : 5432,
                    Database = config.DatabaseName,
                    Username = config.Username,
                    Password = config.EncryptedPassword,
                    Timeout = 5
                };
                using var conn = new Npgsql.NpgsqlConnection(builder.ConnectionString);
                await conn.OpenAsync();
                success = true;
            }
            else if (config.DbType?.Equals("SQLServer", StringComparison.OrdinalIgnoreCase) == true
                  || config.DbType?.Equals("Azure SQL", StringComparison.OrdinalIgnoreCase) == true)
            {
                var builder = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder
                {
                    DataSource = string.IsNullOrWhiteSpace(config.Port) ? config.Host : $"{config.Host},{config.Port}",
                    InitialCatalog = config.DatabaseName,
                    UserID = config.Username,
                    Password = config.EncryptedPassword,
                    ConnectTimeout = 5,
                    TrustServerCertificate = true
                };
                using var conn = new Microsoft.Data.SqlClient.SqlConnection(builder.ConnectionString);
                await conn.OpenAsync();
                success = true;
            }

            var res = req.CreateResponse(HttpStatusCode.OK);
            await res.WriteAsJsonAsync(new { success = success, error = success ? null : error });
            return res;
        }
        catch (Exception ex)
        {
            var res = req.CreateResponse(HttpStatusCode.OK);
            await res.WriteAsJsonAsync(new { success = false, error = ex.InnerException?.Message ?? ex.Message });
            return res;
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

            var authenticatedUserId = req.FunctionContext.Items["UserId"]?.ToString();
            if (string.IsNullOrEmpty(authenticatedUserId))
            {
                return req.CreateResponse(HttpStatusCode.Unauthorized);
            }

            if (payload == null)
                return req.CreateResponse(HttpStatusCode.BadRequest);

            var id = await appDb.CreateSessionAsync(payload.Id, authenticatedUserId, payload.ConnectionId, payload.Title);

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

    [Function("DeleteSession")]
    public async Task<HttpResponseData> DeleteSession(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "sessions/{sessionId}")] HttpRequestData req, string sessionId)
    {
        try
        {
            var authenticatedUserId = req.FunctionContext.Items["UserId"]?.ToString();
            if (string.IsNullOrEmpty(authenticatedUserId))
                return req.CreateResponse(HttpStatusCode.Unauthorized);

            await appDb.DeleteSessionAsync(Guid.Parse(sessionId), authenticatedUserId);

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

    [Function("GetOrganization")]
    public async Task<HttpResponseData> GetOrganization(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "organizations/me")] HttpRequestData req)
    {
        try
        {
            var authenticatedUserId = req.FunctionContext.Items["UserId"]?.ToString();
            if (string.IsNullOrEmpty(authenticatedUserId))
                return req.CreateResponse(HttpStatusCode.Unauthorized);

            var org = await appDb.GetOrganizationByUserIdAsync(authenticatedUserId);
            var res = req.CreateResponse(HttpStatusCode.OK);
            await res.WriteAsJsonAsync(org);
            return res;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get organization.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }

    [Function("CreateOrganization")]
    public async Task<HttpResponseData> CreateOrganization(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "organizations")] HttpRequestData req)
    {
        try
        {
            var authenticatedUserId = req.FunctionContext.Items["UserId"]?.ToString();
            if (string.IsNullOrEmpty(authenticatedUserId))
                return req.CreateResponse(HttpStatusCode.Unauthorized);

            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var org = JsonSerializer.Deserialize<OrganizationRecord>(body, _jsonOptions);

            if (org == null || string.IsNullOrWhiteSpace(org.Name))
                return req.CreateResponse(HttpStatusCode.BadRequest);

            var id = await appDb.CreateOrganizationAsync(org, authenticatedUserId);
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
}

