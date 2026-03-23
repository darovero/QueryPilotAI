namespace Infrastructure.Sql;

/// <summary>
/// Manages application-level persistence: user connections, chat sessions, conversation turns.
/// Operates against insightforge-appdb (distinct from user's analytical database).
/// </summary>
public interface IAppDatabaseService
{
    // --- User Connections ---
    Task<Guid> SaveConnectionAsync(UserConnectionRecord connection);
    Task<UserConnectionRecord?> GetConnectionAsync(Guid connectionId);
    Task<List<UserConnectionRecord>> GetConnectionsByUserAsync(string userId);
    Task UpdateSchemaCacheAsync(Guid connectionId, string schemaJson);
    Task DeleteConnectionAsync(Guid connectionId, string userId);
    Task DeleteUserAccountAsync(string userId);

    // --- Chat Sessions ---
    Task<Guid> CreateSessionAsync(Guid id, string userId, Guid? connectionId, string? title);
    Task<List<ChatSessionRecord>> GetSessionsByUserAsync(string userId);
    Task TouchSessionAsync(Guid sessionId);
    Task DeleteSessionAsync(Guid sessionId, string userId);

    // --- Conversation Turns ---
    Task<Guid> AddTurnAsync(ConversationTurnRecord turn);
    Task<List<ConversationTurnRecord>> GetRecentTurnsAsync(Guid sessionId, int maxTurns = 10);

    // --- Organizations ---
    Task<Guid> CreateOrganizationAsync(OrganizationRecord org, string adminUserId);
    Task<List<OrganizationRecord>> GetOrganizationsByUserIdAsync(string userId);
    Task<int> GetOrganizationCountAsync(string userId);
    Task DeleteOrganizationAsync(Guid orgId, string userId);
}
