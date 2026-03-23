"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { useApi } from "../../hooks/useApi";
import { toast } from "sonner";
import { getErrorMessage } from "../utils";
import { logger } from "../../lib/logger";
import type {
  Message, LogEntry, Connection, ChatSession, DashboardTab,
  ServerConnectionRecord, ServerSessionRecord, HistorySession,
  ViewState, Organization,
} from "../types";

export function useChatEngine() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [openTabs, setOpenTabs] = useState<DashboardTab[]>([]);

  const [isInsightPanelOpen, setIsInsightPanelOpen] = useState(false);
  const [selectedMessageForPanel, setSelectedMessageForPanel] = useState<Message | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const [currentView, setCurrentView] = useState<ViewState>('welcome');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedConns, setExpandedConns] = useState<Record<string, boolean>>({});

  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [connForm, setConnForm] = useState<Partial<Connection>>({
    name: "My Postgres Database", host: "db.mypostgres.com", port: "5432",
    database: "analytics_db", username: "postgres_admin", password: "", type: "PostgreSQL"
  });
  const [connError, setConnError] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const { instance, accounts } = useMsal();
  const { fetchWithAuth, userId } = useApi();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);
  const [isAddingWorkspace, setIsAddingWorkspace] = useState(false);

  const activeChatSession = chatSessions.find(c => c.id === currentView) || null;
  const messages = activeChatSession?.messages || [];

  const [activePoll, setActivePoll] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
  const [activeTabs, setActiveTabs] = useState<Record<string, 'query' | 'insight' | 'results'>>({});
  const [historyData, setHistoryData] = useState<HistorySession[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const sanitizeConnectionsForStorage = (items: Connection[]) =>
    items.map(({ password: _password, ...connection }) => connection);

  const activeAccount = accounts[0];
  const userName = activeAccount?.name || 'User';
  const userEmail = activeAccount?.username || '';
  const userInitial = userName.charAt(0).toUpperCase();

  // --- Compatibility wrapper for dynamic multi-chat support ---
  const setMessages = useCallback((updater: Message[] | ((prev: Message[]) => Message[])) => {
    setChatSessions(prevSessions => prevSessions.map(session => {
      const isTargetSession = activePoll
        ? session.messages.some(m => m.instanceId === activePoll)
        : session.id === currentView;
      if (isTargetSession) {
        const newMsgs = typeof updater === 'function' ? updater(session.messages) : updater;
        return { ...session, messages: newMsgs };
      }
      return session;
    }));
  }, [activePoll, currentView]);

  const addLog = useCallback((level: LogEntry["level"], msg: string) => {
    setTerminalLogs((prev) => [
      ...prev,
      { id: Math.random().toString(), timestamp: new Date().toISOString(), level, message: msg },
    ]);
  }, []);

  // --- Hydration: localStorage ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConns = localStorage.getItem('qp_connections');
      if (savedConns) try { setConnections(sanitizeConnectionsForStorage(JSON.parse(savedConns))); } catch {}
      const savedChats = localStorage.getItem('qp_chatSessions');
      if (savedChats) try { setChatSessions(JSON.parse(savedChats)); } catch {}
      const savedTabs = localStorage.getItem('qp_openTabs');
      if (savedTabs) try { setOpenTabs(JSON.parse(savedTabs)); } catch {}
    }
  }, []);

  // --- Init terminal logs ---
  useEffect(() => {
    setTerminalLogs([
      { id: "1", timestamp: new Date().toISOString(), level: "INFO", message: "System initializing..." },
      { id: "2", timestamp: new Date().toISOString(), level: "SUCCESS", message: "Dashboard UI ready." }
    ]);
  }, []);

  // --- localStorage persistence ---
  useEffect(() => { localStorage.setItem('qp_connections', JSON.stringify(sanitizeConnectionsForStorage(connections))); }, [connections]);
  useEffect(() => { localStorage.setItem('qp_chatSessions', JSON.stringify(chatSessions)); }, [chatSessions]);
  useEffect(() => { localStorage.setItem('qp_openTabs', JSON.stringify(openTabs)); }, [openTabs]);

  // --- Fetch organization on load ---
  useEffect(() => {
    if (userId) {
      fetchWithAuth('/api/organizations/me')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          const orgs = Array.isArray(data) ? data : (data ? [data] : []);
          setOrganizations(orgs);
          setOrganization(orgs[0] || null);
          setIsLoadingOrg(false);
        })
        .catch(() => setIsLoadingOrg(false));
    }
  }, [userId]);

  // --- Server-side hydration ---
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    if (!userId || hasHydrated) return;
    const hydrate = async () => {
      try {
        const connRes = await fetchWithAuth('/api/connections');
        if (connRes.ok) {
          const serverConns = await connRes.json();
          if (Array.isArray(serverConns) && serverConns.length > 0) {
            const mapped: Connection[] = serverConns.map((c: ServerConnectionRecord) => ({
              id: c.id, name: c.connectionName, host: c.host, port: c.port,
              database: c.databaseName, username: c.username,
              type: c.dbType, authType: c.authType
            }));
            setConnections(mapped);
          }
        }
        const sessRes = await fetchWithAuth('/api/sessions/me');
        if (sessRes.ok) {
          const serverSessions = await sessRes.json();
          if (Array.isArray(serverSessions) && serverSessions.length > 0) {
            setChatSessions(prev => {
              const existingIds = new Set(prev.map(s => s.id));
              const newSessions: ChatSession[] = serverSessions
                .filter((s: ServerSessionRecord) => !existingIds.has(s.id))
                .map((s: ServerSessionRecord) => ({
                  id: s.id, connectionId: s.connectionId || '', title: s.title || 'Chat', messages: []
                }));
              return [...prev, ...newSessions];
            });
          }
        }
        setHasHydrated(true);
        addLog("SUCCESS", "Workspace synced from server.");
        logger.info("Hydration complete", { connections: connections.length });
      } catch (err) {
        logger.warn("Backend hydration failed, using localStorage", {
          error: err instanceof Error ? err.message : String(err),
        });
        setHasHydrated(true);
      }
    };
    hydrate();
  }, [userId]);

  // --- Scroll to bottom on new messages ---
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // --- Polling for orchestration status ---
  useEffect(() => {
    if (!activePoll) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetchWithAuth("/api/orchestrations/" + activePoll);
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();

        if (data.customStatus && data.customStatus.Label) {
          addLog("DEBUG", "[Orchestrator] " + data.customStatus.Label + " - " + data.customStatus.Status);
          setMessages(prev => {
            const newMsgs = [...prev];
            const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
            if (aiIdx !== -1) {
              const msg = newMsgs[aiIdx];
              if (!msg.progressEvents) msg.progressEvents = [];
              const timeNow = new Date().toLocaleTimeString();
              const lastEvent = msg.progressEvents[msg.progressEvents.length - 1];
              if (!lastEvent || lastEvent.label !== data.customStatus.Label || lastEvent.status !== data.customStatus.Status) {
                msg.progressEvents.push({ label: data.customStatus.Label, status: data.customStatus.Status, time: timeNow });
              }
            }
            return newMsgs;
          });
        }

        if (data.runtimeStatus === "Completed" || data.runtimeStatus === "Failed" || data.runtimeStatus === "Terminated") {
          setIsTyping(false);
          setActivePoll(null);
          if (data.runtimeStatus === "Completed" && data.output) {
            if (data.output.Status === "Conversational" || data.output.Status === "needs_clarification" || data.output.Status === "unsupported" || data.output.Status === "blocked" || data.output.Status === "Error") {
              addLog("SUCCESS", "Early response: " + data.output.Status);
              setMessages((prev) => {
                const newMsgs = [...prev];
                const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
                if (aiIdx !== -1) {
                  newMsgs[aiIdx].status = "Completed";
                  newMsgs[aiIdx].content = data.output.ExecutiveSummary;
                }
                return newMsgs;
              });
            } else {
              addLog("SUCCESS", "Query completed successfully.");
              setMessages((prev) => {
                const newMsgs = [...prev];
                const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
                if (aiIdx !== -1) {
                  newMsgs[aiIdx].status = "Completed";
                  newMsgs[aiIdx].insight = data.output.ExecutiveSummary;
                  newMsgs[aiIdx].sql = data.output.Sql;
                  if (data.output.ResultPreview && data.output.ResultPreview.length > 0) {
                    newMsgs[aiIdx].results = data.output.ResultPreview;
                  }
                }
                return newMsgs;
              });
            }
          } else if (data.runtimeStatus === "Failed") {
            addLog("ERROR", "Execution failed: " + (data.outputRaw || "Unknown error"));
            setMessages((prev) => {
              const newMsgs = [...prev];
              const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
              if (aiIdx !== -1) {
                newMsgs[aiIdx].status = "Failed";
                newMsgs[aiIdx].content = "Ocurrió un error al procesar tu solicitud.";
              }
              return newMsgs;
            });
          }
        } else if (data.customStatus?.Status === "PendingApproval") {
          setIsTyping(false);
          setActivePoll(null);
          addLog("WARN", "Query paused for manual approval (Risk: High)");
          setMessages((prev) => {
            const newMsgs = [...prev];
            const aiIdx = newMsgs.findIndex(m => m.instanceId === activePoll);
            if (aiIdx !== -1) {
              newMsgs[aiIdx].status = "PendingApproval";
              newMsgs[aiIdx].sql = data.customStatus.Sql;
              newMsgs[aiIdx].content = "Tu consulta requiere aprobación de un supervisor debido a políticas de sensibilidad.";
            }
            return newMsgs;
          });
        }
      } catch {
        // Silent polling failure
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activePoll]);

  // --- Handlers ---

  const handleSubmit = async () => {
    if (!input.trim() || !activeChatSession) return;
    const userMsg: Message = { id: Math.random().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    addLog("INFO", "Received user query: " + userMsg.content);
    logger.info("Query submitted", { sessionId: activeChatSession.id, queryLength: (userMsg.content ?? '').length });
    const activeConnection = connections.find(c => c.id === activeChatSession.connectionId);
    try {
      const response = await fetchWithAuth("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsg.content, userId, role: "FraudAnalyst",
          correlationId: crypto.randomUUID(), sessionId: activeChatSession.id,
          connectionId: activeConnection?.id,
          connection: activeConnection && !activeConnection.id ? {
            type: activeConnection.type || "PostgreSQL", host: activeConnection.host,
            port: activeConnection.port, database: activeConnection.database,
            username: activeConnection.username, password: activeConnection.password
          } : undefined
        }),
      });
      if (!response.ok) {
        const errRes = await response.json();
        setIsTyping(false);
        addLog("ERROR", "API rejection: " + errRes.error);
        setMessages((prev) => [...prev, { id: Math.random().toString(), role: "ai", status: "Blocked", content: "Lo siento, la consulta fue bloqueada por filtros de seguridad cognitivos." }]);
        return;
      }
      const body = await response.json();
      addLog("DEBUG", "Orchestration started: " + body.instanceId);
      const aiMsg: Message = { id: Math.random().toString(), role: "ai", instanceId: body.instanceId, status: "Running", content: "Analizando solicitud..." };
      setMessages((prev) => [...prev, aiMsg]);
      setActivePoll(body.instanceId);
    } catch (e: unknown) {
      setIsTyping(false);
      addLog("ERROR", getErrorMessage(e));
    }
  };

  const handleApproval = async (msg: Message, decision: 'Approved' | 'Rejected', comments?: string) => {
    if (!msg.instanceId) return;
    try {
      addLog("INFO", `Sending ${decision} for ${msg.instanceId}`);
      const res = await fetchWithAuth(`/api/orchestrations/${msg.instanceId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comments: comments || "" }),
      });
      if (!res.ok) throw new Error("Approval failed");
      setMessages((prev) => {
        const newMsgs = [...prev];
        const aiIdx = newMsgs.findIndex(m => m.id === msg.id);
        if (aiIdx !== -1) {
          if (decision === 'Approved') {
            newMsgs[aiIdx].status = "Running";
            newMsgs[aiIdx].content = "Consulta aprobada. Ejecutando...";
            setActivePoll(msg.instanceId!);
            setIsTyping(true);
          } else {
            newMsgs[aiIdx].status = "Rejected";
            newMsgs[aiIdx].content = `Consulta rechazada${comments ? ': ' + comments : ''}.`;
          }
        }
        return newMsgs;
      });
      addLog("SUCCESS", `Decision '${decision}' sent.`);
    } catch (e: unknown) {
      addLog("ERROR", "Approval error: " + getErrorMessage(e));
    }
  };

  const handleCopySQL = (sql: string) => {
    navigator.clipboard.writeText(sql).then(() => {
      addLog("SUCCESS", "SQL copiado al clipboard.");
    });
  };

  const handleSaveConnection = async () => {
    if (!connForm.name?.trim()) {
      setConnError("Connection name is required.");
      return;
    }
    if (editingConnId && connections.some(c => c.id !== editingConnId && c.name.toLowerCase() === connForm.name!.trim().toLowerCase())) {
      setConnError("A connection with this name already exists.");
      return;
    }
    if (!editingConnId && connections.some(c => c.name.toLowerCase() === connForm.name!.trim().toLowerCase())) {
      setConnError("A connection with this name already exists.");
      return;
    }
    try {
      setConnError("");
      setIsTestingConnection(true);
      const res = await fetchWithAuth("/api/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingConnId || connForm.id,
          dbType: connForm.type || "Azure SQL", host: connForm.host, port: connForm.port,
          databaseName: connForm.database, username: connForm.username,
          encryptedPassword: connForm.password, authType: connForm.authType
        })
      });
      if (!res.ok) {
        let errorMsg = "Failed to connect to the database.";
        try {
          const bodyText = await res.text();
          try { const errBody = JSON.parse(bodyText); if (errBody.error) errorMsg = errBody.error; }
          catch { if (bodyText) errorMsg = bodyText; }
        } catch {}
        throw new Error(errorMsg);
      }
      if (editingConnId) {
        setTestSuccess(true);
        setTimeout(async () => {
          setTestSuccess(false);
          const updatedConn = { ...connForm } as Connection;
          setConnections(prev => prev.map(c => c.id === editingConnId ? { ...c, ...updatedConn } : c));
          await fetchWithAuth('/api/connections', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: editingConnId, userId, connectionName: updatedConn.name,
              dbType: updatedConn.type || "PostgreSQL", host: updatedConn.host, port: updatedConn.port,
              databaseName: updatedConn.database, username: updatedConn.username, encryptedPassword: updatedConn.password || null,
              authType: updatedConn.authType
            })
          });
          setConnError("");
          setCurrentView('manage_connections');
          addLog("SUCCESS", `Connection ${connForm.name} updated successfully.`);
          toast.success(`Connection ${connForm.name} updated successfully.`);
        }, 1500);
      } else {
        setTestSuccess(true);
        setTimeout(async () => {
          setTestSuccess(false);
          setConnError("");
          const newConnId = crypto.randomUUID();
          const { id: _ignoreId, ...formWithoutId } = connForm;
          const newConn = { ...formWithoutId, id: newConnId, name: connForm.name!.trim() } as Connection;
          setConnections(prev => [...prev, newConn]);
          await fetchWithAuth('/api/connections', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: newConnId, userId, connectionName: newConn.name,
              dbType: newConn.type || "PostgreSQL", host: newConn.host, port: newConn.port,
              databaseName: newConn.database, username: newConn.username, encryptedPassword: newConn.password,
              authType: newConn.authType
            })
          });
          setCurrentView('manage_connections');
          addLog("SUCCESS", `Connected to ${connForm.name!.trim()} successfully.`);
          toast.success(`Connected to ${connForm.name!.trim()} successfully.`);
        }, 1500);
      }
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setConnError(msg);
      addLog("ERROR", "Connection test failed: " + msg);
      toast.error(msg);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleMsalLogin = async () => {
    try {
      const loginResponse = await instance.loginPopup({
        scopes: ["https://database.windows.net//user_impersonation"]
      });
      if (loginResponse && loginResponse.accessToken) {
        setConnForm(prev => ({
          ...prev,
          username: loginResponse.account?.username || 'Azure AD User',
          password: loginResponse.accessToken,
          authType: 'AzureADToken'
        }));
        addLog("INFO", "Microsoft Entra ID token acquired via MSAL.");
      }
    } catch (err: unknown) {
      logger.error("MSAL login failed", { error: getErrorMessage(err) });
      setConnError("Microsoft login failed: " + getErrorMessage(err));
    }
  };

  const handleOnboardingComplete = async (orgData: { name: string; industry: string }) => {
    try {
      const res = await fetchWithAuth('/api/organizations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgData)
      });
      if (res.ok) {
        const data = await res.json();
        const newOrg = { id: data.id, ...orgData };
        setOrganizations(prev => [...prev, newOrg]);
        setOrganization(newOrg);
        setIsAddingWorkspace(false);
        toast.success("Workspace created successfully!");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to create workspace.");
      }
    } catch {
      toast.error("Error creating workspace.");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!organization) return;
    if (!confirm("Are you sure you want to delete this workspace? This cannot be undone.")) return;
    try {
      const res = await fetchWithAuth(`/api/organizations/${organization.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Workspace deleted successfully.");
        setOrganizations(prev => {
          const nextOrgs = prev.filter(o => o.id !== organization.id);
          setOrganization(nextOrgs[0] || null);
          return nextOrgs;
        });
      } else {
        toast.error("Failed to delete workspace.");
      }
    } catch {
      toast.error("Error deleting workspace.");
    }
  };

  const handleLogout = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure you want to delete all your data and chat history? This action cannot be undone.")) {
      try {
        toast.promise(
          fetchWithAuth("/api/users/me", { method: "DELETE" }).then(res => {
            if (!res.ok) throw new Error("Failed to delete account");
            return res;
          }),
          {
            loading: 'Deleting account data...',
            success: () => { setTimeout(() => handleLogout(), 1500); return 'Account data deleted. Signing out...'; },
            error: 'Failed to delete account data.'
          }
        );
      } catch (err: unknown) {
        toast.error("Error initiating deletion: " + getErrorMessage(err));
      }
    }
  };

  const openChat = (chatId: string) => {
    if (!openTabs.find(t => t.id === chatId)) {
      const chat = chatSessions.find(c => c.id === chatId);
      if (chat) {
        setOpenTabs(prev => [...prev, { type: 'chat', id: chat.id, title: chat.title, connectionId: chat.connectionId }]);
      }
    }
    setCurrentView(chatId);
  };

  return {
    // State
    connections, setConnections,
    chatSessions, setChatSessions,
    openTabs, setOpenTabs,
    currentView, setCurrentView,
    isSidebarOpen, setIsSidebarOpen,
    expandedConns, setExpandedConns,
    editingConnId, setEditingConnId,
    connForm, setConnForm,
    connError, setConnError,
    isTestingConnection, testSuccess,
    isProfileMenuOpen, setIsProfileMenuOpen,
    isInsightPanelOpen, setIsInsightPanelOpen,
    selectedMessageForPanel, setSelectedMessageForPanel,
    organizations, setOrganizations,
    organization, setOrganization,
    isLoadingOrg, isAddingWorkspace, setIsAddingWorkspace,
    activeChatSession, messages, setMessages,
    input, setInput, isTyping,
    terminalLogs, activeTabs, setActiveTabs,
    historyData, setHistoryData,
    messagesEndRef, terminalEndRef,
    userId, userName, userEmail, userInitial,

    // Handlers
    handleSubmit, handleApproval, handleCopySQL,
    handleSaveConnection, handleMsalLogin,
    handleOnboardingComplete, handleDeleteWorkspace,
    handleLogout, handleDeleteAccount,
    openChat, addLog, fetchWithAuth,
  };
}

export type ChatEngine = ReturnType<typeof useChatEngine>;
