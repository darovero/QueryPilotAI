type AuditMetadata = {
  riskLevel: string;
  approvedBy: string | null;
};

type InsightResponse = {
  requestId: string;
  status: string;
  executiveSummary: string;
  keyFindings: string[];
  sql: string;
  warnings: string[];
  resultPreview: Array<Record<string, unknown>>;
  audit: AuditMetadata;
};

type InsightPanelProps = {
  runtimeStatus: string;
  output: InsightResponse | null;
};

function toTable(rows: Array<Record<string, unknown>>) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "Sin resultados";
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(" | ")];

  for (const row of rows) {
    lines.push(headers.map((header) => String(row[header] ?? "")).join(" | "));
  }

  return lines.join("\n");
}

export function InsightPanel({ runtimeStatus, output }: InsightPanelProps) {
  const normalizedRuntime = runtimeStatus || "NotStarted";
  const isCompleted = normalizedRuntime === "Completed";

  return (
    <section className="card" style={{ minHeight: "600px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ background: "var(--accent-soft)", padding: "12px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text)", letterSpacing: "-0.02em" }}>Insight Ejecutivo</h2>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "500" }}>Análisis de {new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <span className={`badge ${isCompleted ? "badge-success" : "badge-info"}`}>{normalizedRuntime}</span>
      </header>

      <div className="badge-row" style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Nivel de Riesgo</span>
          <span className="badge badge-warning" style={{ alignSelf: "flex-start", fontSize: "12px" }}>{output?.audit?.riskLevel ?? "Evaluando..."}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginLeft: "32px" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Estado Cargo</span>
          <span className="badge badge-info" style={{ alignSelf: "flex-start", fontSize: "12px" }}>{output?.status ?? "Procesando"}</span>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ padding: "0 4px" }}>
          <p style={{ fontSize: "16px", lineHeight: "1.8", color: output?.executiveSummary ? "var(--text)" : "var(--muted)", fontWeight: "500" }}>
            {output?.executiveSummary ?? "La orquestación inteligente está procesando tu consulta para extraer los hallazgos clave..."}
          </p>
        </div>
        
        {isCompleted && output && (
          <div style={{ marginTop: "32px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3zM3 9h18M9 3v18"/></svg>
              Sincronización de Datos
            </h3>
            <div className="code" style={{ maxHeight: "350px", overflow: "auto", border: "1px solid var(--line)", background: "rgba(248, 250, 252, 0.5)" }}>
              {toTable(output.resultPreview ?? [])}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
