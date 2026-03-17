import { QueryComposer } from "../../components/QueryComposer";
import { InsightPanel } from "../../components/InsightPanel";
import { TracePanel } from "../../components/TracePanel";

export default function DashboardPage() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">InsightForge AI</p>
          <h1>Fraud Analytics Engineering Agent</h1>
          <p className="subtitle">Pregunta. Valida. Explica. Audita.</p>
        </div>
      </section>

      <section className="grid">
        <QueryComposer />
        <InsightPanel />
        <TracePanel />
      </section>
    </main>
  );
}
