import { HistoryPanel } from "../../../components/HistoryPanel";

export default function HistoryPage() {
  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", padding: "40px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", marginBottom: "20px" }}>
        <a href="/dashboard" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Volver al Dashboard
        </a>
      </div>
      <HistoryPanel />
    </div>
  );
}
