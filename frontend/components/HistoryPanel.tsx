"use client";

import { useEffect, useState } from "react";

type AuditRecord = {
  requestId: string;
  userId: string;
  roleName: string;
  originalQuestion: string;
  status: string;
  generatedSql: string | null;
  createdAt: string;
  completedAt: string | null;
};

export function HistoryPanel() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch("/api/history");
        if (!res.ok) throw new Error("No se pudo cargar el historial.");
        const data = await res.json();
        setRecords(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }

    void fetchHistory();
  }, []);

  if (loading) return <div style={{ padding: "40px", color: "var(--text)" }}>Cargando historial de auditoría...</div>;
  if (error) return <div style={{ padding: "40px", color: "#EF4444" }}>Error: {error}</div>;
  if (records.length === 0) return <div style={{ padding: "40px", color: "var(--text)" }}>No hay registros de auditoría.</div>;

  return (
    <section className="card" style={{ maxWidth: "1200px", margin: "40px auto" }}>
      <header style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ background: "var(--accent-soft)", padding: "12px", borderRadius: "14px", color: "var(--accent)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="12 8 12 12 14 14" /><circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "var(--text)" }}>Historial de Consultas</h2>
          <span style={{ fontSize: "14px", color: "var(--muted)" }}>Registro de auditoría de todas las consultas ejecutadas</span>
        </div>
      </header>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", color: "var(--text)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)", textAlign: "left", color: "var(--muted)" }}>
              <th style={{ padding: "12px 16px", fontWeight: "700" }}>Fecha</th>
              <th style={{ padding: "12px 16px", fontWeight: "700" }}>Pregunta Orig.</th>
              <th style={{ padding: "12px 16px", fontWeight: "700" }}>Usuario</th>
              <th style={{ padding: "12px 16px", fontWeight: "700" }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => (
              <tr key={record.requestId} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "16px", whiteSpace: "nowrap" }}>
                  {new Date(record.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: "16px", maxWidth: "400px" }}>
                  <div style={{ fontWeight: "600", marginBottom: "4px" }}>{record.originalQuestion}</div>
                  {record.generatedSql && (
                    <div style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {record.generatedSql}
                    </div>
                  )}
                </td>
                <td style={{ padding: "16px" }}>
                  <div style={{ fontWeight: "500" }}>{record.userId}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>{record.roleName}</div>
                </td>
                <td style={{ padding: "16px" }}>
                  <span className={`badge ${
                    record.status === "Completed" ? "badge-success" :
                    record.status === "PendingApproval" ? "badge-warning" :
                    record.status === "Blocked" || record.status === "PolicyBlocked" || record.status === "Rejected" ? "badge-error" : "badge-info"
                  }`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
