using Core.Application.Contracts;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace Functions.Api.Functions;

public class TestConnectionFunction(
    Infrastructure.Sql.ISqlExecutionService sqlExecutionService,
    ILogger<TestConnectionFunction> logger)
{
    [Function("TestConnection")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "test-connection")] HttpRequestData req)
    {
        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var config = JsonSerializer.Deserialize<DatabaseConfig>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (config == null || string.IsNullOrWhiteSpace(config.Host))
            {
                var badRes = req.CreateResponse(HttpStatusCode.BadRequest);
                await badRes.WriteAsJsonAsync(new { error = "Invalid connection configuration." });
                return badRes;
            }

            // Test connection by running a simple query
            await sqlExecutionService.ExecuteQueryAsync("SELECT 1", config);

            var okRes = req.CreateResponse(HttpStatusCode.OK);
            await okRes.WriteAsJsonAsync(new { message = "Connection successful." });
            return okRes;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Connection test failed.");
            var errRes = req.CreateResponse(HttpStatusCode.BadRequest);
            await errRes.WriteAsJsonAsync(new { error = ex.Message });
            return errRes;
        }
    }
}
