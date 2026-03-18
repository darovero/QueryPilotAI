"use client";

import { useEffect, useState } from "react";
import { QueryComposer } from "../../components/QueryComposer";
import { InsightPanel } from "../../components/InsightPanel";
import { TracePanel } from "../../components/TracePanel";
import { ApprovalPanel } from "../../components/ApprovalPanel";
import { readOnboardingState } from "../../lib/onboardingState";

type AuditMetadata = {
  riskLevel: string;
  approvedBy: string | null;
};

type InsightResponse = {
  requestId: string;
  status: string;
  executiveSummary: string;
  keyFindings: string[];
  sql: string;
  warnings: string[];
  resultPreview: Array<Record<string, unknown>>;
  audit: AuditMetadata;
};

type PipelineStepData = {
  step: string;
  label: string;
  status: string;
  timestamp: string;
};

type OrchestrationStatusResponse = {
  instanceId: string;
  runtimeStatus: string;
  createdAt: string;
  lastUpdatedAt: string;
  customStatus: PipelineStepData | null;
  output: InsightResponse | string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type ConnectionSnapshot = {
  organizationName?: string;
  dbLabel?: string;
  host?: string;
  tested?: boolean;
};

const FINAL_STATUSES = new Set(["Completed", "Failed", "Terminated"]);
const APPROVAL_STATUSES = new Set(["PendingApproval"]);

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function asRowArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function normalizeInsightResponse(input: unknown): InsightResponse | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const auditRaw = (record.audit ?? record.Audit) as Record<string, unknown> | undefined;

  return {
    requestId: asString(record.requestId ?? record.RequestId, ""),
    status: asString(record.status ?? record.Status, "Pending"),
    executiveSummary: asString(record.executiveSummary ?? record.ExecutiveSummary, ""),
    keyFindings: asStringArray(record.keyFindings ?? record.KeyFindings),
    sql: asString(record.sql ?? record.Sql, ""),
    warnings: asStringArray(record.warnings ?? record.Warnings),
    resultPreview: asRowArray(record.resultPreview ?? record.ResultPreview),
    audit: {
      riskLevel: asString(auditRaw?.riskLevel ?? auditRaw?.RiskLevel, "N/A"),
      approvedBy: typeof (auditRaw?.approvedBy ?? auditRaw?.ApprovedBy) === "string"
        ? String(auditRaw?.approvedBy ?? auditRaw?.ApprovedBy)
        : null
    }
  };
}

function parseOutput(output: InsightResponse | string | null | undefined): InsightResponse | null {
  if (!output) {
    return null;
  }

  if (typeof output !== "string") {
    return normalizeInsightResponse(output);
  }

  try {
    return normalizeInsightResponse(JSON.parse(output));
  } catch {
    return null;
  }
}

function parseCustomStatus(raw: unknown): PipelineStepData | null {
  if (!raw || typeof raw !== "object") return null;
  const cs = raw as Record<string, unknown>;
  if (typeof cs.step !== "string") return null;
  return {
    step: cs.step as string,
    label: (cs.label as string) ?? "",
    status: (cs.status as string) ?? "Active",
    timestamp: (cs.timestamp as string) ?? "",
  };
}

