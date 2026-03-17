export function TracePanel() {
  return (
    <section className="card">
      <h2>Transparencia</h2>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
        <div><strong style={{ color: "#42526E", display: "inline-block", width: "90px" }}>Intent:</strong> <span style={{ color: "#172B4D" }}>anomaly_detection</span></div>
        <div><strong style={{ color: "#42526E", display: "inline-block", width: "90px" }}>Metric:</strong> <span style={{ color: "#172B4D" }}>chargeback_rate</span></div>
        <div><strong style={{ color: "#42526E", display: "inline-block", width: "90px" }}>Dimensions:</strong> <span style={{ color: "#172B4D" }}>merchant</span></div>
        <div><strong style={{ color: "#42526E", display: "inline-block", width: "90px" }}>Window:</strong> <span style={{ color: "#172B4D" }}>last_7_days vs last_30_days</span></div>
      </div>
      
      <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#172B4D", marginTop: "16px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        Generated SQL
      </h3>
      <div className="code" style={{ borderLeft: "4px solid #F2994A", borderRadius: "4px" }}>
{`SELECT TOP 50
    merchant_id,
    merchant_name,
    chargeback_rate,
    baseline_rate,
    delta_factor
FROM dbo.vw_merchant_chargeback_trends
WHERE observation_window = 'last_7_days'
ORDER BY delta_factor DESC`}
      </div>
    </section>
  );
}
