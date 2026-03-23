// Shared types for the UnifiedChat component tree

export type ProgressEvent = { label: string; status: string; time: string };

export type Message = {
  id: string;
  role: "user" | "ai";
  content?: string;
  sql?: string;
  insight?: string;
  status?: "PendingApproval" | "Completed" | "Failed" | "Blocked" | "Running" | "Accepted" | "Rejected";
  instanceId?: string;
  progressEvents?: ProgressEvent[];
  results?: Record<string, unknown>[];
  approvalSql?: string;
  riskLevel?: string;
  reasons?: string[];
};

export type LogEntry = {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR" | "DEBUG" | "READY";
  message: string;
};

export type Connection = {
  id: string;
  name: string;
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
  type?: string;
  authType?: string;
};

export type ChatSession = {
  id: string;
  connectionId: string;
  title: string;
  messages: Message[];
};

export type DashboardTab = {
  type: 'chat' | 'ide';
  id: string;
  title: string;
  connectionId?: string;
  sql?: string;
};

// Backend API response shapes
export type ServerConnectionRecord = {
  id: string;
  connectionName: string;
  host: string;
  port?: string;
  databaseName: string;
  username?: string;
  encryptedPassword?: string;
  dbType: string;
  authType?: string;
};

export type ServerSessionRecord = {
  id: string;
  connectionId?: string;
  title?: string;
  createdAt?: string;
  lastActivity?: string;
};

export type HistorySession = {
  id: string;
  connectionId?: string;
  title?: string;
  createdAt?: string;
  lastActivity?: string;
  messages: Message[];
};

export type ConnFormField = {
  label: string;
  key: keyof Connection;
  type: string;
};

export type ViewState = 'welcome' | 'integrations' | 'connect_postgres' | 'connect_azuresql' | 'manage_connections' | 'settings' | 'history' | string;

export type Organization = {
  id: string;
  name: string;
  industry?: string;
};
