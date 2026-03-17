import Link from "next/link";

export function OnboardingStepTwo() {
  return (
    <main className="flow-shell">
      <header className="flow-topbar">InsightForge AI</header>
      <section className="flow-center">
        <article className="flow-card">
          <p className="flow-step">Step 2 of 4</p>
          <div className="flow-dots" aria-hidden="true">
            <span className="active" />
            <span />
            <span />
            <span />
          </div>

          <p className="flow-subtitle">Organization</p>
          <h2>What is your company name?</h2>

          <form className="flow-form" action="#" method="post">
            <label htmlFor="orgName">Organization Name</label>
            <input id="orgName" type="text" placeholder="e.g., Acme Corp" required />
            <button type="submit" className="flow-btn-primary">Continue</button>
          </form>

          <div className="flow-nav">
            <Link href="/">Back</Link>
            <Link href="/onboarding/step-3">Next</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
