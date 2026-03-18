"use client";

import { useEffect, useState, useRef } from "react";
import "./UnifiedChat.css";

type Message = {
  id: string;
  role: "user" | "ai";
  content?: string;
  sql?: string;
  insight?: string;
  status?: "PendingApproval" | "Completed" | "Failed" | "Blocked" | "Running" | "Accepted" | "Rejected";
  instanceId?: string;
};

// Simple Terminal Log type
type LogEntry = {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARN" | "ERROR" | "DEBUG" | "READY";
  message: string;
};

export function UnifiedChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<LogEntry[]>([
    { id: "1", timestamp: new Date().toISOString(), level: "INFO", message: "Connecting to Azure OpenAI and SQL engines..." },
    { id: "2", timestamp: new Date().toISOString(), level: "SUCCESS", message: "System idling. Listening for incoming queries." }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const [activePoll, setActivePoll] = useState<string | null>(null);

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
    if (terminalEndRef.current) {
        terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // Polling logic
  useEffect(() => {
    if (!activePoll) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/query/${activePoll}`);
        if (!res.ok) throw new Error("Fetch failed");
        
        const data = await res.json();
        
        // Update Terminal Logs based on CustomStatus
        if (data.customStatus && data.customStatus.Label) {
            addLog("DEBUG", `[Orchestrator] ${data.customStatus.Label} - ${data.customStatus.Status}`);
        }

        // Check completion states
        if (data.runtimeStatus === "Completed" || data.runtimeStatus === "Failed" || data.runtimeStatus === "Terminated") {
          setIsTyping(false);
          setActivePoll(null);
          
          if (data.runtimeStatus === "Completed" && data.output) {
             // Handle conversational (non-SQL) responses
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
             addLog("ERROR", `Execution failed: ${data.outputRaw || "Unknown error"}`);
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
        // Pending Approval state
        else if (data.customStatus?.Status === "PendingApproval") {
             setIsTyping(false);
             setActivePoll(null); // Pause polling until approved
             addLog("WARN", `Query paused for manual approval (Risk: High)`);
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
        // Silently continue polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activePoll]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Math.random().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    addLog("INFO", `Received user query: "${userMsg.content}"`);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsg.content,
          userId: "user@agent.com",
          role: "FraudAnalyst",
          correlationId: `chat-${Date.now()}`,
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
      addLog("DEBUG", `Orchestration started: ${body.instanceId}`);
      
      const aiMsg: Message = { id: Math.random().toString(), role: "ai", instanceId: body.instanceId, status: "Running", content: "Analizando..." };
      setMessages((prev) => [...prev, aiMsg]);
      setActivePoll(body.instanceId);
    } catch (e: any) {
      setIsTyping(false);
      addLog("ERROR", e.message);
    }
  };

  const handleApproval = async (instanceId: string, decision: "Approved" | "Rejected") => {
    const aiIdx = messages.findIndex(m => m.instanceId === instanceId);
    if (aiIdx === -1) return;

    addLog("INFO", `Sending approval decision: ${decision} for ${instanceId}`);
    try {
        await fetch(`/api/query/${instanceId}/approve`, {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
               decision,
               reason: "Decidido vía Chat UI",
               approverUserId: "admin@agent.com"
           })
        });

        setMessages((prev) => {
            const newMsgs = [...prev];
            newMsgs[aiIdx].status = decision === "Approved" ? "Accepted" : "Rejected";
            newMsgs[aiIdx].content = decision === "Approved" ? "Aprobado. Continuo con la ejecución..." : "Solicitud denegada por supervisor.";
            return newMsgs;
        });

        if (decision === "Approved") {
            setIsTyping(true);
            setActivePoll(instanceId); // Resume polling
        }
    } catch (e) {
        addLog("ERROR", "Failed to send approval.");
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-body text-on-background bg-background">
      {/* Header */}
      <header className="bg-background text-primary font-headline tracking-tight flex justify-between items-center w-full px-6 h-14 fixed top-0 z-50 border-b border-surface-variant/20">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold tracking-tighter">Backend AI Agent</span>
          <nav className="hidden md:flex gap-6 ml-8 text-sm">
            <a className="text-primary border-b-2 border-primary pb-1 transition-colors" href="#">Deployments</a>
            <a className="text-secondary hover:text-primary transition-colors duration-200" href="/dashboard/history">Logs</a>
            <a className="text-secondary hover:text-primary transition-colors duration-200" href="#">Registry</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-surface-container-low rounded px-3 py-1 flex items-center gap-2 border border-surface-variant/20">
            <span className="material-symbols-outlined text-sm">search</span>
            <input className="bg-transparent border-none outline-none text-xs w-48 text-secondary focus:ring-0" placeholder="Search commands..." type="text" />
          </div>
          <span className="material-symbols-outlined text-secondary cursor-pointer hover:text-primary transition-colors">notifications</span>
          <span className="material-symbols-outlined text-secondary cursor-pointer hover:text-primary transition-colors">settings</span>
          <div className="w-7 h-7 bg-primary rounded-full overflow-hidden border border-primary/20 flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-sm">person</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col border-r border-surface-variant/20 bg-surface-container-low h-full w-64 z-40">
          <div className="p-4 flex items-center justify-between border-b border-surface-variant/10">
            <div>
              <h2 className="font-body text-[11px] uppercase tracking-widest text-primary">Backend Engine</h2>
              <p className="text-[9px] text-secondary/50 font-mono">v1.2.0-stable</p>
            </div>
            <button className="bg-surface-container hover:bg-primary/10 text-primary border border-primary/20 px-2 py-1 text-[10px] rounded transition-all">
              New Query
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <div className="px-4 py-2 flex items-center gap-2 text-secondary uppercase text-[10px] tracking-widest font-bold">
              <span className="material-symbols-outlined text-[14px]">folder_open</span> Explorer
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-3 px-6 py-1.5 hover:bg-surface-container hover:text-primary text-secondary transition-all duration-200 cursor-pointer text-xs">
                <span className="material-symbols-outlined text-[16px] text-tertiary">javascript</span>
                <span>orchestrator.js</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-1.5 bg-surface-container text-primary border-l-2 border-primary transition-all duration-200 cursor-pointer text-xs">
                <span className="material-symbols-outlined text-[16px]">chat</span>
                <span>Active Chat</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-background overflow-hidden">
          
          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <span className="material-symbols-outlined text-4xl text-primary/40">smart_toy</span>
                    <h1 className="text-2xl font-headline text-primary">Query-to-Insight Analytics Engineer</h1>
                    <p className="text-secondary/70 text-sm max-w-md">Escribe tu pregunta sobre fraude comercial en lenguaje natural, validaré los riesgos y te presentaré los hallazgos en SQL.</p>
                </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                
                {/* Avatar */}
                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 border ${msg.role === 'ai' ? 'bg-primary-container border-primary/30 text-primary' : 'bg-surface-variant border-surface-variant/30 text-secondary'}`}>
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: msg.role === 'ai' ? "'FILL' 1" : "" }}>
                    {msg.role === 'ai' ? 'smart_toy' : 'person'}
                  </span>
                </div>

                {/* Bubble */}
                <div className={`space-y-4 flex-1 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                  {msg.role === 'user' ? (
                     <div className="bg-surface-container p-4 rounded-lg border border-surface-variant/30 text-inverse-surface text-sm max-w-2xl">
                         {msg.content}
                     </div>
                  ) : (
                     <div className="space-y-4">
                         
                         {/* Main AI Text / Insight */}
                         {msg.insight ? (
                            <div className="text-secondary leading-relaxed text-sm bg-surface-container-low p-4 rounded-lg border-l-2 border-primary">
                                {msg.insight}
                            </div>
                         ) : (
                            <div className="text-secondary leading-relaxed text-sm flex items-center gap-2">
                                {msg.status === 'Running' && <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>}
                                {msg.status === 'Blocked' && <span className="material-symbols-outlined text-error text-sm">block</span>}
                                {msg.content}
                            </div>
                         )}

                         {/* Code Block */}
                         {msg.sql && (
                            <div className="rounded overflow-hidden bg-surface-container-lowest border border-outline-variant/20">
                                <div className="bg-surface-container-low px-4 py-2 flex justify-between items-center">
                                    <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">SQL Optimizado</span>
                                    <button className="text-[10px] text-secondary hover:text-primary flex items-center gap-1 transition-colors">
                                        <span className="material-symbols-outlined text-xs">content_copy</span> Copy
                                    </button>
                                </div>
                                <pre className="p-4 text-[13px] font-mono text-tertiary whitespace-pre-wrap">{msg.sql.trim()}</pre>
                            </div>
                         )}

                         {/* Approval UI */}
                         {msg.status === 'PendingApproval' && (
                            <div className="rounded overflow-hidden bg-error-container/20 border border-error/50 mt-4">
                                <div className="bg-error-container/40 px-4 py-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-error text-sm">security</span>
                                    <span className="text-[10px] uppercase tracking-widest text-error font-bold">APROBACIÓN REQUERIDA (Riesgo Alto)</span>
                                </div>
                                <div className="p-4 flex gap-4">
                                    <button onClick={() => handleApproval(msg.instanceId!, "Approved")} className="flex-1 bg-primary text-on-primary py-2 rounded text-xs font-bold hover:brightness-110 flex items-center justify-center gap-2 transition-all">
                                        <span className="material-symbols-outlined text-sm">check_circle</span> Aprobar
                                    </button>
                                    <button onClick={() => handleApproval(msg.instanceId!, "Rejected")} className="flex-1 bg-surface-variant text-on-surface py-2 rounded text-xs font-bold hover:bg-error hover:text-on-error flex items-center justify-center gap-2 transition-all">
                                        <span className="material-symbols-outlined text-sm">cancel</span> Rechazar
                                    </button>
                                </div>
                            </div>
                         )}
                     </div>
                  )}
                </div>

              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-background border-t border-surface-variant/20">
            <div className="max-w-4xl mx-auto bg-surface-container-low rounded-lg border border-surface-variant/30 p-2 shadow-2xl">
              <div className="flex items-center gap-2 mb-2 px-2">
                <div className="flex items-center gap-1.5 bg-background px-2 py-0.5 rounded text-[10px] text-primary border border-primary/20">
                  <span className={`w-1.5 h-1.5 rounded-full bg-primary ${isTyping ? "animate-pulse" : ""}`}></span>
                  gpt41mini-std (Core Analytics Agent)
                </div>
              </div>
              <div className="flex items-end gap-2">
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
                  className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm text-inverse-surface resize-none h-12 py-2 px-2 font-mono scrollbar-hide" 
                  placeholder={isTyping ? "Esperando respuesta del orquestador..." : "Hazme una pregunta sobre métricas de fraude..."}
                ></textarea>
                <button 
                  onClick={handleSubmit} 
                  disabled={isTyping || !input.trim()}
                  className={`p-2 rounded flex items-center justify-center transition-transform ${isTyping ? 'bg-surface-variant text-secondary' : 'bg-primary text-on-primary hover:scale-105'}`}>
                  <span className="material-symbols-outlined font-bold">arrow_upward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Terminal Logs */}
          <div className="h-48 bg-surface-container-lowest border-t border-primary/10 flex flex-col shrink-0">
            <div className="flex items-center justify-between px-4 py-1.5 bg-background border-b border-surface-variant/10">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold tracking-widest text-secondary uppercase flex items-center gap-2">
                  <span className="material-symbols-outlined text-xs">terminal</span> Terminal
                </span>
                <span className="text-[10px] font-bold tracking-widest text-primary uppercase border-b border-primary">PostgreSQL Logs</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1">
              {terminalLogs.map((log) => (
                  <div key={log.id} className="flex gap-4">
                      <span className="text-secondary/30">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className={`w-16 font-bold ${log.level === 'ERROR' ? 'text-error' : log.level === 'WARN' ? 'text-error' : log.level === 'SUCCESS' ? 'text-primary' : 'text-tertiary'}`}>
                          {log.level}
                      </span>
                      <span className="text-secondary">{log.message}</span>
                  </div>
              ))}
              <div className="mt-2 text-secondary border-l-2 border-primary pl-2 bg-primary/5 py-1">
                obsidian-terminal:~$ <span className="animate-pulse">_</span>
              </div>
              <div ref={terminalEndRef} />
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
