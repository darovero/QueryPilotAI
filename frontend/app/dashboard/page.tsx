"use client";

import { useState } from "react";
import { QueryComposer } from "../../components/QueryComposer";
import { InsightPanel } from "../../components/InsightPanel";
import { TracePanel } from "../../components/TracePanel";

export default function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "18px", color: "#172B4D", marginBottom: "32px", paddingLeft: "8px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#2563eb"/>
            <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          InsightForge
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="sidebar-item">
            <svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4M10 9h4M10 13h4"/></svg>
            Organization
          </a>
          <a href="#" className="sidebar-item">
            <svg viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
            API
          </a>
          <a href="#" className="sidebar-item">
            <svg viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
            Integrations
          </a>
          <a href="#" className="sidebar-item">
            <svg viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            Conversations
            <span className="v2-badge">V2</span>
          </a>
          <a href="#" className="sidebar-item active">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Dashboard
          </a>
          <a href="#" className="sidebar-item">
            <svg viewBox="0 0 24 24"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>
            Agent Management
          </a>
        </nav>

        <button className="sidebar-btn">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Chat
          </div>
          <span className="v2-badge">V2</span>
        </button>
      </aside>

      {/* Main Content */}
      <div className="dashboard-main">
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", backgroundColor: "#FFFFFF", borderBottom: "1px solid #DFE1E6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? "Mostrar sidebar" : "Ocultar sidebar"}
              aria-expanded={!sidebarCollapsed}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {sidebarCollapsed ? (
                  <path d="M4 6h16M4 12h16M4 18h7" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
              <span>{sidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}</span>
            </button>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: "14px", color: "#172B4D", fontWeight: "600" }}>Jessy Admin</span>
              <span style={{ fontSize: "12px", color: "#6B778C" }}>Fraud Analyst Role</span>
            </div>
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: "#2563eb", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "600", boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)" }}>
              JA
            </div>
          </div>
        </header>

        <main style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          <div style={{ marginBottom: "24px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "600", color: "#172B4D", marginBottom: "8px" }}>Fraud Analytics Engineering Workspace</h1>
            <p style={{ fontSize: "14px", color: "#5E6C84", margin: 0 }}>Natural language to trusted SQL insights</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <QueryComposer />
              <TracePanel />
            </div>
            <div>
              <InsightPanel />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
