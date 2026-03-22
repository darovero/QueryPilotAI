using Core.Application.Contracts;
using Functions.Api.Extensions;
using Infrastructure.Security;
using Infrastructure.Sql;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace Functions.Api.Functions;

public class ConnectionFunctions(
    IAppDatabaseService appDb,
    IEncryptionService encryption,
    ILogger<ConnectionFunctions> logger)
{
    private static readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    [Function("SaveConnection")]
    public async Task<HttpResponseData> SaveConnection(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "connections")] HttpRequestData req)
    {
        try
        {
            using var bodyReader = new StreamReader(req.Body);
            var body = await bodyReader.ReadToEndAsync();
            var config = JsonSerializer.Deserialize<UserConnectionRecord>(body, _jsonOptions);

            if (config == null || string.IsNullOrWhiteSpace(config.ConnectionName))
                return req.CreateResponse(HttpStatusCode.BadRequest);

            if (!req.TryGetAuthenticatedUserId(out var userId, out var unauth))
            {
                if (string.IsNullOrWhiteSpace(config.UserId))
                    return unauth!;
                userId = config.UserId;
            }

            config = config with { UserId = userId };

            // Encrypt password before storing
            if (!string.IsNullOrEmpty(config.EncryptedPassword))
            {
                config = config with { EncryptedPassword = encryption.Encrypt(config.EncryptedPassword) };
            }

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
            if (!req.TryGetAuthenticatedUserId(out var userId, out var unauth))
                return unauth!;

            var list = await appDb.GetConnectionsByUserAsync(userId);
            var res = req.CreateResponse(HttpStatusCode.OK);
            res.Headers.Add("Content-Type", "application/json");
            await res.WriteStringAsync(JsonSerializer.Serialize(list, _jsonOptions));
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
            if (!req.TryGetAuthenticatedUserId(out var userId, out var unauth))
                return unauth!;

            if (!Guid.TryParse(id, out var connectionId))
                return req.CreateResponse(HttpStatusCode.BadRequest);

            await appDb.DeleteConnectionAsync(connectionId, userId);
            return req.CreateResponse(HttpStatusCode.OK);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete connection.");
            return req.CreateResponse(HttpStatusCode.InternalServerError);
        }
    }

    [Function("TestConnection")]
    public async Task<HttpResponseData> TestConnection(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "connections/test")] HttpRequestData req)
    {
        try
        {
            using var bodyReader = new StreamReader(req.Body);
            var body = await bodyReader.ReadToEndAsync();
            var config = JsonSerializer.Deserialize<UserConnectionRecord>(body, _jsonOptions);

            if (!req.TryGetAuthenticatedUserId(out _, out var unauth))
                return unauth!;

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
                var portPart = string.IsNullOrWhiteSpace(config.Port) ? "" : $",{config.Port}";
                string connectionString;

                if (string.Equals(config.AuthType, "AzureADToken", StringComparison.OrdinalIgnoreCase) || 
                    string.Equals(config.AuthType, "AzureAD", StringComparison.OrdinalIgnoreCase))
                {
                    if (!string.IsNullOrWhiteSpace(config.Username) && !string.IsNullOrWhiteSpace(config.EncryptedPassword))
                    {
                        connectionString = $"Server={config.Host}{portPart};Initial Catalog={config.DatabaseName};User ID={config.Username};Password={config.EncryptedPassword};Encrypt=True;TrustServerCertificate=True;Authentication=Active Directory Password;Connection Timeout=5;";
                    }
                    else
                    {
                        connectionString = $"Server={config.Host}{portPart};Initial Catalog={config.DatabaseName};Encrypt=True;TrustServerCertificate=True;Authentication=Active Directory Default;Connection Timeout=5;";
                    }
                }
                else if (string.IsNullOrWhiteSpace(config.Username))
                {
                    connectionString = $"Server={config.Host}{portPart};Initial Catalog={config.DatabaseName};Encrypt=True;TrustServerCertificate=True;Authentication=Active Directory Default;Connection Timeout=5;";
                }
                else
                {
                    connectionString = $"Server={config.Host}{portPart};Initial Catalog={config.DatabaseName};User ID={config.Username};Password={config.EncryptedPassword};Encrypt=True;TrustServerCertificate=True;Connection Timeout=5;";
                }

                using var conn = new Microsoft.Data.SqlClient.SqlConnection(connectionString);
                await conn.OpenAsync();
                success = true;
            }

            if (!success)
            {
                var fail = req.CreateResponse(HttpStatusCode.BadRequest);
                await fail.WriteAsJsonAsync(new { success = false, error }, HttpStatusCode.BadRequest);
                return fail;
            }
            var res = req.CreateResponse(HttpStatusCode.OK);
            await res.WriteAsJsonAsync(new { success = true });
            return res;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Connection test failed.");
            var res = req.CreateResponse(HttpStatusCode.BadRequest);
            
            string friendlyMessage = "No se pudo establecer la conexión. Por favor revisa que toda la información ingresada (Host, Base de datos, Credenciales) sea correcta.";
            if (ex is Microsoft.Data.SqlClient.SqlException sqlEx)
            {
                if (sqlEx.Number == 53 || sqlEx.Number == 40)
                    friendlyMessage = "No se encontró el servidor. Verifica que el 'Host' sea exacto y que el firewall permita la conexión.";
                else if (sqlEx.Number == 18456)
                    friendlyMessage = "Autenticación fallida. Revisa tu Usuario y Contraseña o asegúrate de elegir el método de autenticación correcto.";
                else if (sqlEx.Number == 40615)
                    friendlyMessage = "Tu IP actual no tiene permitido el acceso. Debes agregar esta IP al firewall de Azure SQL.";
            }
            else if (ex is ArgumentException)
            {
                friendlyMessage = "La estructura de la conexión tiene un error de formato. Revisa campos vacíos o caracteres inválidos.";
            }

            string finalError = $"{friendlyMessage}\n\n(Detalle técnico: {ex.InnerException?.Message ?? ex.Message})";
            await res.WriteAsJsonAsync(new { success = false, error = finalError }, HttpStatusCode.BadRequest);
            return res;
        }
    }
}
