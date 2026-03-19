"use client";

import { useEffect, useState, useRef } from "react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
};

type LogEntry = {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR" | "DEBUG" | "READY";
  message: string;
};

type Connection = { id: string; name: string };
type ChatSession = { id: string; connectionId: string; title: string; messages: Message[] };
type DashboardTab = { type: 'chat' | 'ide'; id: string; title: string; connectionId?: string; sql?: string };

export function UnifiedChat() {
  const [connections, setConnections] = useState<Connection[]>([
    { id: 'conn-demo', name: 'My Postgres Database' }
  ]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    { id: 'chat-demo-1', connectionId: 'conn-demo', title: 'Untitled Chat 1', messages: [] }
  ]);
  const [openTabs, setOpenTabs] = useState<DashboardTab[]>([
    { type: 'chat', id: 'chat-demo-1', title: 'Untitled Chat 1', connectionId: 'conn-demo' }
  ]);

  type ViewState = 'welcome' | 'integrations' | 'connect_postgres' | string;
  const [currentView, setCurrentView] = useState<ViewState>('chat-demo-1');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
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
  const [activeTabs, setActiveTabs] = useState<Record<string, 'query' | 'insight'>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTerminalLogs([
      { id: "1", timestamp: new Date().toISOString(), level: "INFO", message: "System initializing..." },
      { id: "2", timestamp: new Date().toISOString(), level: "SUCCESS", message: "Dashboard UI ready." }
    ]);
  }, []);

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
             if (data.output.Status === "Conversational") {
               addLog("SUCCESS", "Conversational response (no SQL pipeline needed).");
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

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsg.content,
          userId: "user@agent.com",
          role: "FraudAnalyst",
          correlationId: "chat-" + Date.now(),
          sessionId: "unified-session"
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

  const handleConnectPostgres = () => {
    const newConnId = 'conn-' + Date.now();
    const newChatId = 'chat-' + Date.now();
    
    setConnections(prev => [...prev, { id: newConnId, name: 'My Postgres Database' }]);
    setChatSessions(prev => [...prev, { id: newChatId, connectionId: newConnId, title: 'Untitled Chat 1', messages: [] }]);
    setOpenTabs(prev => [...prev, { type: 'chat', id: newChatId, title: 'Untitled Chat 1', connectionId: newConnId }]);
    
    setCurrentView(newChatId);
    addLog("SUCCESS", "Connected to PostgreSQL database successfully.");
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
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                Data Sources
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors">
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Settings
              </button>
            </div>
            
            <div className="px-4 py-4">
               <div className="flex items-center justify-between px-3 text-[11px] uppercase tracking-widest text-zinc-400 font-bold mb-3">
                  <span>Connections</span>
                  <button onClick={() => setCurrentView('integrations')} className="hover:text-zinc-900 transition-colors" title="New Connection">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </button>
               </div>
               
               <div className="space-y-3">
                  {connections.map(conn => {
                     const chats = chatSessions.filter(c => c.connectionId === conn.id);
                     return (
                        <div key={conn.id} className="space-y-1">
                           <button 
                              onClick={() => {
                                 if (chats.length === 0) {
                                     const newChatId = 'chat-' + Date.now();
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
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-700 hover:bg-zinc-100 transition-colors group"
                           >
                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                              <span className="truncate">{conn.name}</span>
                           </button>
                           {chats.length > 0 && (
                              <div className="pl-6 pr-2 space-y-0.5">
                                 {chats.map(chat => (
                                    <button 
                                       key={chat.id}
                                       onClick={() => openChat(chat.id)}
                                       className={`w-full text-left truncate px-3 py-1.5 rounded-md text-[13px] transition-colors ${currentView === chat.id ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
                                    >
                                       {chat.title}
                                    </button>
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
        
        {/* Bottom actions */}
        <div className="px-6 py-5 border-t border-zinc-200/50">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-2">Plan</div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Free</span>
            <button className="text-[11px] font-medium text-zinc-900 transition-colors hover:underline">Upgrade</button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[var(--surface)]">

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
                Connect PostgreSQL
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
            
            <div className="ml-auto flex items-center gap-4">
                <button className="text-zinc-600 hover:text-zinc-900 transition-colors flex items-center"><span className="material-symbols-outlined text-[18px]">notifications</span></button>
                <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-[11px] font-medium text-white shadow-inner">J</div>
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
                {['PostgreSQL', 'MySQL', 'TursoDB', 'Cloudflare D1', 'ClickHouse', 'MotherDuck', 'GraphQL APIs', 'BigQuery'].map((db, i) => (
                  <button 
                    key={db}
                    onClick={() => db === 'PostgreSQL' ? setCurrentView('connect_postgres') : null}
                    className={`bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 flex items-center gap-4 transition-colors group ${db !== 'PostgreSQL' && 'opacity-50 cursor-not-allowed hover:border-zinc-200'}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform ${db === 'PostgreSQL' ? 'bg-zinc-50 group-hover:bg-zinc-100 group-hover:scale-105' : 'bg-zinc-50'}`}>
                       <span className={`material-symbols-outlined text-[20px] ${db === 'PostgreSQL' ? 'text-zinc-900' : 'text-zinc-500'}`}>database</span>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      <span className={`text-[14px] font-medium ${db === 'PostgreSQL' ? 'text-zinc-900' : 'text-zinc-700'}`}>{db}</span>
                      {db !== 'PostgreSQL' && <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Coming Soon</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: CONNECT POSTGRES */}
          {currentView === 'connect_postgres' && (
            <div className="flex h-full">
               <div className="flex-1 flex justify-center py-12 px-8 overflow-y-auto">
                  <div className="w-full max-w-[480px]">
                     
                     <button onClick={() => setCurrentView('integrations')} className="flex items-center gap-2 text-[13px] text-zinc-500 hover:text-zinc-900 font-medium mb-8 transition-colors">
                        <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Integrations
                     </button>

                     <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-8">Connect Postgres Database</h2>
                     
                     <div className="space-y-6 bg-white border border-zinc-200 p-8 rounded-3xl">
                        {[
                          { label: "Display Name*", defaultValue: "My Postgres Database", type: "text" },
                          { label: "Host address*", defaultValue: "db.mypostgres.com", type: "text" },
                          { label: "Port*", defaultValue: "5432", type: "text" },
                          { label: "Database*", defaultValue: "analytics_db", type: "text" },
                          { label: "Username*", defaultValue: "postgres_admin", type: "text" },
                          { label: "Password*", defaultValue: "••••••••••••", type: "password" }
                        ].map((field, i) => (
                           <div key={i} className="space-y-1.5">
                              <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">{field.label}</label>
                              <input 
                                type={field.type} 
                                defaultValue={field.defaultValue} 
                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-[13px] text-black focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-colors font-mono" 
                              />
                           </div>
                        ))}
                        
                        <div className="pt-4">
                          <button 
                            onClick={handleConnectPostgres}
                            className="w-full bg-zinc-900 text-white font-medium rounded-xl py-3.5 text-[14px] hover:bg-zinc-800 transition-colors flex justify-center items-center gap-2">
                              Test and Save Connection <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
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
                       <a className="flex items-center gap-3 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors" href="#">
                         <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-[16px]">description</span></div>
                         Connecting PostgreSQL
                       </a>
                     </div>
                     <div className="space-y-4">
                       <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Platform Guides</div>
                       <div className="space-y-2">
                         {['DigitalOcean', 'Supabase', 'Neon', 'AWS RDS', 'Heroku'].map((plat) => (
                           <a key={plat} className="flex items-center gap-3 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors p-2 rounded-lg hover:bg-zinc-900/5 -ml-2" href="#">
                             <span className="material-symbols-outlined text-[16px] text-zinc-400">public</span> {plat}
                           </a>
                         ))}
                       </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* VIEW: CHAT */}
          {openTabs.find(t => t.id === currentView && t.type === 'chat') && (
            <div className="flex flex-col h-full items-center p-6 lg:p-12 max-w-[800px] mx-auto w-full relative">
               
               {messages.length === 0 && (
                 <div className="h-full flex flex-col justify-center items-center w-full max-w-2xl space-y-12 mb-20 text-center">
                    <div className="space-y-3">
                       <h2 className="text-xl text-zinc-500 font-medium tracking-tight">Welcome, Jessy</h2>
                       <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">What would you like to explore?</h1>
                    </div>
                    
                    <div className="w-full relative rounded-2xl group border border-zinc-200 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-200 transition-colors bg-white">
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
                        className="w-full bg-transparent rounded-2xl px-6 py-5 pr-16 text-[15px] text-zinc-900 focus:outline-none resize-none h-32 font-medium placeholder:text-zinc-400"
                        placeholder="Ask a question or create a chart..."
                      ></textarea>
                      <button 
                        onClick={handleSubmit} 
                        disabled={isTyping || !input.trim()}
                        className="absolute right-4 bottom-4 w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center disabled:opacity-30 disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors hover:bg-zinc-800 cursor-pointer">
                        <span className="material-symbols-outlined text-[18px] font-bold">arrow_upward</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      {[
                        { icon: 'bar_chart', label: 'Chart' },
                        { icon: 'table_chart', label: 'Table' },
                        { icon: 'lightbulb', label: 'Insight' },
                        { icon: 'analytics', label: 'Analysis' }
                      ].map(action => (
                         <button key={action.label} className="px-5 py-2 rounded-full border border-zinc-200 bg-white text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 flex items-center gap-2 transition-colors">
                           <span className="material-symbols-outlined text-[16px]">{action.icon}</span> {action.label}
                         </button>
                      ))}
                    </div>
                 </div>
               )}

               {/* Chat history area */}
               {messages.length > 0 && (
                 <div className="w-full flex-1 overflow-y-auto pt-8 pb-48 flex flex-col items-center">
                    <div className="w-full max-w-3xl space-y-8 px-4">
                       {messages.map((msg) => (
                         <div key={msg.id} className="w-full animate-in slide-in-from-bottom-2 duration-300">
                            
                            {msg.role === 'user' && (
                               <div className="flex justify-end w-full">
                                  <div className="bg-zinc-100 border border-zinc-200/50 rounded-3xl px-6 py-4 text-[15px] text-zinc-900 shadow-sm max-w-[80%] font-medium leading-relaxed">
                                     {msg.content}
                                  </div>
                               </div>
                            )}

                            {msg.role === 'ai' && (
                               <div className="flex gap-5 w-full">
                                  <div className="mt-1 shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-200 flex items-center justify-center shadow-sm">
                                      <span className="material-symbols-outlined text-[16px] text-white">smart_toy</span>
                                    </div>
                                  </div>
                                  <div className="flex-1 space-y-4 min-w-0">
                                     
                                     {msg.content && msg.status !== 'Running' && (
                                        <div className="text-[15px] text-zinc-800 leading-relaxed font-medium mt-1 max-w-none">
                                           {msg.content}
                                        </div>
                                     )}

                                     {msg.status === 'Running' && msg.content && (
                                        <div className="text-[14px] text-zinc-600 leading-relaxed font-bold mt-1 max-w-none">
                                           {msg.content}
                                        </div>
                                     )}
                                     
                                     {msg.sql && (
                                        <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm my-4">
                                           <div className="flex items-center border-b border-zinc-200 bg-zinc-50/50">
                                              <div 
                                                 onClick={() => setActiveTabs(prev => ({ ...prev, [msg.id]: 'query' }))}
                                                 className={`px-5 py-3 text-[11px] uppercase tracking-widest font-bold cursor-pointer transition-colors ${activeTabs[msg.id] === 'query' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-900'}`}
                                              >
                                                 Query
                                              </div>
                                              <div 
                                                 onClick={() => setActiveTabs(prev => ({ ...prev, [msg.id]: 'insight' }))}
                                                 className={`px-5 py-3 text-[11px] uppercase tracking-widest font-bold cursor-pointer transition-colors ${!activeTabs[msg.id] || activeTabs[msg.id] === 'insight' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-900'}`}
                                              >
                                                 Insight
                                              </div>
                                              
                                              <button 
                                                 title="Open in editor"
                                                 onClick={() => {
                                                   const tabId = 'ide-' + msg.id;
                                                   const exists = openTabs.find(t => t.id === tabId);
                                                   if (!exists) {
                                                      setOpenTabs(prev => [...prev, { type: 'ide', id: tabId, title: "Query Editor", sql: msg.sql || '' }]);
                                                   }
                                                   setCurrentView(tabId);
                                                 }}
                                                 className="ml-auto mr-4 text-zinc-400 hover:text-zinc-900 transition-colors p-1.5 rounded-md hover:bg-zinc-100">
                                                 <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                                              </button>
                                           </div>
                                           
                                           {activeTabs[msg.id] === 'query' ? (
                                              <div className="bg-[#1e1e1e] p-5 overflow-x-auto shadow-inner text-[13px]">
                                                 <SyntaxHighlighter language="sql" style={vscDarkPlus} customStyle={{ margin: 0, padding: 0, background: 'transparent' }}>
                                                   {msg.sql.trim()}
                                                 </SyntaxHighlighter>
                                              </div>
                                           ) : (
                                              <div className="p-5 text-[14px] text-zinc-800 font-medium leading-relaxed bg-white">
                                                {msg.insight ? msg.insight : <span className="text-zinc-400 italic">No insight generated yet...</span>}
                                              </div>
                                           )}
                                        </div>
                                     )}

                                     {msg.status === 'Running' && (
                                        <div className="flex gap-1.5 mt-2">
                                           <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></div>
                                           <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-75"></div>
                                           <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-150"></div>
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

               {/* Floating input at bottom for active chat */}
               {messages.length > 0 && (
                 <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-20">
                    <div className="relative rounded-2xl border border-zinc-200 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-200 transition-all bg-white shadow-xl hover:shadow-2xl">
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
                        className="w-full bg-transparent px-5 py-4 pr-14 text-[14px] font-medium text-zinc-900 focus:outline-none resize-none h-[56px] placeholder:text-zinc-500"
                        placeholder="Ask a follow-up question..."
                      ></textarea>
                      <button 
                        onClick={handleSubmit} 
                        disabled={isTyping || !input.trim()}
                        className="absolute right-2.5 top-2.5 w-9 h-9 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-zinc-900 hover:text-white flex items-center justify-center disabled:opacity-50 disabled:bg-zinc-50 disabled:text-zinc-300 transition-colors border border-zinc-200">
                        <span className="material-symbols-outlined text-[16px] font-bold">north</span>
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
                       <SyntaxHighlighter language="sql" style={vscDarkPlus} customStyle={{ margin: 0, padding: 0, background: 'transparent', lineHeight: '1.6', fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace' }}>
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
    </div>
  );
}
