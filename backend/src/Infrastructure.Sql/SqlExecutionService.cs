namespace Infrastructure.Sql;

using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

public interface ISqlExecutionService
{
    Task<List<Dictionary<string, object?>>> ExecuteQueryAsync(string sql);
}

public sealed class SqlExecutionService(IConfiguration configuration) : ISqlExecutionService
{
    private readonly string _connectionString =
        configuration["SqlConnectionString"]
        ?? throw new InvalidOperationException("SqlConnectionString configuration is required.");

    public async Task<List<Dictionary<string, object?>>> ExecuteQueryAsync(string sql)
    {
        await using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(sql, connection)
        {
            CommandTimeout = 30
        };

        var rows = new List<Dictionary<string, object?>>();
        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                row[reader.GetName(i)] = value;
            }

            rows.Add(row);
        }

        return rows;
    }
}
