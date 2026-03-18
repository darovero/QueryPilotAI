import { useState } from "react";

type ApprovalPanelProps = {
  instanceId: string;
  sql: string;
  riskLevel: string;
  reasons: string[];
  onApprovalSent: () => void;
};

export function ApprovalPanel({ instanceId, sql, riskLevel, reasons, onApprovalSent }: ApprovalPanelProps) {
  const [isSending, setIsSending] = useState(false);
  const [comments, setComments] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleDecision(decision: "Approved" | "Rejected") {
    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch(`/api/query/${instanceId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          approverUserId: "jessy@demo.com",
          comments: comments.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setResult({
        success: true,
        message: decision === "Approved"
          ? "✅ Consulta aprobada. Ejecutando SQL..."
          : "🚫 Consulta rechazada. El SQL no será ejecutado.",
      });

      onApprovalSent();
    } catch (error) {
      setResult({
        success: false,
        message: `Error al enviar decisión: ${error instanceof Error ? error.message : "desconocido"}`,
      });
    } finally {
      setIsSending(false);
    }
  }

  const riskColor = riskLevel === "Critical" ? "#DC2626" : riskLevel === "High" ? "#F59E0B" : "#3B82F6";
  const riskBg = riskLevel === "Critical" ? "#FEF2F2" : riskLevel === "High" ? "#FFFBEB" : "#EFF6FF";

  return (
    <section className="card" style={{
      border: `2px solid ${riskColor}30`,
      background: `linear-gradient(to bottom right, ${riskBg}, #FFFFFF)`,
    }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <div style={{
          background: `${riskColor}15`, padding: "14px", borderRadius: "16px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={riskColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text)", letterSpacing: "-0.02em" }}>
            Aprobación Requerida
          </h2>
          <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: "500" }}>
            La consulta contiene datos sensibles que requieren revisión
          </span>
        </div>
      </header>

      {/* Risk Badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px",
        padding: "12px 16px", borderRadius: "var(--radius-md)",
        backgroundColor: `${riskColor}08`, border: `1px solid ${riskColor}20`,
      }}>
        <div style={{
          width: "10px", height: "10px", borderRadius: "50%",
          backgroundColor: riskColor, boxShadow: `0 0 8px ${riskColor}60`,
          animation: "pulse 2s infinite",
        }} />
        <span style={{ fontSize: "14px", fontWeight: "700", color: riskColor }}>
          Nivel de Riesgo: {riskLevel}
        </span>
      </div>

      {/* Reasons */}
      {reasons.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Motivo de la revisión
          </h3>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", color: "var(--text)", lineHeight: "1.8" }}>
            {reasons.map((r, i) => <li key={i} style={{ fontWeight: "500" }}>{r}</li>)}
          </ul>
        </div>
      )}

      {/* SQL Preview */}
      <div style={{ marginBottom: "20px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--text)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          SQL para revisión
        </h3>
        <div style={{
          borderLeft: `4px solid ${riskColor}`, background: "#0F172A", color: "#F8FAFC",
          borderRadius: "var(--radius-sm)", padding: "16px", fontSize: "12px",
          lineHeight: "1.6", fontFamily: "var(--font-mono)", maxHeight: "180px",
          overflow: "auto", whiteSpace: "pre-wrap",
        }}>
          {sql || "-- SQL no disponible"}
        </div>
      </div>

      {/* Comments */}
      <div style={{ marginBottom: "20px" }}>
        <label style={{ fontSize: "13px", fontWeight: "700", color: "var(--text)", display: "block", marginBottom: "8px" }}>
          Comentarios (opcional)
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Motivo de aprobación o rechazo..."
          disabled={isSending || result !== null}
          style={{
            width: "100%", padding: "12px 16px", border: "1px solid var(--line)",
            borderRadius: "var(--radius-md)", fontSize: "14px", resize: "none",
            minHeight: "60px", fontFamily: "inherit", background: "#FFF",
          }}
        />
      </div>

      {/* Actions */}
      {!result ? (
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={() => handleDecision("Approved")}
            disabled={isSending}
            style={{
              flex: 1, padding: "14px 24px", border: "none", borderRadius: "var(--radius-md)",
              fontSize: "15px", fontWeight: "700", cursor: "pointer",
              background: "#10B981", color: "#FFF",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              transition: "all 0.2s ease", opacity: isSending ? 0.6 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {isSending ? "Enviando..." : "Aprobar y Ejecutar"}
          </button>
          <button
            type="button"
            onClick={() => handleDecision("Rejected")}
            disabled={isSending}
            style={{
              flex: 1, padding: "14px 24px", border: "1px solid #EF4444", borderRadius: "var(--radius-md)",
              fontSize: "15px", fontWeight: "700", cursor: "pointer",
              background: "#FFF", color: "#EF4444",
              transition: "all 0.2s ease", opacity: isSending ? 0.6 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            {isSending ? "Enviando..." : "Rechazar"}
          </button>
        </div>
      ) : (
        <div style={{
          padding: "16px", borderRadius: "var(--radius-md)", fontSize: "14px", fontWeight: "600",
          textAlign: "center",
          backgroundColor: result.success ? "#F0FDF4" : "#FEF2F2",
          color: result.success ? "#166534" : "#991B1B",
          border: `1px solid ${result.success ? "#BBF7D0" : "#FECACA"}`,
        }}>
          {result.message}
        </div>
      )}
    </section>
  );
}
