import Link from "next/link";

export function OnboardingStepTwo() {
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
        <Link href="/">
          <span>&lt;</span> Back
        </Link>
      </div>

      <div className="flow-container" style={{ gridTemplateColumns: "1fr", maxWidth: "600px" }}>
        <section className="flow-main">
          <div className="stepper">
            <div className="step-dot"></div>
            <div className="step-dot active"></div>
            <div className="step-dot"></div>
            <div className="step-dot"></div>
          </div>

          <h1>Organization Details</h1>
          <p style={{ color: "#6B7280", marginBottom: "32px", fontSize: "16px" }}>What is your company name?</p>

          <form action="#" method="post" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label htmlFor="orgName" style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "14px" }}>Organization Name</label>
              <input id="orgName" type="text" placeholder="e.g., Acme Corp" required />
            </div>
            
            <div className="flow-actions" style={{ marginTop: "12px" }}>
              <Link href="/onboarding/step-3" className="btn-primary" style={{display: "block", width: "100%", padding: "12px", fontSize: "16px"}}>
                Continue
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
