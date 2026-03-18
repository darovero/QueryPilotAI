type TracePanelProps = {
  instanceId: string | null;
  runtimeStatus: string;
  createdAt: string | null;
  lastUpdatedAt: string | null;
  sql: string | null;
};

export function TracePanel({ instanceId, runtimeStatus, createdAt, lastUpdatedAt, sql }: TracePanelProps) {
  return (
    <section className="card" style={{ marginTop: "32px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "var(--accent-soft)", padding: "12px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </div>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "var(--text)", letterSpacing: "-0.01em" }}>Transparencia y Trazabilidad</h2>
      </header>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr", 
        gap: "24px", 
        marginBottom: "32px", 
        padding: "20px", 
        background: "var(--bg)", 
        borderRadius: "var(--radius-md)", 
        border: "1px solid var(--line)" 
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>ID de Instancia</span>
          <span style={{ color: "var(--text)", fontSize: "14px", fontFamily: "var(--font-mono)", fontWeight: "600" }}>{instanceId?.substring(0, 12) ?? "PENDING"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Runtime</span>
          <span style={{ color: "var(--text)", fontSize: "14px", fontWeight: "600" }}>{runtimeStatus || "NotStarted"}</span>
        </div>
      </div>
      
      <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        Consulta SQL Generada
      </h3>
      <div className="code" style={{ 
        borderLeft: "4px solid var(--accent)", 
        background: "#0F172A", 
        color: "#F8FAFC", 
        borderRadius: "var(--radius-sm)", 
        padding: "24px", 
        fontSize: "13px",
        lineHeight: "1.6",
        fontFamily: "var(--font-mono)"
      }}>
        {sql ?? "-- La consulta SQL estará disponible tras completar el análisis semántico..."}
      </div>
    </section>
  );
}
