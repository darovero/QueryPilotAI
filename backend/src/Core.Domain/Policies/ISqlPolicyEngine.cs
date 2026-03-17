namespace Core.Domain.Policies;

public interface ISqlPolicyEngine
{
    Core.Application.Contracts.SqlValidationResult Validate(string sql);
}
