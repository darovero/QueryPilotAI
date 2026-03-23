using System.Text.RegularExpressions;
using Core.Application.Contracts;
using Core.Domain.Policies;

namespace Infrastructure.Security;

public sealed partial class SqlPolicyEngine : ISqlPolicyEngine
{
    private static readonly string[] ForbiddenKeywords =
    [
        "INSERT", "UPDATE", "DELETE", "MERGE", "DROP", "ALTER", "TRUNCATE", "EXEC", "CREATE",
        "GRANT", "REVOKE", "DENY", "BACKUP", "RESTORE", "SHUTDOWN", "KILL", "OPENROWSET", "OPENDATASOURCE",
        "XP_", "SP_", "DBCC"
    ];

    [GeneratedRegex(@"/\*.*?\*/", RegexOptions.Singleline)]
    private static partial Regex BlockCommentRegex();

    [GeneratedRegex(@"--[^\r\n]*", RegexOptions.None)]
    private static partial Regex LineCommentRegex();

    public SqlValidationResult Validate(string sql)
    {
        if (string.IsNullOrWhiteSpace(sql))
        {
            return new SqlValidationResult(false, "Critical", false, ["SQL vacío."], string.Empty);
        }

        // 1. Strip all SQL comments first to prevent bypass via DE/**/LETE or -- tricks
        var stripped = BlockCommentRegex().Replace(sql, " ");
        stripped = LineCommentRegex().Replace(stripped, " ");

        var normalized = stripped.Trim().Replace("\r", " ").Replace("\n", " ");
        // Collapse multiple spaces
        normalized = Regex.Replace(normalized, @"\s+", " ");

        // Strip trailing semicolons
        normalized = normalized.TrimEnd(';').TrimEnd();

        var upper = normalized.ToUpperInvariant();

        // 2. Must start with SELECT or WITH (CTE)
        if (!upper.StartsWith("SELECT ") && !upper.StartsWith("WITH "))
        {
            return new SqlValidationResult(false, "Critical", false, ["Solo se permiten consultas SELECT (o CTEs con WITH)."], normalized);
        }

        // 3. Check for forbidden keywords using word boundaries (prevents false positives)
        foreach (var keyword in ForbiddenKeywords)
        {
            var pattern = $@"\b{keyword}\b";
            if (Regex.IsMatch(upper, pattern))
            {
                return new SqlValidationResult(false, "Critical", false, [$"Se detectó un comando SQL prohibido: {keyword}."], normalized);
            }
        }

        // 4. Check for multiple statements (after stripping trailing semicolons)
        if (normalized.Contains(';'))
        {
            return new SqlValidationResult(false, "Critical", false, ["No se permiten múltiples sentencias."], normalized);
        }

        // 5. Flag queries that expose potentially sensitive fields
        var requiresApproval = upper.Contains("CUSTOMER_ID") || upper.Contains("FULL_NAME");
        var reasons = requiresApproval ? new[] { "La consulta expone detalle potencialmente sensible." } : Array.Empty<string>();
        var risk = requiresApproval ? "High" : "Medium";

        return new SqlValidationResult(true, risk, requiresApproval, reasons, normalized);
    }
}
