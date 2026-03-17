using System.Text.RegularExpressions;
using Core.Application.Contracts;
using Core.Domain.Policies;

namespace Infrastructure.Security;

public sealed class SqlPolicyEngine : ISqlPolicyEngine
{
    private static readonly string[] ForbiddenTokens =
    [
        "INSERT ", "UPDATE ", "DELETE ", "MERGE ", "DROP ", "ALTER ", "TRUNCATE ", "EXEC ", "CREATE "
    ];

    private static readonly string[] AllowedObjects =
    [
        "dbo.vw_daily_fraud_metrics",
        "dbo.vw_merchant_chargeback_trends",
        "dbo.vw_customer_risk_profile",
        "dbo.vw_failed_then_successful_transactions",
        "dbo.vw_high_risk_device_reuse"
    ];

    public SqlValidationResult Validate(string sql)
    {
        if (string.IsNullOrWhiteSpace(sql))
        {
            return new SqlValidationResult(false, "Critical", false, ["SQL vacío."], string.Empty);
        }

        var normalized = sql.Trim().Replace("\r", " ").Replace("\n", " ");
        var upper = normalized.ToUpperInvariant();

        if (!upper.StartsWith("SELECT "))
        {
            return new SqlValidationResult(false, "Critical", false, ["Solo se permiten consultas SELECT."], normalized);
        }

        if (ForbiddenTokens.Any(token => upper.Contains(token)))
        {
            return new SqlValidationResult(false, "Critical", false, ["Se detectó un comando SQL prohibido."], normalized);
        }

        if (normalized.Count(c => c == ';') > 0)
        {
            return new SqlValidationResult(false, "Critical", false, ["No se permiten múltiples sentencias."], normalized);
        }

        var fromMatches = Regex.Matches(normalized, @"(?i)\b(from|join)\s+([\[\]\w\.]+)");
        var referencedObjects = fromMatches.Select(m => m.Groups[2].Value.Replace("[", "").Replace("]", "")).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

        var unauthorized = referencedObjects.Where(o => !AllowedObjects.Contains(o, StringComparer.OrdinalIgnoreCase)).ToArray();
        if (unauthorized.Length > 0)
        {
            return new SqlValidationResult(false, "High", false, [$"Objeto no autorizado: {string.Join(", ", unauthorized)}"], normalized);
        }

        var requiresApproval = upper.Contains("CUSTOMER_ID") || upper.Contains("FULL_NAME");
        var reasons = requiresApproval ? new[] { "La consulta expone detalle potencialmente sensible." } : Array.Empty<string>();
        var risk = requiresApproval ? "High" : "Medium";

        return new SqlValidationResult(true, risk, requiresApproval, reasons, normalized);
    }
}
