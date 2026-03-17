export function InsightPanel() {
  return (
    <section className="card">
      <h2>Insight Ejecutivo</h2>
      <div>
        <span className="badge">Validated</span>
        <span className="badge">Risk: Medium</span>
        <span className="badge">Auto-executed</span>
      </div>
      <p style={{ marginTop: 16 }}>
        Se detectaron tres comercios con incremento material en tasa de chargeback. El caso más crítico multiplica por 3.7 su línea base reciente.
      </p>
      <div className="code">
        merchant_id | merchant_name     | chargeback_rate | baseline_rate | delta_factor{"\n"}
        M102        | Northwind Fuel    | 0.082           | 0.022         | 3.7
      </div>
    </section>
  );
}
