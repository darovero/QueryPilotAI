import { useState, useEffect } from "react";
import { ChatSession, Message, Connection, ServerSessionRecord, ServerConversationTurnRecord } from "../types";

const getChatSessionsStorageKey = (userId?: string) =>
  userId ? `qp_chatSessions:${userId}` : "qp_chatSessions";

export function useChatSessions(
  userId: string | undefined,
  fetchWithAuth: (url: string, options?: any) => Promise<Response>,
  connections: Connection[],
  addLog: (level: any, msg: string) => void,
  currentView: string
) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activePoll, setActivePoll] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Load from localStorage using a per-user cache when available.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedChats =
        localStorage.getItem(getChatSessionsStorageKey(userId)) ??
        (userId ? localStorage.getItem('qp_chatSessions') : null);

      if (savedChats) try { setChatSessions(JSON.parse(savedChats)); } catch {}
    }
  }, [userId]);

  useEffect(() => { 
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(getChatSessionsStorageKey(userId), JSON.stringify(chatSessions)); 
  }, [chatSessions, userId]);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadSessionsFromBackend = async () => {
      try {
        const res = await fetchWithAuth('/api/sessions/me', {
          allowInteractiveAuth: true,
        });

        if (!res.ok) return;

        const serverSessions: ServerSessionRecord[] = await res.json();
        if (cancelled || !Array.isArray(serverSessions)) return;

        setChatSessions(prev => {
          const localById = new Map(prev.map(session => [session.id, session]));
          const hydrated = serverSessions.map((session) => {
            return {
              id: session.id,
              connectionId: session.connectionId || localById.get(session.id)?.connectionId || "",
              title: session.title || localById.get(session.id)?.title || "New Chat",
              messages: [],
            } satisfies ChatSession;
          });

          return hydrated;
        });

        addLog("INFO", `Loaded ${serverSessions.length} chat session(s) from server.`);
      } catch {
        // Keep working from the local cache when backend hydration is unavailable.
      }
    };

    loadSessionsFromBackend();
    return () => { cancelled = true; };
  }, [addLog, fetchWithAuth, userId]);

  useEffect(() => {
    if (!userId) return;

    const activeSession = chatSessions.find(session => session.id === currentView);
    if (!activeSession || activeSession.messages.length > 0) {
      return;
    }

    let cancelled = false;

    const hydrateSessionTurns = async () => {
      try {
        const res = await fetchWithAuth(`/api/sessions/${activeSession.id}/turns`, {
          allowInteractiveAuth: true,
        });

        if (!res.ok) return;

        const turns: ServerConversationTurnRecord[] = await res.json();
        if (cancelled || !Array.isArray(turns)) return;

        const hydratedMessages: Message[] = [];
        turns.forEach((turn) => {
          const role = turn.role?.toLowerCase() === "user" ? "user" : "ai";

          if (role === "user") {
            hydratedMessages.push({
              id: `${turn.id}-user`,
              role: "user",
              content: turn.question,
            } satisfies Message);
            return;
          }

          const aiContent = turn.agentResponse || turn.summary || "Respuesta generada.";
          hydratedMessages.push({
            id: `${turn.id}-ai`,
            role: "ai",
            content: aiContent,
            insight: turn.summary || undefined,
            sql: turn.sqlGenerated || undefined,
            status: "Completed",
          } satisfies Message);
        });

        setChatSessions((prev) => prev.map((session) =>
          session.id === activeSession.id
            ? { ...session, messages: hydratedMessages }
            : session));
      } catch {
        // Leave the session as-is if turn hydration is unavailable.
      }
    };

    hydrateSessionTurns();
    return () => { cancelled = true; };
  }, [chatSessions, currentView, fetchWithAuth, userId]);

  const activeChatSession = chatSessions.find(c => c.id === currentView) || null;

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
  }, [activePoll, fetchWithAuth, addLog, currentView]);

  const handleSubmit = async () => {
    if (!input.trim() || !activeChatSession) return;

    const userMsg: Message = { id: Math.random().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    addLog("INFO", "Received user query: " + userMsg.content);

    const activeConnection = connections.find(c => c.id === activeChatSession.connectionId);
    
    try {
      const response = await fetchWithAuth("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsg.content,
          userId: userId,
          role: "FraudAnalyst",
          correlationId: crypto.randomUUID(),
          sessionId: activeChatSession.id,
          connectionId: activeConnection?.id,
          connection: activeConnection && !activeConnection.id ? {
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
    } catch (e: any) {
      addLog("ERROR", "Approval error: " + e.message);
    }
  };

  const createChatSession = async (connectionId: string, title = "New Chat") => {
    if (!userId) {
      throw new Error("No hay un usuario autenticado para crear la sesion.");
    }

    const requestedId = crypto.randomUUID();
    const res = await fetchWithAuth('/api/sessions', {
      allowInteractiveAuth: true,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: requestedId,
        userId,
        connectionId,
        title,
      }),
    });

    if (!res.ok) {
      let message = `No fue posible crear la sesion (HTTP ${res.status}).`;

      try {
        const raw = await res.text();
        if (raw) {
          try {
            const body = JSON.parse(raw);
            message = body.error || message;
          } catch {
            message = raw;
          }
        }
      } catch {
        // Keep the fallback message.
      }

      throw new Error(message);
    }

    const body = await res.json().catch(() => ({}));
    const persistedId = body.id || requestedId;
    const nextSession: ChatSession = {
      id: persistedId,
      connectionId,
      title,
      messages: [],
    };

    setChatSessions(prev => {
      const withoutRequested = prev.filter(session => session.id !== requestedId && session.id !== persistedId);
      return [...withoutRequested, nextSession];
    });

    return nextSession;
  };

  const deleteChatSession = async (sessionId: string) => {
    const res = await fetchWithAuth(`/api/sessions/${sessionId}`, {
      allowInteractiveAuth: true,
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error("No fue posible eliminar la sesion.");
    }

    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
  };

  return {
    chatSessions,
    setChatSessions,
    activeChatSession,
    activePoll,
    setActivePoll,
    input,
    setInput,
    isTyping,
    handleSubmit,
    handleApproval,
    createChatSession,
    deleteChatSession,
  };
}
