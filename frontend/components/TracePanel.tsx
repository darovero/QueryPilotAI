type TracePanelProps = {
  instanceId: string | null;
  runtimeStatus: string;
  createdAt: string | null;
  lastUpdatedAt: string | null;
  sql: string | null;
};

export function TracePanel({ instanceId, runtimeStatus, createdAt, lastUpdatedAt, sql }: TracePanelProps) {
  return (
    <section className="card">
      <h2>Transparencia</h2>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
        <div><strong style={{ color: "#42526E", display: "inline-block", width: "120px" }}>InstanceId:</strong> <span style={{ color: "#172B4D" }}>{instanceId ?? "N/A"}</span></div>
        <div><strong style={{ color: "#42526E", display: "inline-block", width: "120px" }}>Runtime:</strong> <span style={{ color: "#172B4D" }}>{runtimeStatus || "NotStarted"}</span></div>
        <div><strong style={{ color: "#42526E", display: "inline-block", width: "120px" }}>Created:</strong> <span style={{ color: "#172B4D" }}>{createdAt ?? "N/A"}</span></div>
        <div><strong style={{ color: "#42526E", display: "inline-block", width: "120px" }}>Updated:</strong> <span style={{ color: "#172B4D" }}>{lastUpdatedAt ?? "N/A"}</span></div>
      </div>
      
      <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#172B4D", marginTop: "16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        Generated SQL
      </h3>
      <div className="code" style={{ borderLeft: "4px solid #F2994A", borderRadius: "4px" }}>
{sql ?? "SQL todavia no disponible"}
      </div>
    </section>
  );
}
