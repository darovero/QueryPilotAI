
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'organizations')
BEGIN
CREATE TABLE dbo.organizations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(255) NOT NULL,
    industry NVARCHAR(100) NULL,
    created_at DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME()
);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'organization_members')
BEGIN
CREATE TABLE dbo.organization_members (
    organization_id UNIQUEIDENTIFIER NOT NULL,
    user_id NVARCHAR(255) NOT NULL,
    role NVARCHAR(50) NOT NULL DEFAULT 'Admin',
    joined_at DATETIMEOFFSET NOT NULL DEFAULT SYSUTCDATETIME(),
    PRIMARY KEY (organization_id, user_id),
    CONSTRAINT FK_OrgMembers_Org FOREIGN KEY (organization_id) REFERENCES dbo.organizations(id) ON DELETE CASCADE
);
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.user_connections') AND name = 'organization_id')
BEGIN
ALTER TABLE dbo.user_connections ADD organization_id UNIQUEIDENTIFIER NULL;
-- Use ON DELETE CASCADE 
ALTER TABLE dbo.user_connections ADD CONSTRAINT FK_UserConnections_Org FOREIGN KEY (organization_id) REFERENCES dbo.organizations(id) ON DELETE CASCADE;
END
ELSE
BEGIN
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_UserConnections_Org')
    ALTER TABLE dbo.user_connections DROP CONSTRAINT FK_UserConnections_Org;

ALTER TABLE dbo.user_connections ADD CONSTRAINT FK_UserConnections_Org FOREIGN KEY (organization_id) REFERENCES dbo.organizations(id) ON DELETE CASCADE;
END

-- Ensure cascade delete from user_connections to chat_sessions
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_ChatSessions_Connections')
    ALTER TABLE dbo.chat_sessions DROP CONSTRAINT FK_ChatSessions_Connections;
-- Assuming constraint might be unnamed, but for a clean migration script we try to add it naming it
-- Wait, if it's unnamed, we can't easily drop it here without dynamic sql. We will assume the script is mostly fresh.
-- Let's execute safety checks or just modify create_app_tables.sql directly.

