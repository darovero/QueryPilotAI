import Link from "next/link";

export function OnboardingStepThree() {
  return (
    <main className="flow-shell">
      <header className="flow-topbar">InsightForge AI</header>
      <section className="flow-center">
        <article className="flow-card flow-card-wide">
          <p className="flow-step">Step 3 of 4</p>
          <div className="flow-dots" aria-hidden="true">
            <span className="done" />
            <span className="active" />
            <span />
            <span />
          </div>

          <h2>Database Connection</h2>
          <p className="flow-subtitle">Connect your data source to run SQL queries</p>

          <form className="flow-form" action="#" method="post">
            <label htmlFor="dbType">Database Type</label>
            <select id="dbType" defaultValue="sql_server">
              <option value="sql_server">MS SQL Server</option>
              <option value="synapse">Azure Synapse</option>
              <option value="fabric">Microsoft Fabric Warehouse</option>
            </select>

            <label htmlFor="conn">ODBC Connection String</label>
            <textarea
              id="conn"
              defaultValue="DRIVER={ODBC Driver 18 for SQL Server};SERVER=your.server.address;DATABASE=your_database;UID=your_user;PWD=your_password;"
            />

            <div className="flow-info">IP whitelist: 34.123.130.126</div>

            <div className="flow-actions-inline">
              <button type="button" className="flow-btn-muted">Test Connection</button>
              <button type="submit" className="flow-btn-primary">Save Connection</button>
            </div>
          </form>

          <div className="flow-nav">
            <Link href="/onboarding/step-2">Back</Link>
            <Link href="/onboarding/step-4">Next</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
