"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { updateOnboardingState } from "../lib/onboardingState";

export function OnboardingStepTwo() {
  const router = useRouter();
  const [orgName, setOrgName] = useState("");

  function onContinue(event: FormEvent) {
    event.preventDefault();
    const trimmedName = orgName.trim();
    if (!trimmedName) return;

    updateOnboardingState({ organizationName: trimmedName });
    router.push("/onboarding/step-3");
  }

  return (
    <main className="flow-shell">
      <header className="flow-header">
        <div className="flow-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="var(--accent)"/>
            <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          QueryPilot <span style={{ color: "var(--accent)" }}>AI</span>
        </div>
      </header>

      <div className="flow-container">
        <section className="flow-main">
          <div className="stepper">
            <div className="step-dot active"></div>
            <div className="step-dot"></div>
            <div className="step-dot"></div>
            <div className="step-dot"></div>
          </div>

          <div className="flow-nav" style={{ padding: 0, margin: "0 0 24px 0" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Regresar
            </Link>
          </div>

          <h1>Detalles de la Organización</h1>
          <p>Comencemos configurando el espacio de trabajo para tu equipo. ¿Cómo se llama tu empresa o proyecto?</p>

          <form onSubmit={onContinue} style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "480px" }}>
            <div className="input-field">
              <label htmlFor="orgName" style={{ display: "block", marginBottom: "10px", fontWeight: "600", fontSize: "14px", color: "var(--text)" }}>Nombre de la Organización</label>
              <input
                id="orgName"
                type="text"
                placeholder="Ej. Analytics Corp"
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                autoFocus
                required
              />
            </div>
            
            <div className="flow-actions">
              <button type="submit" className="btn-primary" style={{ width: "auto", minWidth: "200px" }}>
                Continuar a Conexión
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: "8px" }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </form>
        </section>

        <aside className="flow-aside" style={{ paddingTop: "0" }}>
          <div className="info-card">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Privacidad de Nivel Enterprise
            </h3>
            <p>Tus datos están protegidos con cifrado de grado bancario. QueryPilot AI nunca entrena modelos con tu información privada.</p>
            
            <div className="highlight-box">
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <span>Solo usaremos este nombre para personalizar tu dashboard y reportes ejecutivos.</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
