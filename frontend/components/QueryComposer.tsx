import { FormEvent, useState, useEffect, useRef } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type QueryComposerProps = {
  onSubmit: (question: string) => Promise<void>;
  isSubmitting: boolean;
  runtimeStatus: string;
  instanceId: string | null;
  error: string | null;
  chatHistory: ChatMessage[];
};

export function QueryComposer({ onSubmit, isSubmitting, runtimeStatus, instanceId, error, chatHistory }: QueryComposerProps) {
  const [question, setQuestion] = useState("¿Qué comercios muestran incremento anómalo de chargebacks en los últimos 7 días?");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isSubmitting]);

  const tips = [
    "Top 10 comercios por chargeback_rate",
    "Analiza delta_factor > 3",
    "Tendencia 7 días"
  ];

  async function submitCurrentQuestion() {
    const trimmed = question.trim();
    if (!trimmed || isSubmitting) return;
    await onSubmit(trimmed);
    setQuestion("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitCurrentQuestion();
  }

  return (
    <section className="card" style={{ height: "600px" }}>
      <div className="chat-container">
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "var(--accent-2)", boxShadow: "0 0 0 4px rgba(16, 185, 129, 0.15)" }}></div>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text)", margin: 0 }}>Grounded AI Chat</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="badge badge-info">GPT-4.1 + SQL</span>
          </div>
        </header>

        <div className="chat-history" ref={scrollRef}>
          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role}`}>
              <div className="chat-bubble">
                {msg.content}
              </div>
              <span style={{ fontSize: "10px", color: "var(--muted)", marginTop: "6px", fontWeight: "500" }}>
                {msg.timestamp}
              </span>
            </div>
          ))}

          {isSubmitting && (
            <div className="chat-message assistant">
              <div className="chat-bubble" style={{ background: "var(--accent-soft)", border: "1px solid rgba(37, 99, 235, 0.1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="typing-indicator" style={{ display: "flex", gap: "4px" }}>
                    <span style={{ animation: "pulse 1s infinite" }}></span>
                    <span style={{ animation: "pulse 1.25s infinite" }}></span>
                    <span style={{ animation: "pulse 1.5s infinite" }}></span>
                  </div>
                  <span style={{ color: "var(--accent)", fontSize: "13px", fontWeight: "600" }}>Analizando en Azure SQL...</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="chat-message assistant" style={{ opacity: 0.6 }}>
            <div className="chat-bubble" style={{ fontSize: "12px", borderStyle: "dashed", padding: "8px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                <span>Runtime: <strong>{runtimeStatus}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <form className="chat-input-wrapper" onSubmit={handleSubmit}>
          <div className="chat-tips" style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
            {tips.map((tip) => (
              <button
                key={tip}
                type="button"
                className="chat-tip-btn"
                onClick={() => setQuestion(tip)}
              >
                {tip}
              </button>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <textarea
              className="chat-input"
              placeholder="Explora tus datos con lenguaje natural..."
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitCurrentQuestion();
                }
              }}
              disabled={isSubmitting}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <button type="button" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }} title="Subir contexto">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              </button>
              <button type="button" style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer" }} title="Parámetros">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              </button>
            </div>
            {error && <span style={{ color: "#EF4444", fontSize: "12px", fontWeight: "600" }}>{error}</span>}
            <button 
              type="submit" 
              className="chat-send-btn" 
              disabled={isSubmitting || !question.trim()} 
              aria-label="Enviar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
