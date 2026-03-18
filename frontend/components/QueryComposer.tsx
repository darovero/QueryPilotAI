"use client";

import { FormEvent, useState } from "react";

type QueryComposerProps = {
  onSubmit: (question: string) => Promise<void>;
  isSubmitting: boolean;
  runtimeStatus: string;
  instanceId: string | null;
  error: string | null;
  assistantMessage: string | null;
};

export function QueryComposer({ onSubmit, isSubmitting, runtimeStatus, instanceId, error, assistantMessage }: QueryComposerProps) {
  const [question, setQuestion] = useState("Que comercios muestran incremento anomalo de chargebacks en los ultimos 7 dias?");

  const tips = [
    "Top 10 comercios por chargeback_rate",
    "Muestrame comercios con delta_factor > 3",
    "Analiza tendencia de chargebacks de los ultimos 7 dias"
  ];

  async function submitCurrentQuestion() {
    const trimmed = question.trim();
    if (!trimmed || isSubmitting) {
      return;
    }

    await onSubmit(trimmed);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await submitCurrentQuestion();
  }

  return (
    <section className="card" style={{ height: "100%", padding: "20px" }}>
      <div className="chat-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#172B4D", margin: 0 }}>Grounded AI Chat</h2>
          <span className="badge badge-info">Model: gpt-4.1-mini + SQL</span>
        </div>

        <div className="chat-history">
          <div className="chat-message assistant">
            <div className="chat-bubble">
              Preguntame en lenguaje natural y voy a orquestar el flujo gobernado en Azure.
            </div>
          </div>
          <div className="chat-message user">
            <div className="chat-bubble">
              {question || "Escribe una consulta para comenzar"}
            </div>
          </div>
          <div className="chat-message assistant">
            <div className="chat-bubble">
              Estado actual: <strong>{runtimeStatus}</strong>{instanceId ? ` (instanceId: ${instanceId})` : ""}
            </div>
          </div>
          {isSubmitting ? (
            <div className="chat-message assistant">
              <div className="chat-bubble">
                Procesando tu consulta y ejecutando analisis sobre Azure SQL...
              </div>
            </div>
          ) : null}
          {assistantMessage ? (
            <div className="chat-message assistant">
              <div className="chat-bubble">
                {assistantMessage}
              </div>
            </div>
          ) : null}
        </div>

        <form className="chat-input-wrapper" onSubmit={handleSubmit}>
          <div className="chat-tips">
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
          <textarea
            className="chat-input"
            placeholder="Escribe tu consulta analítica aquí..."
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
          {error ? <p style={{ color: "#DE350B", margin: "8px 0 0" }}>{error}</p> : null}
          <div className="chat-actions">
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" style={{ background: "none", border: "none", color: "#6B778C", cursor: "pointer" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </button>
            </div>
            <button type="submit" className="chat-send-btn" disabled={isSubmitting} aria-label="Enviar consulta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
