import Link from "next/link";

export function OnboardingStepOne() {
  return (
    <main className="auth-split">
      <section className="auth-left">
        <div className="auth-left-content">
          <h1>From questions<br/>to trusted data<br/>insights</h1>
        </div>
      </section>

      <section className="auth-right">
        <article className="auth-card">
          <div className="auth-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/分享/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3B82F6"/>
              <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            InsightForge AI
          </div>
          
          <h2>Welcome back</h2>

          <form className="auth-form" action="#" method="post">
            <div className="input-group">
              <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <input id="email" name="email" type="email" placeholder="Email address" />
            </div>
            
            <div className="input-group">
              <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <input id="password" name="password" type="password" placeholder="Password" />
              <button type="button" className="input-action" aria-label="Toggle password visibility">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              </button>
            </div>

            <button type="submit" className="btn-primary">
              Sign in
            </button>

            <button type="button" className="btn-secondary">
              <svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
              Sign in with Microsoft
            </button>
          </form>

          <div className="auth-links">
            <a href="#">Forgot password?</a>
            <Link href="/onboarding/step-2" style={{color: "#2563eb"}}>Start free trial</Link>
          </div>
        </article>
      </section>
    </main>
  );
}