export default function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OrchestrationStatusResponse | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [connectionSnapshot, setConnectionSnapshot] = useState<ConnectionSnapshot>({});
  const [sessionId, setSessionId] = useState<string>("");
  const [approvalSent, setApprovalSent] = useState(false);

  useEffect(() => {
    // Inicializar mensaje de bienvenida solo en el cliente para evitar Hydration Error
    setChatHistory([
      {
        role: "assistant",
        content: "Hola, soy tu asistente analítico. Pregúntame en lenguaje natural y orquestaré el análisis sobre tus datos.",
        timestamp: new Date().toLocaleTimeString()
      }
    ]);

    const state = readOnboardingState();
    setConnectionSnapshot({
      organizationName: state.organizationName,
      dbLabel: state.connection?.dbLabel,
      host: state.connection?.host,
      tested: state.connection?.tested
    });

    const existingSessionId = window.localStorage.getItem("querypilot.chat.sessionId");
    if (existingSessionId) {
      setSessionId(existingSessionId);
      return;
    }

    const generatedSessionId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session-${Date.now()}`;

    window.localStorage.setItem("querypilot.chat.sessionId", generatedSessionId);
    setSessionId(generatedSessionId);
  }, []);

  async function fetchStatus(instanceId: string) {
    const response = await fetch(`/api/query/${instanceId}`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`No se pudo consultar estado. HTTP ${response.status}`);
    }

    return (await response.json()) as OrchestrationStatusResponse;
  }

  async function submitQuery(question: string) {
    setIsSubmitting(true);
    setError(null);
    setStatus(null);
    setApprovalSent(false);

    const userMessage: ChatMessage = {
      role: "user",
      content: question,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question,
          userId: "jessy@demo.com",
          role: "FraudAnalyst",
          correlationId: `ui-${Date.now()}`,
          sessionId: sessionId || "ui-fallback-session"
        })
      });

      if (!response.ok) {
        throw new Error(`Error enviando consulta. HTTP ${response.status}`);
      }

      const intake = (await response.json()) as { instanceId: string };
      let attempts = 0;
      let lastParsedOutput: InsightResponse | null = null;

      while (attempts < 60) {
        const current = await fetchStatus(intake.instanceId);
        setStatus(current);
        
        const currentParsed = parseOutput(current.output);
        if (currentParsed && currentParsed.executiveSummary && currentParsed.executiveSummary !== lastParsedOutput?.executiveSummary) {
          lastParsedOutput = currentParsed;
        }

        // Stop polling if completed or needs approval
        if (FINAL_STATUSES.has(current.runtimeStatus)) {
          if (lastParsedOutput) {
            const assistantMessage: ChatMessage = {
              role: "assistant",
              content: lastParsedOutput.executiveSummary,
              timestamp: new Date().toLocaleTimeString()
            };
            setChatHistory(prev => [...prev, assistantMessage]);
          }
          break;
        }

        // If orchestrator is waiting for approval, stop polling (user must approve)
        const parsedStatus = parseOutput(current.output);
        if (parsedStatus && APPROVAL_STATUSES.has(parsedStatus.status)) {
          setChatHistory(prev => [...prev, {
            role: "assistant",
            content: "⚠️ Esta consulta requiere aprobación humana porque accede a datos sensibles. Revisa el panel de aprobación.",
            timestamp: new Date().toLocaleTimeString()
          }]);
          break;
        }

        attempts += 1;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (caught) {
      const errorMsg = caught instanceof Error ? caught.message : "Error no controlado al consultar el servicio.";
      setError(errorMsg);
      setChatHistory(prev => [...prev, {
        role: "assistant",
        content: `Error: ${errorMsg}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Resume polling after approval is sent
  useEffect(() => {
    if (!approvalSent || !status?.instanceId) return;

    let cancelled = false;

    async function pollAfterApproval() {
      let attempts = 0;
      while (!cancelled && attempts < 40) {
        try {
          const current = await fetchStatus(status!.instanceId);
          setStatus(current);

          if (FINAL_STATUSES.has(current.runtimeStatus)) {
            const parsed = parseOutput(current.output);
            if (parsed?.executiveSummary) {
              setChatHistory(prev => [...prev, {
                role: "assistant",
                content: parsed.executiveSummary,
                timestamp: new Date().toLocaleTimeString()
              }]);
            }
            break;
          }
        } catch {
          // Ignore polling errors
        }
        attempts++;
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    void pollAfterApproval();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvalSent]);

  const parsedOutput = parseOutput(status?.output);
  const customStatus = parseCustomStatus(status?.customStatus);
  const isPendingApproval = parsedOutput?.status === "PendingApproval";

  return (
    <div className={`dashboard-layout ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "800", fontSize: "20px", color: "var(--text)", marginBottom: "40px", paddingLeft: "8px", letterSpacing: "-0.03em" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="var(--accent)"/>
            <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          QueryPilot <span style={{ color: "var(--accent)" }}>AI</span>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="sidebar-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4M10 9h4M10 13h4"/></svg>
            Organización
          </a>
          <a href="#" className="sidebar-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
            Fuentes de Datos
          </a>
          <a href="#" className="sidebar-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Dashboard
          </a>
          <a href="#" className="sidebar-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            Historial
          </a>
        </nav>

        <button className="sidebar-btn">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Nueva Consulta
          </div>
        </button>
      </aside>

      {/* Main Content */}
      <div className="dashboard-main">
        <header style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          padding: "16px 32px", 
          backgroundColor: "var(--glass-bg)", 
          backdropFilter: "var(--glass-blur)",
          borderBottom: "1px solid var(--line)",
          position: "sticky",
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: "auto", padding: "8px 16px", fontSize: "13px", height: "36px" }}
              onClick={() => setSidebarCollapsed((prev) => !prev)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
              {sidebarCollapsed ? "Expandir" : "Contraer"}
            </button>
            <div style={{ height: "24px", width: "1px", background: "var(--line)" }}></div>
            <div className="badge-row" style={{ margin: 0 }}>
              <span className="badge badge-info">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "6px" }}><path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4M10 9h4M10 13h4"/></svg>
                {connectionSnapshot.organizationName ?? "Org"}
              </span>
              <span className="badge badge-success">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "6px" }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                {connectionSnapshot.dbLabel ?? "Not Connected"}
              </span>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
              <span style={{ fontSize: "14px", color: "var(--text)", fontWeight: "700" }}>Jessy Admin</span>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: "500" }}>Analista de Datos</span>
            </div>
            <div style={{ 
              width: "40px", 
              height: "40px", 
              borderRadius: "var(--radius-md)", 
              backgroundColor: "var(--accent)", 
              color: "#FFF", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: "15px", 
              fontWeight: "700", 
              boxShadow: "0 4px 10px rgba(37, 99, 235, 0.2)" 
            }}>
              JA
            </div>
          </div>
        </header>

        <main style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
          <div style={{ marginBottom: "40px" }}>
            <h1 style={{ fontSize: "32px", fontWeight: "800", color: "var(--text)", marginBottom: "8px", letterSpacing: "-0.04em" }}>
              Analítica de Fraude <span style={{ color: "var(--accent)" }}>Command Center</span>
            </h1>
            <p style={{ fontSize: "16px", color: "var(--muted)", margin: 0, fontWeight: "500" }}>Orquestación Inteligente De Consultas SQL</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 480px", gap: "32px", alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              <QueryComposer
                onSubmit={submitQuery}
                isSubmitting={isSubmitting}
                runtimeStatus={status?.runtimeStatus ?? "NotStarted"}
                instanceId={status?.instanceId ?? null}
                error={error}
                chatHistory={chatHistory}
              />
              
              {/* Approval Panel */}
              {isPendingApproval && status?.instanceId && (
                <ApprovalPanel
                  instanceId={status.instanceId}
                  sql={parsedOutput?.sql ?? ""}
                  riskLevel={parsedOutput?.audit?.riskLevel ?? "High"}
                  reasons={parsedOutput?.keyFindings ?? []}
                  onApprovalSent={() => setApprovalSent(true)}
                />
              )}

              <TracePanel
                instanceId={status?.instanceId ?? null}
                runtimeStatus={status?.runtimeStatus ?? "NotStarted"}
                createdAt={status?.createdAt ?? null}
                lastUpdatedAt={status?.lastUpdatedAt ?? null}
                sql={parsedOutput?.sql ?? null}
                customStatus={customStatus}
              />
            </div>
            <div style={{ position: "sticky", top: "100px" }}>
              <InsightPanel
                runtimeStatus={status?.runtimeStatus ?? "NotStarted"}
                output={parsedOutput}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
