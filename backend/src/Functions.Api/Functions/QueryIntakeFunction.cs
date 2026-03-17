using Core.Application.Contracts;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.DurableTask.Client;
using System.Net;
using System.Text.Json;

namespace Functions.Api.Functions;

public class QueryIntakeFunction
{
    [Function(nameof(QueryIntakeFunction))]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "query")] HttpRequestData req,
        [DurableClient] DurableTaskClient durableClient,
        FunctionContext executionContext)
    {
        var request = await JsonSerializer.DeserializeAsync<QueryRequest>(req.Body, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        if (request is null || string.IsNullOrWhiteSpace(request.Question))
        {
            var bad = req.CreateResponse(HttpStatusCode.BadRequest);
            await bad.WriteStringAsync("Invalid request payload.");
            return bad;
        }

        var instanceId = await durableClient.ScheduleNewOrchestrationInstanceAsync(
            nameof(FraudInsightOrchestrator),
            request);

        var response = req.CreateResponse(HttpStatusCode.Accepted);
        await response.WriteAsJsonAsync(new
        {
            instanceId,
            statusQueryGetUri = $"/api/orchestrations/{instanceId}"
        });

        return response;
    }
}
