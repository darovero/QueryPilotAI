export function TracePanel() {
  return (
    <section className="card">
      <h2>Transparencia</h2>
      <p><strong>Intent:</strong> anomaly_detection</p>
      <p><strong>Metric:</strong> chargeback_rate</p>
      <p><strong>Dimensions:</strong> merchant</p>
      <p><strong>Window:</strong> last_7_days vs last_30_days</p>
      <div className="code">
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
