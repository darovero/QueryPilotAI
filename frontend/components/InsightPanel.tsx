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
    <section className="card">
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "#E3FCEF", padding: "8px", borderRadius: "8px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00875A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <h2 style={{ margin: 0 }}>Insight Ejecutivo</h2>
      </div>
      <div className="badge-row">
        <span className="badge badge-success">Runtime: {normalizedRuntime}</span>
        <span className="badge badge-warning">Risk: {output?.audit?.riskLevel ?? "N/A"}</span>
        <span className="badge badge-info">Status: {output?.status ?? "Pending"}</span>
      </div>
      <p>{output?.executiveSummary ?? "Esperando resultado de la orquestacion..."}</p>
      <div className="code">
    {isCompleted && output ? toTable(output.resultPreview ?? []) : "Sin datos todavia"}
      </div>
    </section>
  );
}
