export function QueryComposer() {
  return (
    <section className="card">
      <h2>Consulta</h2>
      <p>Ejemplo: ¿Qué comercios muestran incremento anómalo de chargebacks en los últimos 7 días vs promedio de 30 días?</p>
      <textarea defaultValue="¿Qué comercios muestran incremento anómalo de chargebacks en los últimos 7 días comparado con el promedio de 30 días?" />
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button>Analizar</button>
        <span className="badge">Role: FraudAnalyst</span>
      </div>
    </section>
  );
}
