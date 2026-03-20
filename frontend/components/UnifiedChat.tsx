"use client";

import { useEffect, useState, useRef } from "react";
import { useMsal } from "@azure/msal-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import "./UnifiedChat.css";

type ProgressEvent = { label: string; status: string; time: string };

type Message = {
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

type LogEntry = {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR" | "DEBUG" | "READY";
  message: string;
};

type Connection = { id: string; name: string; host?: string; port?: string; database?: string; username?: string; password?: string; type?: string; authType?: string; };
type ChatSession = { id: string; connectionId: string; title: string; messages: Message[] };
type DashboardTab = { type: 'chat' | 'ide'; id: string; title: string; connectionId?: string; sql?: string };

export function UnifiedChat() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [openTabs, setOpenTabs] = useState<DashboardTab[]>([]);

  // Hydration fix: load from localStorage after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConns = localStorage.getItem('qp_connections');
      if (savedConns) try { setConnections(JSON.parse(savedConns)); } catch {}
      
      const savedChats = localStorage.getItem('qp_chatSessions');
      if (savedChats) try { setChatSessions(JSON.parse(savedChats)); } catch {}
      
      const savedTabs = localStorage.getItem('qp_openTabs');
      if (savedTabs) try { setOpenTabs(JSON.parse(savedTabs)); } catch {}
    }
  }, []);

  const [isInsightPanelOpen, setIsInsightPanelOpen] = useState(false);
  const [selectedMessageForPanel, setSelectedMessageForPanel] = useState<Message | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  type ViewState = 'welcome' | 'integrations' | 'connect_postgres' | 'manage_connections' | string;
  const [currentView, setCurrentView] = useState<ViewState>('welcome');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedConns, setExpandedConns] = useState<Record<string, boolean>>({});
  
  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [connForm, setConnForm] = useState<Partial<Connection>>({ name: "My Postgres Database", host: "db.mypostgres.com", port: "5432", database: "analytics_db", username: "postgres_admin", password: "", type: "PostgreSQL" });
  const [connError, setConnError] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const { instance } = useMsal();
  
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
    } catch (err: any) {
      console.error(err);
      setConnError("Microsoft login failed: " + err.message);
    }
  };
  
  const activeChatSession = chatSessions.find(c => c.id === currentView) || null;
  const messages = activeChatSession?.messages || [];

  const [activePoll, setActivePoll] = useState<string | null>(null);

  // Compatibility wrapper for dynamic multi-chat support
  const setMessages = (updater: Message[] | ((prev: Message[]) => Message[])) => {
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
  };

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([]);
  const [activeTabs, setActiveTabs] = useState<Record<string, 'query' | 'insight' | 'results'>>({});
  const [historyData, setHistoryData] = useState<any[]>([]);;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTerminalLogs([
      { id: "1", timestamp: new Date().toISOString(), level: "INFO", message: "System initializing..." },
      { id: "2", timestamp: new Date().toISOString(), level: "SUCCESS", message: "Dashboard UI ready." }
    ]);
  }, []);

  // localStorage persistence (skipped on initial empty render)
  useEffect(() => { if (connections.length > 0) localStorage.setItem('qp_connections', JSON.stringify(connections)); }, [connections]);
  useEffect(() => { if (chatSessions.length > 0) localStorage.setItem('qp_chatSessions', JSON.stringify(chatSessions)); }, [chatSessions]);
  useEffect(() => { if (openTabs.length > 0) localStorage.setItem('qp_openTabs', JSON.stringify(openTabs)); }, [openTabs]);

  const addLog = (level: LogEntry["level"], msg: string) => {
    setTerminalLogs((prev) => [
      ...prev,
      { id: Math.random().toString(), timestamp: new Date().toISOString(), level, message: msg },
    ]);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (!activePoll) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/query/" + activePoll);
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
                        msg.progressEvents.push({ 
                            label: data.customStatus.Label, 
                            status: data.customStatus.Status, 
                            time: timeNow 
                        });
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
        } 
        else if (data.customStatus?.Status === "PendingApproval") {
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
      } catch (err) {
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activePoll]);

  const handleSubmit = async () => {
    if (!input.trim() || !activeChatSession) return;

    const userMsg: Message = { id: Math.random().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    addLog("INFO", "Received user query: " + userMsg.content);

    const activeConnection = connections.find(c => c.id === activeChatSession.connectionId);
    
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsg.content,
          userId: "user@agent.com",
          role: "FraudAnalyst",
          correlationId: crypto.randomUUID(),
          sessionId: activeChatSession.id,
          connectionId: activeConnection?.id,
          connection: activeConnection ? {
            type: activeConnection.type || "PostgreSQL",
            host: activeConnection.host,
            port: activeConnection.port,
            database: activeConnection.database,
            username: activeConnection.username,
            password: activeConnection.password
          } : undefined
        }),
      });

      if (!response.ok) {
          const errRes = await response.json();
          setIsTyping(false);
          addLog("ERROR", "API rejection: " + errRes.error);
          setMessages((prev) => [...prev, { id: Math.random().toString(), role: "ai", status: "Blocked", content: "Lo siento, la consulta fue bloqueada por filtros de seguridad cognitivos."}]);
          return;
      }

      const body = await response.json();
      addLog("DEBUG", "Orchestration started: " + body.instanceId);
      
      const aiMsg: Message = { id: Math.random().toString(), role: "ai", instanceId: body.instanceId, status: "Running", content: "Analizando solicitud..." };
      setMessages((prev) => [...prev, aiMsg]);
      setActivePoll(body.instanceId);
    } catch (e: any) {
      setIsTyping(false);
      addLog("ERROR", e.message);
    }
  };

  const handleApproval = async (msg: Message, decision: 'Approved' | 'Rejected', comments?: string) => {
    if (!msg.instanceId) return;
    try {
      addLog("INFO", `Sending ${decision} for ${msg.instanceId}`);
      const res = await fetch(`/api/query/${msg.instanceId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, approverUserId: "user@agent.com", comments: comments || "" }),
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
    } catch (e: any) {
      addLog("ERROR", "Approval error: " + e.message);
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
        const res = await fetch("/api/test-connection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: connForm.type || "Azure SQL",
                host: connForm.host,
                port: connForm.port,
                database: connForm.database,
                username: connForm.username,
                password: connForm.password,
                authType: connForm.authType
            })
        });

        if (!res.ok) {
            let errorMsg = "Failed to connect to the database.";
            try {
                const errBody = await res.json();
                if (errBody.error) errorMsg = errBody.error;
            } catch (jsonErr) {
                // If the response is empty or not JSON (e.g. 404 or 500 from proxy), just use text
                const textBody = await res.text();
                if (textBody) errorMsg = textBody;
            }
            throw new Error(errorMsg);
        }

        if (editingConnId) {
            setTestSuccess(true);
            setTimeout(async () => {
                setTestSuccess(false);
                const updatedConn = { ...connForm } as Connection;
                setConnections(prev => prev.map(c => c.id === editingConnId ? { ...c, ...updatedConn } : c));
                
                await fetch('/api/connections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                       id: editingConnId, 
                       userId: "user@agent.com", 
                       connectionName: updatedConn.name,
                       dbType: updatedConn.type || "PostgreSQL",
                       host: updatedConn.host,
                       port: updatedConn.port,
                       databaseName: updatedConn.database,
                       username: updatedConn.username,
                       encryptedPassword: updatedConn.password
                    })
                });

                setConnError("");
                setCurrentView('manage_connections');
                addLog("SUCCESS", `Connection ${connForm.name} updated successfully.`);
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

                await fetch('/api/connections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                       id: newConnId, 
                       userId: "user@agent.com", 
                       connectionName: newConn.name,
                       dbType: newConn.type || "PostgreSQL",
                       host: newConn.host,
                       port: newConn.port,
                       databaseName: newConn.database,
                       username: newConn.username,
                       encryptedPassword: newConn.password
                    })
                });

                setCurrentView('manage_connections');
                addLog("SUCCESS", `Connected to ${connForm.name!.trim()} successfully.`);
            }, 1500);
        }
    } catch (e: any) {
        setConnError(e.message);
        addLog("ERROR", "Connection test failed: " + e.message);
    } finally {
        setIsTestingConnection(false);
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

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] font-sans antialiased selection:bg-zinc-900 selection:text-white">
      
      {/* Sidebar - Clean Light Minimalist */}
      <aside className={`bg-[var(--bg)] border-r border-zinc-200 flex flex-col justify-between shrink-0 relative z-20 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}>
        <div className="flex flex-col h-full">
          {/* Workspace Switcher */}
          <button type="button" className="py-5 px-6 flex items-center justify-between group cursor-pointer border-b border-zinc-200/50">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded bg-black flex items-center justify-center shadow-sm">
                 <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className="text-[13px] font-medium tracking-wide text-zinc-900 transition-colors">Jessy's workspace</span>
            </div>
            <span className="material-symbols-outlined text-sm text-zinc-400 group-hover:text-zinc-900 transition-colors">unfold_more</span>
          </button>
          
          {/* Navigation Links & Connections */}
          <div className="flex-1 overflow-y-auto w-full">
            <div className="px-4 py-4 space-y-1 border-b border-zinc-200/50">
              <button 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${currentView === 'welcome' || currentView === 'integrations' || currentView === 'connect_postgres' ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}`}
                onClick={() => setCurrentView('welcome')}
              >
                <span className="material-symbols-outlined text-[24px]">grid_view</span>
                Data Sources
              </button>
              <button 
                onClick={() => setCurrentView('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${currentView === 'settings' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                <span className="material-symbols-outlined text-[24px]">tune</span>
                Workspace Settings
              </button>
              <button 
                onClick={async () => { setCurrentView('history'); try { const r = await fetch('/api/history'); if(r.ok) { const d = await r.json(); setHistoryData(d); } } catch {} }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${currentView === 'history' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                <span className="material-symbols-outlined text-[24px]">history</span>
                History
              </button>
            </div>
            
            <div className="px-4 py-4">
               <div className="flex items-center justify-between px-3 text-[11px] uppercase tracking-widest text-zinc-400 font-bold mb-3">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[24px]">database</span>
                    Connections
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => setCurrentView('manage_connections')} className="hover:text-zinc-900 transition-colors" title="Manage Connections">
                      <span className="material-symbols-outlined text-[16px]">settings</span>
                    </button>
                    <button onClick={() => { setEditingConnId(null); setConnForm({ name: "New Connection", host: "", port: "5432", database: "", username: "", password: "", type: "PostgreSQL" }); setCurrentView('integrations'); }} className="hover:text-zinc-900 transition-colors" title="New Connection">
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
               </div>
               
               <div className="space-y-3">
                  {connections.map(conn => {
                     const chats = chatSessions.filter(c => c.connectionId === conn.id);
                     const isConnActive = chats.some(c => c.id === currentView) || openTabs.some(t => t.connectionId === conn.id && t.id === currentView);
                     const isExpanded = expandedConns[conn.id] !== false; // default to true
                     
                     return (
                        <div key={conn.id} className="space-y-1">
                           <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors group ${isConnActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-50'}`}>
                               <button 
                                  onClick={() => setExpandedConns(prev => ({ ...prev, [conn.id]: prev[conn.id] === false ? true : false }))}
                                  className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors shrink-0"
                               >
                                  <span className="material-symbols-outlined text-[16px] transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>chevron_right</span>
                               </button>
                               <button 
                                  onClick={() => {
                                     if (chats.length === 0) {
                                         const newChatId = crypto.randomUUID();
                                         fetch('/api/sessions', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ id: newChatId, userId: "user@agent.com", connectionId: conn.id, title: "New Chat" })
                                         });
                                         setChatSessions(prev => [...prev, { id: newChatId, connectionId: conn.id, title: 'New Chat', messages: [] }]);
                                         setOpenTabs(prev => { 
                                             if (!prev.find(t => t.id === newChatId)) {
                                                 return [...prev, { type: 'chat', id: newChatId, title: 'New Chat', connectionId: conn.id }];
                                             }
                                             return prev;
                                         });
                                         setCurrentView(newChatId);
                                     } else {
                                         openChat(chats[chats.length - 1].id);
                                     }
                                  }}
                                  className="flex flex-1 items-center gap-3 truncate text-left h-full py-1 ml-1"
                               >
                                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                     {conn.type === 'Azure SQL' && <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-4 h-4 object-contain" alt="Azure" />}
                                     {conn.type === 'PostgreSQL' && <img src="/assets/iconos sql/DeviconPostgresqlWordmark.svg" className="w-4 h-4 object-contain" alt="Postgres" />}
                                     {conn.type === 'MySQL' && <img src="/assets/iconos sql/LogosMysql.svg" className="w-4 h-4 object-contain" alt="MySQL" />}
                                     {(!conn.type || !['Azure SQL', 'PostgreSQL', 'MySQL'].includes(conn.type)) && (
                                        <div className={`w-1.5 h-1.5 rounded-full ${isConnActive ? 'bg-emerald-500' : 'bg-zinc-400'}`}></div>
                                     )}
                                  </div>
                                  <span className="truncate">{conn.name}</span>
                               </button>
                               <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      const newChatId = crypto.randomUUID();
                                      fetch('/api/sessions', {
                                         method: 'POST',
                                         headers: { 'Content-Type': 'application/json' },
                                         body: JSON.stringify({ id: newChatId, userId: "user@agent.com", connectionId: conn.id, title: "New Chat" })
                                      });
                                      setChatSessions(prev => [...prev, { id: newChatId, connectionId: conn.id, title: 'New Chat', messages: [] }]);
                                      setOpenTabs(prev => [...prev, { type: 'chat', id: newChatId, title: 'New Chat', connectionId: conn.id }]);
                                      setCurrentView(newChatId);
                                      setExpandedConns(prev => ({ ...prev, [conn.id]: true })); // Expand on new chat
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-200 rounded text-zinc-500 hover:text-zinc-900 transition-all shrink-0 ml-1" 
                                  title="New Chat">
                                   <span className="material-symbols-outlined text-[16px]">add</span>
                                </button>
                                <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Are you sure you want to delete ${conn.name}?`)) {
                                          setConnections(prev => prev.filter(c => c.id !== conn.id));
                                          setChatSessions(prev => prev.filter(c => c.connectionId !== conn.id));
                                          setOpenTabs(prev => prev.filter(t => t.connectionId !== conn.id));
                                          if (currentView === conn.id) setCurrentView('welcome');
                                          addLog("SUCCESS", `Connection ${conn.name} removed.`);
                                      }
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded text-zinc-400 hover:text-red-500 transition-all shrink-0 ml-1" 
                                  title="Delete Connection">
                                   <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                           </div>
                           {isExpanded && chats.length > 0 && (
                              <div className="pl-6 pr-2 space-y-0.5">
                                 {chats.map(chat => (
                                    <div key={chat.id} className="group flex items-center pr-1">
                                       <button 
                                          onClick={() => openChat(chat.id)}
                                          className={`flex-1 text-left truncate px-3 py-1.5 rounded-md text-[13px] transition-colors ${currentView === chat.id ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
                                       >
                                          {chat.title}
                                       </button>
                                       <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              setChatSessions(prev => prev.filter(c => c.id !== chat.id));
                                              setOpenTabs(prev => {
                                                  const newTabs = prev.filter(t => t.id !== chat.id);
                                                  if (currentView === chat.id) {
                                                      setCurrentView(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : 'welcome');
                                                  }
                                                  return newTabs;
                                              });
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-400 hover:text-red-600 rounded transition-all shrink-0 ml-1"
                                          title="Delete Chat"
                                       >
                                          <span className="material-symbols-outlined text-[14px]">delete</span>
                                       </button>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     );
                  })}
               </div>
            </div>
          </div>
        </div>
        
        {/* Bottom actions removed based on user request */}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[var(--surface)]">
        
        {/* Subtle Background Grid (Personality) */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 opacity-[0.3]" 
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1.2 1.2 A 1.2 1.2 0 1 1 1.2 1.1\' fill=\'%2371717a\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Top bar with sleek tabs */}
        <div className="h-14 border-b border-zinc-200 flex items-center px-6 gap-6 shrink-0 bg-[var(--surface)] z-10 sticky top-0">
            <button 
                onClick={() => setIsSidebarOpen(prev => !prev)}
                className="text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-100 -ml-2 mr-2"
                title="Toggle Sidebar"
            >
                <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            {currentView === 'welcome' && (
              <div className="text-[13px] font-medium flex items-center gap-2 h-full text-zinc-900 relative">
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                Data Sources
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-900 rounded-t-full"></div>
              </div>
            )}
            {currentView === 'integrations' && (
              <div className="text-[13px] font-medium flex items-center gap-2 h-full text-zinc-900 relative">
                <span className="material-symbols-outlined text-[16px]">grid_view</span>
                Integrations
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-900 rounded-t-full"></div>
              </div>
            )}
            {currentView === 'connect_postgres' && (
              <div className="text-[13px] font-medium flex items-center gap-2 h-full text-zinc-900 relative">
                <span className="material-symbols-outlined text-[16px]">database</span>
                {editingConnId ? 'Edit Connection' : 'Connect PostgreSQL'}
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-900 rounded-t-full"></div>
              </div>
            )}
            {currentView === 'manage_connections' && (
              <div className="text-[13px] font-medium flex items-center gap-2 h-full text-zinc-900 relative">
                <span className="material-symbols-outlined text-[16px]">settings_input_component</span>
                Manage Connections
                <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-900 rounded-t-full"></div>
              </div>
            )}

            
            {openTabs.map((tab) => (
               <div key={tab.id} className="flex items-center h-full relative group shrink-0">
                  <button
                    type="button"
                    className={`text-[13px] font-medium flex items-center gap-2 h-full transition-colors pl-4 pr-1 ${currentView === tab.id ? 'text-zinc-900' : 'text-zinc-600 hover:text-zinc-900'}`}
                    onClick={() => setCurrentView(tab.id)}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                       {tab.type === 'chat' ? 'chat_bubble' : 'terminal'}
                    </span>
                    <span className="truncate max-w-[120px]">{tab.title}</span>
                    {currentView === tab.id && <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-900 rounded-t-full"></div>}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenTabs(prev => {
                          const newTabs = prev.filter(t => t.id !== tab.id);
                          if (currentView === tab.id) {
                              setCurrentView(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : 'welcome');
                          }
                          return newTabs;
                      });
                    }}
                    className="ml-1 mr-4 w-5 h-5 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 opacity-0 group-hover:opacity-100 transition-all">
                      <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
               </div>
            ))}

            <button onClick={() => setCurrentView('welcome')} className="text-zinc-300 hover:text-zinc-600 flex items-center transition-colors">
              <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
            
            <div className="ml-auto flex items-center gap-4 relative">
                <button className="text-zinc-600 hover:text-zinc-900 transition-colors flex items-center"><span className="material-symbols-outlined text-[18px]">notifications</span></button>
                <button 
                  onClick={() => setIsProfileMenuOpen(prev => !prev)}
                  className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-[12px] font-medium text-white shadow-inner hover:ring-2 hover:ring-zinc-200 transition-all focus:outline-none"
                >
                  J
                </button>

                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                    <div className="absolute top-12 right-0 w-[240px] bg-white rounded-2xl shadow-xl border border-zinc-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                       <div className="px-4 py-3 border-b border-zinc-100 flex flex-col items-start">
                          <p className="text-[14px] font-semibold text-zinc-900">Jessy</p>
                          <p className="text-[12px] text-zinc-500 truncate w-full">quintojessy@gmail.com</p>
                       </div>
                       <div className="py-1">
                          <button onClick={() => setIsProfileMenuOpen(false)} className="w-full text-left px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-3">
                             <span className="material-symbols-outlined text-[18px]">help</span> Help and Support
                          </button>
                          <button onClick={() => setIsProfileMenuOpen(false)} className="w-full text-left px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-3">
                             <span className="material-symbols-outlined text-[18px]">menu_book</span> Docs
                          </button>
                       </div>
                       <div className="border-t border-zinc-100 py-1">
                          <button 
                            onClick={() => {
                               setIsProfileMenuOpen(false);
                               window.location.href = '/login';
                            }}
                            className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                          >
                             <span className="material-symbols-outlined text-[18px]">logout</span> Logout
                          </button>
                       </div>
                    </div>
                  </>
                )}
            </div>
        </div>

        {/* Dynamic View Content */}
        <div className="flex-1 overflow-y-auto w-full relative scroll-smooth">
          
          {/* VIEW: WELCOME */}
          {currentView === 'welcome' && (
            <div className="h-full flex flex-col items-center justify-center max-w-[600px] mx-auto space-y-12 pb-20">
              <div className="text-center space-y-3">
                <h2 className="text-xl text-zinc-500 tracking-tight font-medium">Hello Jessy</h2>
                <h1 className="text-4xl font-semibold text-zinc-900 tracking-tight">Let's get you started.</h1>
              </div>
              
              <div className="w-full space-y-4">
                <button 
                  onClick={() => setCurrentView('integrations')}
                  className="w-full text-left bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shadow-inner group-hover:bg-zinc-100 transition-colors">
                      <span className="material-symbols-outlined text-[24px] text-zinc-700">database</span>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium text-zinc-900 mb-1">Connect Your Data Source</h3>
                      <p className="text-[13px] text-zinc-500 font-medium">Start asking questions and create charts from your data seamlessly.</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-900 transition-colors border border-zinc-200 group-hover:border-zinc-900">
                    <span className="material-symbols-outlined text-[18px] text-zinc-400 group-hover:text-white">arrow_forward</span>
                  </div>
                </button>

                <button className="w-full text-left bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 flex items-center justify-between transition-colors group">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shadow-inner group-hover:bg-zinc-100 transition-colors">
                      <span className="material-symbols-outlined text-[24px] text-zinc-700">menu_book</span>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium text-zinc-900 mb-1">Read Our Integration Docs</h3>
                      <p className="text-[13px] text-zinc-500 font-medium">Learn how to connect your data source with our robust API guides.</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-900 transition-colors border border-zinc-200 group-hover:border-zinc-900">
                    <span className="material-symbols-outlined text-[18px] text-zinc-400 group-hover:text-white">arrow_forward</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* VIEW: INTEGRATIONS */}
          {currentView === 'integrations' && (
            <div className="py-16 px-10 max-w-5xl mx-auto">
              <div className="space-y-2 mb-10 text-center md:text-left">
                <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Add New Integration</h1>
                <p className="text-[14px] text-zinc-500 font-medium">Connect your databases to start querying securely.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Azure SQL', icon: '/assets/iconos sql/DeviconAzuresqldatabase.svg' },
                  { name: 'PostgreSQL', icon: '/assets/iconos sql/DeviconPostgresqlWordmark.svg' },
                  { name: 'MySQL', icon: '/assets/iconos sql/LogosMysql.svg' },
                  { name: 'MariaDB', icon: '/assets/iconos sql/LogosMariadb.svg' },
                  { name: 'SQLite', icon: '/assets/iconos sql/LogosSqlite.svg' },
                  { name: 'Oracle', icon: '/assets/iconos sql/DeviconOracle.svg' },
                  { name: 'TursoDB', icon: 'database' },
                  { name: 'Cloudflare D1', icon: 'database' },
                  { name: 'ClickHouse', icon: 'database' },
                  { name: 'MotherDuck', icon: 'database' },
                  { name: 'GraphQL APIs', icon: 'database' },
                  { name: 'BigQuery', icon: 'database' }
                ].map((item, i) => (
                  <button 
                    key={item.name}
                    onClick={() => {
                        if (item.name === 'Azure SQL') {
                            setEditingConnId(null);
                            setConnForm({ name: "", host: "", port: "", database: "", username: "", password: "", type: "Azure SQL", authType: 'SQL' });
                            setCurrentView('connect_azuresql');
                        } else if (item.name === 'PostgreSQL') {
                            setEditingConnId(null);
                            setConnForm({ name: "My Postgres Database", host: "db.mypostgres.com", port: "5432", database: "analytics_db", username: "postgres_admin", password: "", type: "PostgreSQL" });
                            setCurrentView('connect_postgres');
                        }
                    }}
                    className={`bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 flex items-center gap-4 transition-colors group ${item.name !== 'Azure SQL' && 'opacity-50 cursor-not-allowed hover:border-zinc-200'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform ${item.name === 'Azure SQL' ? 'bg-zinc-50 group-hover:bg-zinc-100 group-hover:scale-105' : 'bg-zinc-50'}`}>
                       {item.icon.includes('.svg') ? (
                          <img src={item.icon} className="w-6 h-6 object-contain" alt={item.name} />
                       ) : (
                          <span className={`material-symbols-outlined text-[20px] ${item.name === 'Azure SQL' ? 'text-zinc-900' : 'text-zinc-500'}`}>database</span>
                       )}
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <span className={`text-[14px] font-medium ${item.name === 'Azure SQL' ? 'text-zinc-900' : 'text-zinc-700'}`}>{item.name}</span>
                      {item.name !== 'Azure SQL' && <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Coming Soon</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: CONNECT AZURE SQL */}
          {currentView === 'connect_azuresql' && (
            <div className="flex h-full">
               <div className="flex-1 flex justify-center py-12 px-8 overflow-y-auto">
                  <div className="w-full max-w-[480px]">
                     
                     <button onClick={() => setCurrentView('integrations')} className="flex items-center gap-2 text-[13px] text-zinc-500 hover:text-zinc-900 font-medium mb-8 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Integrations
                     </button>

                      <div className="flex items-center gap-4 mb-8">
                        <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-10 h-10" alt="Azure SQL" />
                        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 leading-tight">Connect Azure SQL</h2>
                      </div>
                     
                     <div className="space-y-6 bg-white border border-zinc-200 p-8 rounded-3xl">
                         {connError && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[13px] font-medium border border-red-100 flex items-center gap-2">
                               <span className="material-symbols-outlined text-[16px]">error</span>
                               {connError}
                            </div>
                         )}
                         {testSuccess && (
                            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[14px] font-medium border border-emerald-200 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                               <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[20px]">check</span>
                               </div>
                               Connection verified! Redirecting...
                            </div>
                         )}
                         
                         <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">Display Name*</label>
                            <input 
                              type="text" 
                              value={connForm.name || ""}
                              onChange={(e) => setConnForm(prev => ({ ...prev, name: e.target.value, type: "Azure SQL" }))}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-[13px] text-black focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-colors font-mono" 
                            />
                         </div>

                         {[
                          { label: "Server Address (URL)*", key: "host", type: "text" },
                          { label: "Database Name*", key: "database", type: "text" }
                        ].map((field, i) => (
                           <div key={i} className="space-y-1.5">
                              <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">{field.label}</label>
                              <input 
                                type={field.type}
                                value={(connForm as any)[field.key] || ""}
                                onChange={(e) => setConnForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-[13px] text-black focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-colors font-mono" 
                              />
                           </div>
                        ))}

                        {connForm.type === 'Azure SQL' && (
                           <div className="space-y-3 pt-2">
                              <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">Authentication Method</label>
                              <div className="grid grid-cols-2 gap-3">
                                 <button 
                                   onClick={() => setConnForm(prev => ({ ...prev, authType: 'SQL' }))}
                                   className={`flex items-center gap-2 p-3 border rounded-xl text-[13px] font-medium transition-colors ${connForm.authType !== 'AzureAD' ? 'border-zinc-900 bg-zinc-50 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'}`}>
                                   <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${connForm.authType !== 'AzureAD' ? 'border-zinc-900' : 'border-zinc-300'}`}>
                                      {connForm.authType !== 'AzureAD' && <div className="w-2 h-2 rounded-full bg-zinc-900"></div>}
                                   </div>
                                   SQL Authentication
                                 </button>
                                 <button 
                                   onClick={() => setConnForm(prev => ({ ...prev, authType: 'AzureAD' }))}
                                   className={`flex items-center gap-2 p-3 border rounded-xl text-[13px] font-medium transition-colors text-left leading-tight ${connForm.authType === 'AzureAD' ? 'border-zinc-900 bg-zinc-50 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'}`}>
                                   <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${connForm.authType === 'AzureAD' ? 'border-zinc-900' : 'border-zinc-300'}`}>
                                      {connForm.authType === 'AzureAD' && <div className="w-2 h-2 rounded-full bg-zinc-900"></div>}
                                   </div>
                                   Microsoft Entra ID
                                 </button>
                              </div>
                           </div>
                        )}

                        {connForm.authType === 'AzureADToken' && (
                           <div className="pt-2">
                             <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                   <span className="material-symbols-outlined text-[18px]">lock_open</span>
                                 </div>
                                 <div>
                                   <div className="text-[13px] font-bold">Successfully authenticated</div>
                                   <div className="text-[12px] opacity-80">{connForm.username}</div>
                                 </div>
                               </div>
                               <button onClick={() => setConnForm(prev => ({ ...prev, authType: 'AzureAD', username: '', password: '' }))} className="text-[12px] font-semibold underline hover:text-emerald-900 transition-colors">
                                 Sign out
                               </button>
                             </div>
                           </div>
                        )}

                        {connForm.authType === 'AzureAD' && (
                           <div className="pt-2">
                              <button 
                                onClick={handleMsalLogin}
                                className="w-full bg-[#2F2F2F] hover:bg-[#1f1f1f] text-white border border-[#2F2F2F] rounded-xl px-4 py-3.5 text-[14px] font-semibold transition-colors flex items-center justify-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 21 21"><path fill="#f35325" d="M1 1h9v9H1z"/><path fill="#81bc06" d="M11 1h9v9h-9z"/><path fill="#05a6f0" d="M1 11h9v9H1z"/><path fill="#ffba08" d="M11 11h9v9h-9z"/></svg>
                                Sign in with Microsoft
                              </button>
                           </div>
                        )}

                        {(!connForm.authType || connForm.authType === 'SQL') && [
                          { label: "Username*", key: "username", type: "text" },
                          { label: "Password*", key: "password", type: "password" }
                        ].map((field, i) => (
                           <div key={i + 10} className="space-y-1.5 pt-2">
                              <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">{field.label}</label>
                              <input 
                                type={field.type}
                                value={(connForm as any)[field.key] || ""}
                                onChange={(e) => setConnForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-[13px] text-black focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-colors font-mono" 
                              />
                           </div>
                        ))}
                        
                        <div className="pt-4 flex gap-4">
                          {editingConnId && (
                            <button 
                              onClick={() => setCurrentView('manage_connections')}
                              className="w-1/3 bg-white border border-zinc-200 text-zinc-700 font-medium rounded-xl py-3.5 text-[14px] hover:bg-zinc-50 transition-colors flex justify-center items-center">
                                Cancel
                            </button>
                          )}
                          <button 
                            onClick={handleSaveConnection}
                            disabled={isTestingConnection}
                            className={`bg-zinc-900 text-white font-medium rounded-xl py-3.5 text-[14px] hover:bg-zinc-800 transition-colors flex justify-center items-center gap-2 disabled:bg-zinc-400 disabled:cursor-not-allowed ${editingConnId ? 'w-2/3' : 'w-full'}`}>
                              {isTestingConnection ? (
                                <>
                                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                  Testing...
                                </>
                              ) : testSuccess ? (
                                <>
                                  <span className="material-symbols-outlined text-[18px]">verified</span>
                                  Success!
                                </>
                              ) : (
                                <>
                                  {editingConnId ? 'Save Changes' : 'Test and Save Connection'} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </>
                              )}
                          </button>
                        </div>
                     </div>
                  </div>
               </div>
               
               {/* Right documentation panel */}
               <div className="w-[320px] bg-zinc-50/50 border-l border-zinc-200 p-10 hidden xl:flex flex-col">
                  <h3 className="text-[15px] font-semibold text-zinc-900 mb-8">Need help?</h3>
                  <div className="space-y-10">
                     <div className="space-y-4">
                       <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Documentation</div>
                       <a className="flex items-center gap-3 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors" href="https://learn.microsoft.com/en-us/azure/azure-sql/database/connect-query-portal" target="_blank" rel="noopener noreferrer">
                          <img src="/assets/iConos 28_28/LogosMicrosoftIcon.svg" className="w-8 h-8" alt="Microsoft" />
                          Connecting Azure SQL
                        </a>
                     </div>
                     <div className="space-y-4">
                       <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Platform Guides</div>
                       <div className="space-y-2">
                         {[
                           { 
                             name: 'Azure SQL', 
                             url: 'https://learn.microsoft.com/en-us/azure/azure-sql/database/',
                             icon: <img src="/assets/iConos 28_28/MaterialIconThemeAzure.svg" className="w-6 h-6" alt="Azure" />
                           },
                           { 
                             name: 'DigitalOcean', 
                             url: 'https://docs.digitalocean.com/products/databases/',
                             icon: <img src="/assets/iConos 28_28/LogosDigitalOceanIcon.svg" className="w-6 h-6" alt="DigitalOcean" />
                           },
                           { 
                             name: 'Heroku', 
                             url: 'https://devcenter.heroku.com/categories/heroku-postgres',
                             icon: <img src="/assets/iConos 28_28/LogosHerokuIcon.svg" className="w-6 h-6" alt="Heroku" />
                           },
                           { 
                             name: 'Neon', 
                             url: 'https://neon.tech/docs/connect/connect-from-any-app',
                             icon: <img src="/assets/iConos 28_28/LogosNeonIcon.svg" className="w-6 h-6" alt="Neon" />
                           },
                           { 
                             name: 'Supabase', 
                             url: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
                             icon: <img src="/assets/iConos 28_28/DeviconSupabase.svg" className="w-6 h-6" alt="Supabase" />
                           }
                         ].map((plat) => (
                           <a key={plat.name} className="flex items-center gap-3 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors p-2 rounded-lg hover:bg-zinc-900/5 -ml-2" href={plat.url} target="_blank" rel="noopener noreferrer">
                             <div className="w-7 h-7 flex items-center justify-center shrink-0">
                               {plat.icon}
                             </div>
                             {plat.name}
                           </a>
                         ))}
                       </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* VIEW: MANAGE CONNECTIONS */}
          {currentView === 'manage_connections' && (
            <div className="py-16 px-10 max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Manage Connections</h1>
                  <p className="text-[14px] text-zinc-500 font-medium">View, edit, or remove configured database connections.</p>
                </div>
                <button 
                  onClick={() => { setEditingConnId(null); setConnForm({ name: "", host: "", port: "", database: "", username: "", password: "", type: "Azure SQL" }); setCurrentView('connect_azuresql'); }}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 px-5 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span> Add Connection
                </button>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-200 bg-zinc-50 text-[12px] font-semibold text-zinc-500 uppercase tracking-widest">
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-3">Host</div>
                  <div className="col-span-2">Database</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {connections.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-[14px]">No connections found. Add one to get started.</div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {connections.map((conn) => (
                      <div key={conn.id} className="grid grid-cols-12 gap-4 p-4 items-center text-[14px] hover:bg-zinc-50/50 transition-colors text-zinc-700">
                        <div className="col-span-3 font-medium text-zinc-900 truncate">
                          <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
                                   {conn.type === 'Azure SQL' && <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-6 h-6 object-contain" alt="Azure" />}
                                   {(conn.type === 'PostgreSQL' || (!conn.type && !conn.authType)) && <img src="/assets/iconos sql/DeviconPostgresqlWordmark.svg" className="w-6 h-6 object-contain" alt="Postgres" />}
                                   {conn.type === 'MySQL' && <img src="/assets/iconos sql/LogosMysql.svg" className="w-6 h-6 object-contain" alt="MySQL" />}
                                   {conn.type && !['Azure SQL', 'PostgreSQL', 'MySQL'].includes(conn.type) && (
                                      <span className="material-symbols-outlined text-[22px] text-zinc-900">database</span>
                                   )}
                                </div>   {conn.name}
                          </div>
                        </div>
                        <div className="col-span-2">{conn.type || 'PostgreSQL'}</div>
                        <div className="col-span-3 truncate font-mono text-[12px]">{conn.host || 'db.mypostgres.com'}</div>
                        <div className="col-span-2 truncate">{conn.database || 'analytics_db'}</div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button 
                            onClick={() => {
                               const newChatId = 'chat-' + Date.now();
                               setChatSessions(prev => [...prev, { id: newChatId, connectionId: conn.id, title: 'New Chat', messages: [] }]);
                               setOpenTabs(prev => { 
                                   if (!prev.find(t => t.id === newChatId)) {
                                       return [...prev, { type: 'chat', id: newChatId, title: 'New Chat', connectionId: conn.id }];
                                   }
                                   return prev;
                               });
                               setCurrentView(newChatId);
                               setExpandedConns(prev => ({ ...prev, [conn.id]: true }));
                               addLog("SUCCESS", `Connected to ${conn.name}.`);
                            }}
                            className="w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                            title="Connect & Chat"
                          >
                            <span className="material-symbols-outlined text-[16px]">link</span>
                          </button>
                          <button 
                            onClick={() => { 
                               setEditingConnId(conn.id); 
                               setConnForm({ ...conn, type: conn.type || (conn.authType ? 'Azure SQL' : 'PostgreSQL') }); 
                               setCurrentView(conn.authType || conn.type === 'Azure SQL' ? 'connect_azuresql' : 'connect_postgres'); 
                            }}
                            className="w-8 h-8 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 flex items-center justify-center transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button 
                            onClick={() => {
                               if (confirm(`Are you sure you want to delete ${conn.name}?`)) {
                                  setConnections(prev => prev.filter(c => c.id !== conn.id));
                                  setChatSessions(prev => prev.filter(c => c.connectionId !== conn.id));
                                  setOpenTabs(prev => prev.filter(t => t.connectionId !== conn.id));
                                  if (currentView === conn.id) setCurrentView('manage_connections');
                                  addLog("SUCCESS", `Connection ${conn.name} deleted.`);
                               }
                            }}
                            className="w-8 h-8 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 flex items-center justify-center transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {currentView === 'settings' && (
             <div className="flex bg-white h-full text-zinc-900">
                <div className="flex-1 p-10 max-w-4xl mx-auto overflow-y-auto">
                   <div className="mb-8 border-b border-zinc-200 pb-6 text-center">
                      <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Workspace Settings</h1>
                      <p className="text-[14px] text-zinc-500 mt-2">Manage your team workspace and preferences.</p>
                   </div>
                   
                   <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row md:items-center gap-6">
                      <div className="w-16 h-16 rounded-xl bg-purple-600 flex items-center justify-center text-white text-2xl font-medium shadow-sm shrink-0">J</div>
                      <div className="flex-1">
                         <h2 className="text-[18px] font-semibold text-zinc-900">Jessy's workspace</h2>
                         <p className="text-[14px] text-zinc-500 mt-1">1 Members active</p>
                      </div>
                      <button className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors shadow-sm self-start md:self-center">
                         Leave Workspace
                      </button>
                   </div>

                   <div className="space-y-10">
                      <div>
                         <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-2">
                             <div>
                               <h3 className="text-[15px] font-medium text-zinc-900">Workspace Name</h3>
                               <p className="text-[13px] text-zinc-500 mt-1 max-w-md">Change the name of your workspace. This will be visible to all members associated with this workspace.</p>
                             </div>
                             <div className="flex gap-2 w-full md:w-auto">
                                 <input type="text" defaultValue="Jessy's workspace" className="bg-white border border-zinc-200 text-zinc-900 rounded-xl px-4 py-2.5 text-[14px] font-medium w-full md:w-[260px] focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-all shadow-sm" />
                                 <button className="bg-zinc-900 text-white font-medium rounded-xl px-5 text-[13px] hover:bg-zinc-800 transition-colors shadow-sm border border-transparent whitespace-nowrap">Save</button>
                             </div>
                         </div>
                      </div>
                      
                      <div className="border-t border-zinc-200 pt-10">
                         <div className="flex justify-between items-center mb-6">
                             <div>
                               <h3 className="text-[15px] font-medium text-zinc-900">Members</h3>
                               <p className="text-[13px] text-zinc-500 mt-1">Manage users and roles in your workspace</p>
                             </div>
                             <button className="bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 border border-zinc-200 px-4 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-[16px]">person_add</span> Invite Colleague
                             </button>
                         </div>
                         <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                             <div className="flex items-center justify-between p-5 hover:bg-zinc-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                   <div className="relative">
                                     <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 text-[15px] font-bold shadow-sm">J</div>
                                     <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shrink-0">
                                       <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <span className="text-[15px] font-medium text-zinc-900">Jessy (You)</span>
                                      <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500 border border-zinc-200 px-2 py-0.5 rounded-md">Admin</span>
                                   </div>
                                </div>
                                <span className="text-[14px] text-zinc-500 font-medium">quintojessy@gmail.com</span>
                             </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* VIEW: HISTORY */}
          {currentView === 'history' && (
             <div className="flex bg-white h-full text-zinc-900">
                <div className="flex-1 p-8 overflow-y-auto">
                   <div className="mb-6">
                      <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Activity History</h1>
                      <p className="text-[13px] text-zinc-500 mt-1">Audit log of all queries and orchestrations.</p>
                   </div>
                   
                   {historyData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                         <span className="material-symbols-outlined text-[48px] mb-3">history</span>
                         <p className="text-[14px] font-medium">No activity recorded yet</p>
                         <p className="text-[12px] mt-1">Queries and orchestration events will appear here.</p>
                      </div>
                   ) : (
                      <div className="border border-zinc-200 rounded-xl overflow-hidden">
                         <table className="w-full text-[13px]">
                            <thead className="bg-zinc-50 border-b border-zinc-200">
                               <tr>
                                  <th className="text-left px-4 py-3 font-bold text-zinc-600 uppercase tracking-wider text-[10px]">Status</th>
                                  <th className="text-left px-4 py-3 font-bold text-zinc-600 uppercase tracking-wider text-[10px]">Question</th>
                                  <th className="text-left px-4 py-3 font-bold text-zinc-600 uppercase tracking-wider text-[10px]">Intent</th>
                                  <th className="text-left px-4 py-3 font-bold text-zinc-600 uppercase tracking-wider text-[10px]">User</th>
                                  <th className="text-left px-4 py-3 font-bold text-zinc-600 uppercase tracking-wider text-[10px]">Time</th>
                               </tr>
                            </thead>
                            <tbody>
                               {historyData.map((item: any, idx: number) => (
                                  <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'} hover:bg-blue-50/30 transition-colors border-b border-zinc-100`}>
                                     <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                           item.Status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                           item.Status === 'Blocked' || item.Status === 'PolicyBlocked' ? 'bg-red-50 text-red-600 border border-red-200' :
                                           item.Status === 'PendingApproval' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                           'bg-zinc-100 text-zinc-500 border border-zinc-200'
                                        }`}>
                                           {item.Status || 'Unknown'}
                                        </span>
                                     </td>
                                     <td className="px-4 py-3 max-w-[300px] truncate font-medium text-zinc-800">{item.OriginalQuestion || item.Question || '-'}</td>
                                     <td className="px-4 py-3 text-zinc-500">{item.AnalyticalIntent || item.IntentType || '-'}</td>
                                     <td className="px-4 py-3 text-zinc-500 font-mono text-[11px]">{item.UserId || '-'}</td>
                                     <td className="px-4 py-3 text-zinc-400 text-[11px] whitespace-nowrap">{item.CreatedAt ? new Date(item.CreatedAt).toLocaleString() : '-'}</td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   )}
                </div>
             </div>
          )}

          {/* VIEW: CHAT */}
          {openTabs.find(t => t.id === currentView && t.type === 'chat') && (
            <div className="flex flex-col h-full w-full relative">
               
               {messages.length === 0 && (
                 <div className="h-full flex flex-col justify-center items-center w-full px-6 text-center">
                    <div className="w-full max-w-xl space-y-10 mb-16">
                      <div className="space-y-3">
                         <h2 className="text-lg text-zinc-400 font-medium tracking-tight">Welcome, Jessy</h2>
                         <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">What would you like to explore?</h1>
                      </div>
                      
                      <div className="w-full relative rounded-2xl bg-white border border-zinc-200 focus-within:border-zinc-300 focus-within:shadow-md transition-all">
                        <textarea 
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => { 
                              if(e.key === 'Enter' && !e.shiftKey) { 
                                  e.preventDefault(); 
                                  handleSubmit(); 
                              } 
                          }}
                          disabled={isTyping}
                          className="w-full bg-transparent rounded-2xl px-5 py-4 pr-14 text-[15px] text-zinc-900 focus:outline-none resize-none h-28 font-medium placeholder:text-zinc-400"
                          placeholder="Ask a question or create a chart..."
                        ></textarea>
                        <button 
                          onClick={handleSubmit} 
                          disabled={isTyping || !input.trim()}
                          className="absolute right-3 bottom-3 w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center disabled:opacity-20 disabled:bg-zinc-200 disabled:text-zinc-400 transition-all hover:bg-zinc-800 cursor-pointer">
                          <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {[
                          { icon: 'bar_chart', label: 'Chart', prompt: 'Generate a chart showing ' },
                          { icon: 'table_chart', label: 'Table', prompt: 'Show me a table of ' },
                          { icon: 'lightbulb', label: 'Insight', prompt: 'Give me insights about ' },
                          { icon: 'analytics', label: 'Analysis', prompt: 'Analyze the trends in ' }
                        ].map(action => (
                           <button key={action.label} onClick={() => setInput(action.prompt)} className="px-4 py-1.5 rounded-full border border-zinc-200 bg-white text-[12px] font-medium text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 flex items-center gap-1.5 transition-all">
                             <span className="material-symbols-outlined text-[14px]">{action.icon}</span> {action.label}
                           </button>
                        ))}
                      </div>
                    </div>
                 </div>
               )}

               {/* Chat history area */}
               {messages.length > 0 && (
                 <div className="w-full flex-1 overflow-y-auto px-6 md:px-10 lg:px-16 pt-6 pb-28">
                    <div className="w-full space-y-6">
                       {messages.map((msg) => (
                         <div key={msg.id} className="w-full">
                            
                            {msg.role === 'user' && (
                               <div className="flex justify-end w-full">
                                  <div className="bg-zinc-100 rounded-2xl px-5 py-3 text-[14px] text-zinc-900 max-w-[70%] font-medium leading-relaxed">
                                     {msg.content}
                                  </div>
                               </div>
                            )}

                            {msg.role === 'ai' && (
                               <div className="flex gap-3 w-full">
                                  <div className="mt-0.5 shrink-0">
                                    <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center">
                                      <span className="material-symbols-outlined text-[14px] text-white">smart_toy</span>
                                    </div>
                                  </div>
                                  <div className="flex-1 space-y-3 min-w-0">
                                     
                                     {/* Pipeline Stepper */}
                                     {msg.progressEvents && msg.progressEvents.length > 0 && msg.status === 'Running' && (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                           {msg.progressEvents.map((evt, i) => (
                                              <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${evt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : evt.status === 'Active' ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse' : evt.status === 'Failed' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-zinc-50 text-zinc-500 border border-zinc-200'}`}>
                                                 <span className="material-symbols-outlined text-[12px]">{evt.status === 'Completed' ? 'check_circle' : evt.status === 'Active' ? 'pending' : evt.status === 'Failed' ? 'error' : 'radio_button_unchecked'}</span>
                                                 {evt.label}
                                              </div>
                                           ))}
                                        </div>
                                     )}

                                     {/* Completed pipeline summary (collapsed) */}
                                     {msg.progressEvents && msg.progressEvents.length > 0 && msg.status !== 'Running' && (
                                        <details className="group">
                                          <summary className="text-[11px] text-zinc-400 font-medium cursor-pointer hover:text-zinc-600 transition-colors flex items-center gap-1 select-none">
                                            <span className="material-symbols-outlined text-[14px]">timeline</span>
                                            {msg.progressEvents.length} pipeline steps
                                            <span className="material-symbols-outlined text-[12px] group-open:rotate-180 transition-transform">expand_more</span>
                                          </summary>
                                          <div className="flex flex-wrap gap-1.5 mt-2">
                                             {msg.progressEvents.map((evt, i) => (
                                                <div key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${evt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : evt.status === 'Failed' ? 'bg-red-50 text-red-500' : 'bg-zinc-50 text-zinc-400'}`}>
                                                   <span className="material-symbols-outlined text-[10px]">{evt.status === 'Completed' ? 'check' : 'close'}</span>
                                                   {evt.label}
                                                </div>
                                             ))}
                                          </div>
                                        </details>
                                     )}

                                     {msg.content && msg.status !== 'Running' && (
                                        <div className="text-[14px] text-zinc-700 leading-relaxed font-medium mt-0.5">
                                           {msg.content}
                                        </div>
                                     )}

                                     {msg.status === 'Running' && msg.content && (
                                        <div className="text-[13px] text-zinc-500 leading-relaxed font-semibold mt-0.5">
                                           {msg.content}
                                        </div>
                                     )}

                                     {/* PendingApproval inline */}
                                     {msg.status === 'PendingApproval' && (
                                        <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 mt-2 space-y-3">
                                           <div className="flex items-center gap-2">
                                              <span className="material-symbols-outlined text-[18px] text-amber-600">gpp_maybe</span>
                                              <span className="text-[13px] font-bold text-amber-800">Aprobación requerida</span>
                                              {msg.riskLevel && (
                                                 <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">{msg.riskLevel} Risk</span>
                                              )}
                                           </div>
                                           {msg.sql && (
                                              <div className="bg-white rounded-lg border border-amber-200 p-3 overflow-x-auto">
                                                 <SyntaxHighlighter language="sql" style={prism} customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: '12px' }}>
                                                   {msg.sql.trim()}
                                                 </SyntaxHighlighter>
                                              </div>
                                           )}
                                           <div className="flex gap-2">
                                              <button onClick={() => handleApproval(msg, 'Approved')} className="px-4 py-2 bg-emerald-600 text-white text-[12px] font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
                                                 <span className="material-symbols-outlined text-[14px]">check_circle</span> Aprobar
                                              </button>
                                              <button onClick={() => { const reason = prompt('Razón del rechazo (opcional):'); handleApproval(msg, 'Rejected', reason || ''); }} className="px-4 py-2 bg-white text-red-600 border border-red-200 text-[12px] font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5">
                                                 <span className="material-symbols-outlined text-[14px]">cancel</span> Rechazar
                                              </button>
                                           </div>
                                        </div>
                                     )}
                                     
                                     {/* SQL/Insight/Results Tabs */}
                                     {msg.sql && msg.status !== 'PendingApproval' && (
                                        <div className="border border-zinc-200/80 rounded-xl overflow-hidden mt-2">
                                           <div className="flex items-center border-b border-zinc-100 bg-zinc-50/80">
                                              <div 
                                                 onClick={() => setActiveTabs(prev => ({ ...prev, [msg.id]: 'query' }))}
                                                 className={`px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold cursor-pointer transition-colors ${activeTabs[msg.id] === 'query' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-700'}`}
                                              >
                                                 Query
                                              </div>
                                              <div 
                                                 onClick={() => setActiveTabs(prev => ({ ...prev, [msg.id]: 'insight' }))}
                                                 className={`px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold cursor-pointer transition-colors ${!activeTabs[msg.id] || activeTabs[msg.id] === 'insight' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-700'}`}
                                              >
                                                 Insight
                                              </div>
                                              {msg.results && msg.results.length > 0 && (
                                                 <div 
                                                    onClick={() => setActiveTabs(prev => ({ ...prev, [msg.id]: 'results' }))}
                                                    className={`px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold cursor-pointer transition-colors flex items-center gap-1 ${activeTabs[msg.id] === 'results' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-700'}`}
                                                 >
                                                    Results
                                                    <span className="text-[9px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full font-bold">{msg.results.length}</span>
                                                 </div>
                                              )}
                                              
                                              {/* Copy SQL */}
                                              <button 
                                                 title="Copy SQL"
                                                 onClick={() => handleCopySQL(msg.sql!)}
                                                 className="ml-auto text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-md hover:bg-zinc-100">
                                                 <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                              </button>
                                              {/* Context-Aware Action Button */}
                                              <button 
                                                 title={(!activeTabs[msg.id] || activeTabs[msg.id] === 'insight') ? "Open Detailed Report" : "Open in Query Editor"}
                                                 onClick={() => {
                                                   if (!activeTabs[msg.id] || activeTabs[msg.id] === 'insight') {
                                                      setSelectedMessageForPanel(msg);
                                                      setIsInsightPanelOpen(true);
                                                   } else {
                                                      const tabId = 'ide-' + msg.id;
                                                      const exists = openTabs.find(t => t.id === tabId);
                                                      if (!exists) {
                                                         setOpenTabs(prev => [...prev, { type: 'ide', id: tabId, title: "Query Editor", sql: msg.sql || '' }]);
                                                      }
                                                      setCurrentView(tabId);
                                                   }
                                                 }}
                                                 className="mr-3 text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-md hover:bg-zinc-100 flex items-center justify-center">
                                                 <span className="material-symbols-outlined text-[14px]">
                                                    {(!activeTabs[msg.id] || activeTabs[msg.id] === 'insight') ? 'article' : 'open_in_new'}
                                                 </span>
                                              </button>
                                           </div>
                                           
                                           {activeTabs[msg.id] === 'query' ? (
                                              <div className="p-4 overflow-x-auto text-[13px]">
                                                 <SyntaxHighlighter language="sql" style={prism} customStyle={{ margin: 0, padding: 0, background: 'transparent' }}>
                                                   {msg.sql.trim()}
                                                 </SyntaxHighlighter>
                                              </div>
                                           ) : activeTabs[msg.id] === 'results' && msg.results ? (
                                               <div className="overflow-x-auto max-h-[350px] overflow-y-auto border-t border-zinc-200">
                                                  <table className="w-full text-[13px] font-mono border-collapse">
                                                     <thead className="sticky top-0 z-10">
                                                        <tr className="bg-[#f3f3f3] border-b border-zinc-300">
                                                           <th className="text-center px-3 py-2 text-zinc-400 font-normal border-r border-zinc-200 w-10">
                                                              <span className="material-symbols-outlined text-[14px]">grid_on</span>
                                                           </th>
                                                           {Object.keys(msg.results[0]).map(col => {
                                                              const isDate = col.toLowerCase().includes('date') || col.toLowerCase().includes('_ts');
                                                              const isNum = col.toLowerCase().includes('rate') || col.toLowerCase().includes('total') || col.toLowerCase().includes('count') || col.toLowerCase().includes('factor') || col.toLowerCase().includes('score');
                                                              return (
                                                                 <th key={col} className="text-left px-4 py-2.5 font-normal text-zinc-700 border-r border-zinc-200 whitespace-nowrap">
                                                                    <div className="flex items-center gap-2">
                                                                       <span className="text-blue-500 text-[13px]">
                                                                          {isDate ? '📅' : isNum ? 'eˣ' : '⊞'}
                                                                       </span>
                                                                       <span>{col}</span>
                                                                    </div>
                                                                 </th>
                                                              );
                                                           })}
                                                        </tr>
                                                     </thead>
                                                     <tbody>
                                                        {msg.results.map((row, rIdx) => (
                                                           <tr key={rIdx} className="border-b border-zinc-100 hover:bg-blue-50/40 transition-colors">
                                                              <td className="text-center px-3 py-2 text-zinc-400 font-normal border-r border-zinc-200 bg-[#f9f9f9] tabular-nums text-[12px]">{rIdx + 1}</td>
                                                              {Object.values(row).map((val, cIdx) => (
                                                                 <td key={cIdx} className="px-4 py-2 text-zinc-800 border-r border-zinc-100 whitespace-nowrap tabular-nums">
                                                                    {val != null ? String(val) : <span className="text-zinc-300 italic">NULL</span>}
                                                                 </td>
                                                              ))}
                                                           </tr>
                                                        ))}
                                                     </tbody>
                                                  </table>
                                               </div>
                                           ) : (
                                              <div className="p-4 text-[14px] text-zinc-700 font-medium leading-relaxed">
                                                {(() => {
                                                    if (!msg.insight) return <span className="text-zinc-400 italic">No insight generated yet...</span>;
                                                    
                                                    try {
                                                        const parsed = JSON.parse(msg.insight);
                                                        const hasChart = parsed.chart && parsed.chart.should_render_chart && parsed.chart.chart_type && parsed.chart.chart_type !== 'none' && parsed.chart.chart_type !== 'table';
                                                        
                                                        return (
                                                            <div className="space-y-4">
                                                                <ReactMarkdown
                                                                    remarkPlugins={[remarkGfm]}
                                                                    components={{
                                                                        h1: ({node, ...props}) => <h1 className="text-xl font-bold text-slate-800 mb-4" {...props} />,
                                                                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-slate-800 mt-5 mb-3" {...props} />,
                                                                        h3: ({node, ...props}) => <h3 className="text-md font-semibold text-slate-800 mt-4 mb-2" {...props} />,
                                                                        p: ({node, ...props}) => <p className="text-[13px] text-slate-600 leading-relaxed mb-3" {...props} />,
                                                                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 text-[13px] text-slate-600 space-y-1" {...props} />,
                                                                        li: ({node, ...props}) => <li {...props} />,
                                                                        strong: ({node, ...props}) => <strong className="font-semibold text-slate-800" {...props} />,
                                                                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-200 pl-4 italic text-slate-500 my-3" {...props} />
                                                                    }}
                                                                >
                                                                    {parsed.summary}
                                                                </ReactMarkdown>
                                                                {hasChart && msg.results && msg.results.length > 0 && (
                                                                    <div className="mt-4 border border-slate-100 rounded-[24px] p-6 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                                                        <div className="mb-6">
                                                                           <h4 className="text-[16px] font-semibold text-slate-800">{parsed.chart.title || 'Analysis Chart'}</h4>
                                                                           {parsed.chart.subtitle && <p className="text-[13px] text-slate-500 mt-1">{parsed.chart.subtitle}</p>}
                                                                        </div>
                                                                        <div className="h-[320px] w-full">
                                                                            <ResponsiveContainer width="100%" height="100%">
                                                                                {parsed.chart.chart_type === 'bar' ? (
                                                                                    <BarChart data={msg.results} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                                                        <XAxis dataKey={parsed.chart.x_axis} tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                                                                                        <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dx={-10} />
                                                                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px 16px', fontWeight: 500}} />
                                                                                        <Legend wrapperStyle={{fontSize: '13px', paddingTop: '20px'}} iconType="circle" />
                                                                                        <Bar dataKey={parsed.chart.y_axis} radius={[4, 4, 0, 0]} maxBarSize={50} minPointSize={5}>
                                                                                            {msg.results.map((entry, index) => (
                                                                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b'][index % 9]} />
                                                                                            ))}
                                                                                        </Bar>
                                                                                    </BarChart>
                                                                                ) : parsed.chart.chart_type === 'horizontal_bar' ? (
                                                                                    <BarChart layout="vertical" data={msg.results} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                                                                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                                                        <XAxis type="number" tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                                                                                        <YAxis type="category" dataKey={parsed.chart.x_axis} tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dx={-10} width={80} />
                                                                                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px 16px', fontWeight: 500}} />
                                                                                        <Legend wrapperStyle={{fontSize: '13px', paddingTop: '20px'}} iconType="circle" />
                                                                                        <Bar dataKey={parsed.chart.y_axis} radius={[0, 4, 4, 0]} maxBarSize={30} minPointSize={5}>
                                                                                            {msg.results.map((entry, index) => (
                                                                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b'][index % 9]} />
                                                                                            ))}
                                                                                        </Bar>
                                                                                    </BarChart>
                                                                                ) : parsed.chart.chart_type === 'line' ? (
                                                                                    <LineChart data={msg.results} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                                                        <XAxis dataKey={parsed.chart.x_axis} tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                                                                                        <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dx={-10} />
                                                                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px 16px', fontWeight: 500}} />
                                                                                        <Legend wrapperStyle={{fontSize: '13px', paddingTop: '20px'}} iconType="circle" />
                                                                                        <Line type="monotone" dataKey={parsed.chart.y_axis} stroke="#6366f1" strokeWidth={4} activeDot={{r: 8, fill: '#6366f1', strokeWidth: 0}} dot={{r: 0}} />
                                                                                    </LineChart>
                                                                                ) : parsed.chart.chart_type === 'pie' || parsed.chart.chart_type === 'donut' ? (
                                                                                    <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                                                                        <Pie data={msg.results} dataKey={parsed.chart.y_axis} nameKey={parsed.chart.x_axis} cx="50%" cy="50%" innerRadius={parsed.chart.chart_type === 'donut' ? 70 : 0} outerRadius={100} paddingAngle={4} stroke="none">
                                                                                            {msg.results.map((entry, index) => (
                                                                                                <Cell key={`cell-${index}`} fill={['#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b'][index % 9]} />
                                                                                            ))}
                                                                                        </Pie>
                                                                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px 16px', fontWeight: 500}} />
                                                                                        <Legend wrapperStyle={{fontSize: '13px', paddingTop: '10px'}} iconType="circle" />
                                                                                    </PieChart>
                                                                                ) : (
                                                                                    <div className="flex items-center justify-center h-full text-slate-400 italic text-[13px]">Unsupported chart type: {parsed.chart.chart_type}</div>
                                                                                )}
                                                                            </ResponsiveContainer>
                                                                        </div>
                                                                        {parsed.chart.reason && <p className="text-[12px] text-zinc-400 text-center mt-3 flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-[14px]">lightbulb</span> {parsed.chart.reason}</p>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    } catch (e) {
                                                        // Fallback for legacy plain text insights
                                                        return msg.insight;
                                                    }
                                                })()}
                                              </div>
                                           )}
                                        </div>
                                     )}

                                     {msg.status === 'Running' && (
                                        <div className="flex gap-1.5 mt-1">
                                           <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce"></div>
                                           <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce delay-75"></div>
                                           <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                     )}

                                  </div>
                               </div>
                            )}

                         </div>
                       ))}
                       <div ref={messagesEndRef} />
                    </div>
                 </div>
               )}

               {/* Fixed input bar at bottom */}
               {messages.length > 0 && (
                 <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 lg:px-16 pb-5 pt-3 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)] to-transparent z-20">
                    <div className="relative rounded-2xl bg-white border border-zinc-200 focus-within:border-zinc-300 focus-within:shadow-md transition-all">
                      <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { 
                            if(e.key === 'Enter' && !e.shiftKey) { 
                                e.preventDefault(); 
                                handleSubmit(); 
                            } 
                        }}
                        disabled={isTyping}
                        className="w-full bg-transparent px-5 py-3.5 pr-14 text-[14px] font-medium text-zinc-900 focus:outline-none resize-none h-[52px] placeholder:text-zinc-400 rounded-2xl"
                        placeholder="Ask a follow-up question..."
                      ></textarea>
                      <button 
                        onClick={handleSubmit} 
                        disabled={isTyping || !input.trim()}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center disabled:opacity-20 disabled:bg-zinc-200 disabled:text-zinc-400 transition-all hover:bg-zinc-800">
                        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                      </button>
                    </div>
                 </div>
               )}

            </div>
          )}

          {/* VIEW: IDE EDITOR */}
          {openTabs.find(t => t.id === currentView && t.type === 'ide') && (() => {
             const activeTab = openTabs.find(t => t.id === currentView)!;
             return (
               <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4]">
                 {/* Editor Toolbar */}
                 <div className="h-16 border-b border-[#2d2d2d] flex items-center px-8 justify-between shrink-0 bg-[#1e1e1e]">
                    <div className="flex items-center gap-3 text-[14px] font-mono text-[#858585]">
                       <span className="material-symbols-outlined text-[18px] text-[#4d90fe]">database</span>
                       <span>analytics_db</span>
                       <span className="text-[#555] mx-2">|</span>
                       <span className="text-[#858585] text-[12px] font-normal">Connected • 12ms</span>
                    </div>
                    <div>
                       <button className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-colors shadow-sm">
                          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                          Run Query <span className="text-emerald-200/50 text-[11px] ml-2 font-mono">⌘Enter</span>
                       </button>
                    </div>
                 </div>

                 {/* Editor Area */}
                 <div className="flex-1 relative overflow-hidden bg-[#1e1e1e] text-[15px]">
                    <textarea 
                      className="absolute inset-0 w-full h-full text-transparent caret-white p-8 resize-none focus:outline-none z-10 bg-transparent"
                      style={{ fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace', lineHeight: '1.6' }}
                      value={activeTab.sql}
                      onChange={(e) => {
                         const newSql = e.target.value;
                         setOpenTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, sql: newSql } : t));
                      }}
                      onScroll={(e) => {
                         const target = e.target as HTMLTextAreaElement;
                         const div = target.nextElementSibling as HTMLDivElement;
                         if (div) {
                            div.scrollTop = target.scrollTop;
                            div.scrollLeft = target.scrollLeft;
                         }
                      }}
                      spellCheck="false"
                    />
                    <div className="absolute inset-0 w-full h-full pointer-events-none p-8 z-0 overflow-hidden" aria-hidden="true">
                       <SyntaxHighlighter language="sql" style={prism} customStyle={{ margin: 0, padding: 0, background: 'transparent', lineHeight: '1.6', fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace' }}>
                          {activeTab.sql || ' '}
                       </SyntaxHighlighter>
                    </div>
                 </div>

                 {/* Results Area (Mock) */}
                 <div className="h-[45%] bg-[#181818] border-t border-[#2d2d2d] flex flex-col shrink-0">
                    <div className="h-12 flex items-center px-8 justify-between bg-[#1e1e1e]">
                       <div className="flex items-center gap-8 text-[13px] text-[#858585]">
                          <span className="text-[#cccccc] font-medium">Results</span>
                          <span className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"><span className="material-symbols-outlined text-[16px]">download</span> Export CSV</span>
                          <span className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"><span className="material-symbols-outlined text-[16px]">content_copy</span> Copy</span>
                          <span className="text-[#555] mx-1">|</span>
                          <span>4 rows in result</span>
                       </div>
                    </div>
                    <div className="flex-1 overflow-auto p-8 bg-[#181818]">
                       <table className="w-full text-left border-collapse text-[14px]">
                          <thead>
                             <tr>
                                <th className="border-b border-[#2d2d2d] text-[#858585] font-medium p-3 sticky top-0 bg-[#181818]">empresa</th>
                                <th className="border-b border-[#2d2d2d] text-[#858585] font-medium p-3 sticky top-0 bg-[#181818]">gasto_total_salarios</th>
                             </tr>
                          </thead>
                          <tbody className="text-[#d4d4d4] font-mono">
                             <tr className="border-b border-[#2d2d2d]/50 hover:bg-[#2a2d2e] transition-colors">
                                <td className="p-3 whitespace-nowrap pt-4">Quantum Dynamics</td>
                                <td className="p-3 whitespace-nowrap pt-4">375000.00</td>
                             </tr>
                             <tr className="border-b border-[#2d2d2d]/50 hover:bg-[#2a2d2e] transition-colors">
                                <td className="p-3 whitespace-nowrap">Pacific FinTech</td>
                                <td className="p-3 whitespace-nowrap">142000.00</td>
                             </tr>
                             <tr className="border-b border-[#2d2d2d]/50 hover:bg-[#2a2d2e] transition-colors">
                                <td className="p-3 whitespace-nowrap">Global Logistics Corp</td>
                                <td className="p-3 whitespace-nowrap">95000.00</td>
                             </tr>
                             <tr className="border-b border-[#2d2d2d]/50 hover:bg-[#2a2d2e] transition-colors">
                                <td className="p-3 whitespace-nowrap pb-4">NeoEnergy S.A.</td>
                                <td className="p-3 whitespace-nowrap pb-4">82000.00</td>
                             </tr>
                          </tbody>
                       </table>
                    </div>
                 </div>
               </div>
             );
          })()}

        </div>

      </main>

      {/* Extended Insight Panel */}
      {isInsightPanelOpen && selectedMessageForPanel && (
         <>
            <div className="fixed inset-0 bg-zinc-900/40 z-[100]" onClick={() => setIsInsightPanelOpen(false)}></div>
            <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-2xl z-[110] transform transition-transform border-l border-zinc-200 flex flex-col overflow-hidden">
                <div className="px-8 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
                   <div className="flex items-center gap-2 text-slate-800">
                      <span className="material-symbols-outlined text-blue-600">assignment</span>
                      <h2 className="text-[18px] font-bold">Extended Analysis Report</h2>
                   </div>
                   <button onClick={() => setIsInsightPanelOpen(false)} className="text-zinc-400 hover:text-zinc-900 p-2 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">close</span>
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 bg-white">
                   {(() => {
                       try {
                           const parsed = JSON.parse(selectedMessageForPanel.insight || "{}");
                           if (!parsed.extendedReport) return <div className="text-zinc-500 italic mt-4">No extended report available for this analysis.</div>;
                           return (
                               <ReactMarkdown
                                   remarkPlugins={[remarkGfm]}
                                   components={{
                                       h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-900 mb-6 border-b border-zinc-100 pb-4" {...props} />,
                                       h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2" {...props} />,
                                       h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3" {...props} />,
                                       p: ({node, ...props}) => <p className="text-[15px] text-slate-600 leading-relaxed mb-5" {...props} />,
                                       ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-6 text-[15px] text-slate-600 space-y-2" {...props} />,
                                       ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-6 text-[15px] text-slate-600 space-y-2" {...props} />,
                                       li: ({node, ...props}) => <li {...props} />,
                                       strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                                       blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-5 bg-blue-50/50 py-3 pr-4 rounded-r-xl italic text-slate-700 my-6" {...props} />
                                   }}
                               >
                                   {parsed.extendedReport}
                               </ReactMarkdown>
                           );
                       } catch(e) {
                           return <div className="text-zinc-500 italic mt-4">Error parsing extended report data.</div>;
                       }
                   })()}
                </div>
            </div>
         </>
      )}

    </div>
  );
}

