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
        var statusUrl = $"{req.Url.Scheme}://{req.Url.Authority}/api/orchestrations/{instanceId}";
        await response.WriteAsJsonAsync(new
        {
            instanceId,
            statusQueryGetUri = statusUrl
        });

        return response;
    }
}

public class OrchestrationStatusFunction
{
    [Function(nameof(OrchestrationStatusFunction))]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "orchestrations/{instanceId}")] HttpRequestData req,
        string instanceId,
        [DurableClient] DurableTaskClient durableClient)
    {
        var metadata = await durableClient.GetInstanceAsync(instanceId, getInputsAndOutputs: true);
        if (metadata is null)
        {
            var notFound = req.CreateResponse(HttpStatusCode.NotFound);
            await notFound.WriteAsJsonAsync(new
            {
                instanceId,
                status = "NotFound"
            });

            return notFound;
        }

        var ok = req.CreateResponse(HttpStatusCode.OK);
        var outputRaw = metadata.SerializedOutput;
        InsightResponse? output = null;
        if (!string.IsNullOrWhiteSpace(outputRaw))
        {
            try
            {
                output = JsonSerializer.Deserialize<InsightResponse>(outputRaw);
            }
            catch
            {
                // Keep output as null and expose outputRaw for troubleshooting.
            }
        }

        await ok.WriteAsJsonAsync(new
        {
            instanceId = metadata.InstanceId,
            runtimeStatus = metadata.RuntimeStatus.ToString(),
            createdAt = metadata.CreatedAt,
            lastUpdatedAt = metadata.LastUpdatedAt,
            output,
            outputRaw
        });

        return ok;
    }
}
