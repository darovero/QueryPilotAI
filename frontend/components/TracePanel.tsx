import { useEffect, useState } from "react";

type PipelineStepData = {
  step: string;
  label: string;
  status: string;
  timestamp: string;
};

type TracePanelProps = {
  instanceId: string | null;
  runtimeStatus: string;
  createdAt: string | null;
  lastUpdatedAt: string | null;
  sql: string | null;
  customStatus: PipelineStepData | null;
};

const PIPELINE_STEPS = [
  { key: "safety_check", label: "Verificación de Seguridad", icon: "🛡️" },
  { key: "conversation_context", label: "Contexto Conversacional", icon: "💬" },
  { key: "intent_parsing", label: "Descomposición de Intención", icon: "🧠" },
  { key: "sql_generation", label: "Generación de SQL", icon: "⚡" },
  { key: "sql_validation", label: "Validación y Política", icon: "✅" },
  { key: "approval", label: "Aprobación Humana", icon: "👤" },
  { key: "sql_execution", label: "Ejecución en Azure SQL", icon: "🗄️" },
  { key: "summarize", label: "Resumen Ejecutivo", icon: "📊" },
];

function getStepStatus(
  stepKey: string,
  currentStep: PipelineStepData | null,
  runtimeStatus: string
): "pending" | "active" | "completed" | "failed" | "skipped" {
  if (!currentStep || runtimeStatus === "NotStarted") return "pending";

  const currentIndex = PIPELINE_STEPS.findIndex(s => s.key === currentStep.step);
  const thisIndex = PIPELINE_STEPS.findIndex(s => s.key === stepKey);

  if (stepKey === currentStep.step) {
    if (currentStep.status === "Failed") return "failed";
    if (currentStep.status === "Completed") return "completed";
    return "active";
  }

  if (thisIndex < currentIndex) return "completed";

  if (runtimeStatus === "Completed") {
    if (stepKey === "approval") return "skipped";
    return "completed";
  }

  if (runtimeStatus === "Failed" || runtimeStatus === "Terminated") {
    if (thisIndex > currentIndex) return "pending";
  }

  return "pending";
}

export function TracePanel({ instanceId, runtimeStatus, createdAt, lastUpdatedAt, sql, customStatus }: TracePanelProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isRunning = runtimeStatus === "Running";

  useEffect(() => {
    if (!isRunning || !createdAt) {
      setElapsedSeconds(0);
      return;
    }

    const start = new Date(createdAt).getTime();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning, createdAt]);

  const normalizedRuntime = runtimeStatus || "NotStarted";

  const statusColor: Record<string, string> = {
    completed: "#10B981",
    active: "#2563EB",
    failed: "#EF4444",
    pending: "#94A3B8",
    skipped: "#64748B",
  };

  const statusIcon: Record<string, string> = {
    completed: "✓",
    active: "●",
    failed: "✕",
    pending: "○",
    skipped: "—",
  };

  return (
    <section className="card" style={{ marginTop: "0" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            background: "var(--accent-soft)", padding: "12px", borderRadius: "14px",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)"
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "var(--text)", letterSpacing: "-0.01em" }}>
              Pipeline Gobernado
            </h2>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "500" }}>
              Transparencia y trazabilidad en tiempo real
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isRunning && (
            <span style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--accent)", fontWeight: "700" }}>
              {elapsedSeconds}s
            </span>
          )}
          <span className={`badge ${normalizedRuntime === "Completed" ? "badge-success" : normalizedRuntime === "Running" ? "badge-info" : "badge-warning"}`}>
            {normalizedRuntime}
          </span>
        </div>
      </header>

      {/* Pipeline Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "24px" }}>
        {PIPELINE_STEPS.map((step, idx) => {
          const status = getStepStatus(step.key, customStatus, normalizedRuntime);
          const isLast = idx === PIPELINE_STEPS.length - 1;

          return (
            <div key={step.key} style={{ display: "flex", alignItems: "stretch", gap: "16px" }}>
              {/* Connector line + status dot */}
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", width: "32px", flexShrink: 0
              }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  backgroundColor: status === "active" ? statusColor[status] : "transparent",
                  border: `2.5px solid ${statusColor[status]}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: "800",
                  color: status === "active" ? "#FFF" : statusColor[status],
                  transition: "all 0.3s ease",
                  animation: status === "active" ? "pulse 2s infinite" : "none",
                  boxShadow: status === "active" ? `0 0 12px ${statusColor[status]}40` : "none",
                  flexShrink: 0,
                }}>
                  {statusIcon[status]}
                </div>
                {!isLast && (
                  <div style={{
                    width: "2px", flex: 1, minHeight: "12px",
                    backgroundColor: status === "completed" || status === "skipped" ? statusColor.completed + "50" : "var(--line)",
                    transition: "background-color 0.3s ease"
                  }} />
                )}
              </div>

              {/* Step content */}
              <div style={{
                flex: 1, padding: "4px 0 16px",
                opacity: status === "pending" ? 0.4 : status === "skipped" ? 0.5 : 1,
                transition: "opacity 0.3s ease"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "15px" }}>{step.icon}</span>
                  <span style={{
                    fontSize: "14px", fontWeight: "700",
                    color: status === "active" ? "var(--accent)" : status === "failed" ? "#EF4444" : "var(--text)",
                  }}>
                    {step.label}
                  </span>
                  {status === "skipped" && (
                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>Omitido</span>
                  )}
                </div>
                {customStatus?.step === step.key && customStatus.label && (
                  <p style={{
                    margin: "4px 0 0", fontSize: "12px", fontWeight: "500",
                    color: status === "failed" ? "#EF4444" : "var(--muted)"
                  }}>
                    {customStatus.label}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Metadata Grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px",
        padding: "16px", background: "var(--bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--line)"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "10px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            ID Instancia
          </span>
          <span style={{ color: "var(--text)", fontSize: "13px", fontFamily: "var(--font-mono)", fontWeight: "600" }}>
            {instanceId?.substring(0, 12) ?? "PENDING"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "10px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Última actualización
          </span>
          <span style={{ color: "var(--text)", fontSize: "13px", fontWeight: "600" }}>
            {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "—"}
          </span>
        </div>
      </div>

      {/* SQL Preview */}
      {sql && (
        <div style={{ marginTop: "20px" }}>
          <h3 style={{
            fontSize: "13px", fontWeight: "700", color: "var(--text)", marginBottom: "10px",
            display: "flex", alignItems: "center", gap: "8px"
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
            SQL Generado
          </h3>
          <div style={{
            borderLeft: "4px solid var(--accent)", background: "#0F172A", color: "#F8FAFC",
            borderRadius: "var(--radius-sm)", padding: "16px", fontSize: "12px",
            lineHeight: "1.6", fontFamily: "var(--font-mono)", maxHeight: "200px",
            overflow: "auto", whiteSpace: "pre-wrap"
          }}>
            {sql}
          </div>
        </div>
      )}
    </section>
  );
}
