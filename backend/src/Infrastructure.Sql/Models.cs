namespace Infrastructure.Sql;

public sealed record OrganizationRecord(
    Guid Id,
    string Name,
    string? Industry,
    DateTimeOffset CreatedAt);

public sealed record OrganizationMemberRecord(
    Guid OrganizationId,
    string UserId,
    string Role,
    DateTimeOffset JoinedAt);

public sealed record UserConnectionRecord(
    Guid Id,
    string UserId,
    string ConnectionName,
    string DbType,
    string Host,
    string? Port,
    string DatabaseName,
    string? AuthType,
    string? Username,
    string? EncryptedPassword,
    string? SchemaCache,
    DateTimeOffset? SchemaExtractedAt,
    DateTimeOffset CreatedAt,
    bool IsActive);

public sealed record ChatSessionRecord(
    Guid Id,
    string UserId,
    Guid? ConnectionId,
    string? Title,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastActivity);

public sealed record ConversationTurnRecord(
    Guid Id,
    Guid SessionId,
    string UserId,
    string Role,
    string Question,
    string? SqlGenerated,
    string? AgentResponse,
    string? Summary,
    string? IntentType,
    string? Metric,
    DateTimeOffset CreatedAt);
