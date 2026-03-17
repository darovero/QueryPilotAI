namespace Infrastructure.Sql;

public interface ISqlExecutionService
{
    Task<List<Dictionary<string, object?>>> ExecuteQueryAsync(string sql);
}

public sealed class SqlExecutionService : ISqlExecutionService
{
    public Task<List<Dictionary<string, object?>>> ExecuteQueryAsync(string sql)
    {
        // Placeholder para implementación real con Microsoft.Data.SqlClient y parámetros seguros.
        var rows = new List<Dictionary<string, object?>>
        {
            new()
            {
                ["merchant_id"] = "M102",
                ["merchant_name"] = "Northwind Fuel",
                ["chargeback_rate"] = 0.082m,
                ["baseline_rate"] = 0.022m,
                ["delta_factor"] = 3.7m
            }
        };

        return Task.FromResult(rows);
    }
}
