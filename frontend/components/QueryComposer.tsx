export function QueryComposer() {
  return (
    <section className="card" style={{ height: "100%", padding: "20px" }}>
      <div className="chat-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#172B4D", margin: 0 }}>Grounded AI Chat</h2>
          <span className="badge badge-info">Model: GPT-4o + SQL</span>
        </div>

        <div className="chat-history">
          <div className="chat-message assistant">
            <div className="chat-bubble">
              Hola, soy tu asistente de ingeniería analítica. ¿En qué puedo ayudarte hoy con el análisis de fraude?
            </div>
          </div>
          <div className="chat-message user">
            <div className="chat-bubble">
              ¿Qué comercios muestran incremento anómalo de chargebacks en los últimos 7 días?
            </div>
          </div>
          <div className="chat-message assistant">
            <div className="chat-bubble">
              Analizando incrementos anómalos. He identificado 3 comercios con variaciones significativas. Revisando la transparencia a continuación...
            </div>
          </div>
        </div>

        <div className="chat-input-wrapper">
          <div className="chat-tips">
            <button className="chat-tip-btn">📈 Top 10 Chargebacks</button>
            <button className="chat-tip-btn">🔍 Análisis de Comercio M102</button>
            <button className="chat-tip-btn">🛡️ Validar Reglas</button>
          </div>
          <textarea 
            className="chat-input" 
            placeholder="Escribe tu consulta analítica aquí..."
            defaultValue=""
          />
          <div className="chat-actions">
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ background: "none", border: "none", color: "#6B778C", cursor: "pointer" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </button>
            </div>
            <button className="chat-send-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
