import Link from "next/link";

export function OnboardingStepOne() {
  return (
    <main className="auth-split">
      <section className="auth-left">
        <div className="auth-wave" aria-hidden="true" />
        <div className="auth-copy">
          <p className="auth-brand">InsightForge AI</p>
          <h1>From questions to trusted data insights</h1>
        </div>
      </section>

      <section className="auth-right">
        <article className="auth-card">
          <p className="brand">InsightForge AI</p>
          <h2>Welcome back</h2>

          <form className="form" action="#" method="post">
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input id="email" name="email" type="email" placeholder="Email address" />

            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input id="password" name="password" type="password" placeholder="Password" />

            <button type="submit" className="primary-btn">
              Sign in
            </button>

            <button type="button" className="secondary-btn">
              Sign in with Microsoft
            </button>
          </form>

          <div className="links-row">
            <a href="#">Forgot password?</a>
            <Link href="/onboarding/step-2">Start setup</Link>
          </div>
        </article>
      </section>
    </main>
  );
}