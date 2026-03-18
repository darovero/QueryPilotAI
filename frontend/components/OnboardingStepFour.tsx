"use client";

import Link from "next/link";
import { useMemo } from "react";
import { readOnboardingState } from "../lib/onboardingState";

export function OnboardingStepFour() {
  const onboarding = useMemo(() => readOnboardingState(), []);

  return (
    <main className="flow-shell">
      <header className="flow-header">
        <div className="flow-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3B82F6"/>
            <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          InsightForge AI
        </div>
      </header>

      <div className="flow-nav">
        <Link href="/onboarding/step-3">
          <span>&lt;</span> Onboarding
        </Link>
      </div>

      <div className="flow-container">
        <section className="flow-main">
          <div className="stepper">
            <div className="step-dot"></div>
            <div className="step-dot"></div>
            <div className="step-dot"></div>
            <div className="step-dot active"></div>
          </div>

          <h1>Ensure safe and trusted analytics</h1>

          {onboarding.connection ? (
            <div style={{ marginBottom: "16px", padding: "10px 12px", borderRadius: "8px", background: "#F4F5F7", color: "#42526E", fontSize: "13px" }}>
              Connected source: <strong>{onboarding.connection.dbLabel}</strong>
              {onboarding.connection.host ? ` (${onboarding.connection.host})` : ""}
            </div>
          ) : (
            <div style={{ marginBottom: "16px", padding: "10px 12px", borderRadius: "8px", background: "#FFEBE6", color: "#BF2600", fontSize: "13px" }}>
              No database connection was saved in the previous step.
            </div>
          )}

          <div className="toggle-row">
            <div className="toggle-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div className="toggle-content">
              <h3>SQL Validation</h3>
              <p>Automatically check generated SQL for syntax errors and security vulnerabilities.</p>
            </div>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div className="toggle-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <div className="toggle-content">
              <h3>Data Masking</h3>
              <p>Dynamically obfuscate sensitive data fields in query results based on user roles.</p>
            </div>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>

          <div className="toggle-row">
            <div className="toggle-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            </div>
            <div className="toggle-content">
              <h3>Audit Logging</h3>
              <p>Maintain a comprehensive record of all queries, access attempts, and configuration changes.</p>
            </div>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider"></span>
            </label>
          </div>

          <div className="flow-actions">
            <Link href="/dashboard" className="btn-primary" style={{display: "block", width: "100%", padding: "12px", fontSize: "16px"}}>
              Finish Setup
            </Link>
          </div>
        </section>

        <aside className="flow-aside">
          <div className="info-card">
            <h3>Why Safety & Governance matters</h3>
            <p>
              InsightForge AI prioritizes data security. These settings help you maintain compliance, prevent data breaches, and build trust in your analytics insights.
            </p>
            <p>
              We recommend keeping these enabled for maximum protection.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
