export function InsightPanel() {
  return (
    <section className="card">
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "#E3FCEF", padding: "8px", borderRadius: "8px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00875A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        </div>
        <h2 style={{ margin: 0 }}>Insight Ejecutivo</h2>
      </div>
      <div className="badge-row">
        <span className="badge badge-success">Validated</span>
        <span className="badge badge-warning">Risk: Medium</span>
        <span className="badge badge-info">Auto-executed</span>
      </div>
      <p>
        Se detectaron tres comercios con incremento material en tasa de chargeback. El caso más crítico multiplica por <strong>3.7</strong> su línea base reciente.
      </p>
      <div className="code">
{`merchant_id | merchant_name     | chargeback_rate | baseline_rate | delta_factor
M102        | Northwind Fuel    | 0.082           | 0.022         | 3.7
M394        | Global Supplies   | 0.045           | 0.012         | 3.5
M821        | Tech Haven        | 0.038           | 0.011         | 3.4`}
      </div>
    </section>
  );
}
