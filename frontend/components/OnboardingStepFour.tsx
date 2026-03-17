import Link from "next/link";

export function OnboardingStepFour() {
  return (
    <main className="safety-shell">
      <header className="flow-topbar">InsightForge AI</header>
      <section className="safety-main">
        <div className="safety-left">
          <p className="flow-step">Step 4 of 4</p>
          <div className="flow-dots" aria-hidden="true">
            <span className="done" />
            <span className="done" />
            <span className="done" />
            <span className="active" />
          </div>

          <h1>Ensure safe and trusted analytics</h1>

          <div className="safety-row">
            <div className="safety-icon">SV</div>
            <div className="safety-copy">
              <h3>SQL Validation</h3>
              <p>Automatically check generated SQL for syntax errors and security vulnerabilities.</p>
            </div>
            <input type="checkbox" defaultChecked />
          </div>

          <div className="safety-row">
            <div className="safety-icon">DM</div>
            <div className="safety-copy">
              <h3>Data Masking</h3>
              <p>Dynamically obfuscate sensitive data fields in query results based on user roles.</p>
            </div>
            <input type="checkbox" defaultChecked />
          </div>

          <div className="safety-row">
            <div className="safety-icon">AL</div>
            <div className="safety-copy">
              <h3>Audit Logging</h3>
              <p>Maintain a record of all queries, access attempts, and configuration changes.</p>
            </div>
            <input type="checkbox" defaultChecked />
          </div>

          <Link href="/dashboard" className="flow-btn-primary finish-btn">
            Finish Setup
          </Link>

          <div className="flow-nav">
            <Link href="/onboarding/step-3">Back</Link>
            <Link href="/dashboard">Skip</Link>
          </div>
        </div>

        <aside className="safety-right">
          <h3>Why Safety and Governance matters</h3>
          <p>
            InsightForge AI prioritizes data security. These settings help you maintain compliance,
            prevent data breaches, and build trust in your analytics insights.
          </p>
          <p>We recommend keeping these enabled for maximum protection.</p>
        </aside>
      </section>
    </main>
  );
}
