import Link from "next/link";

export function OnboardingStepThree() {
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
        <Link href="/onboarding/step-2">
          <span>&lt;</span> Onboarding
        </Link>
      </div>

      <div className="flow-container" style={{ gridTemplateColumns: "1fr", maxWidth: "600px" }}>
        <section className="flow-main">
          <div className="stepper">
            <div className="step-dot"></div>
            <div className="step-dot"></div>
            <div className="step-dot active"></div>
            <div className="step-dot"></div>
          </div>

          <h1>Database Connection</h1>
          <p style={{ color: "#6B7280", marginBottom: "32px", fontSize: "16px" }}>Connect your data source to run SQL queries securely.</p>

          <form action="#" method="post" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "14px" }}>Database Type</label>
              <fieldset className="db-card-grid" aria-label="Database type">
                <div className="db-card-option">
                  <input className="db-card-input" type="radio" id="db-sql" name="dbType" value="sql_server" defaultChecked />
                  <label className="db-card" htmlFor="db-sql">
                    <span className="db-logo db-logo-sql">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 4.02 2 6.5C2 8.98 6.48 11 12 11C17.52 11 22 8.98 22 6.5C22 4.02 17.52 2 12 2Z" fill="white" fillOpacity="0.8"/>
                        <path d="M22 6.5C22 8.98 17.52 11 12 11C6.48 11 2 8.98 2 6.5V10.5C2 12.98 6.48 15 12 15C17.52 15 22 12.98 22 10.5V6.5Z" fill="white" fillOpacity="0.6"/>
                        <path d="M22 10.5C22 12.98 17.52 15 12 15C6.48 15 2 12.98 2 10.5V14.5C2 16.98 6.48 19 12 19C17.52 19 22 16.98 22 14.5V10.5Z" fill="white" fillOpacity="0.4"/>
                        <path d="M22 14.5C22 16.98 17.52 19 12 19C6.48 19 2 16.98 2 14.5V17.5C2 19.98 6.48 22 12 22C17.52 22 22 19.98 22 17.5V14.5Z" fill="white" fillOpacity="0.2"/>
                      </svg>
                    </span>
                    <span className="db-meta">
                      <strong>MS SQL Server</strong>
                      <small>Enterprise Data Engine</small>
                    </span>
                  </label>
                </div>

                <div className="db-card-option">
                  <input className="db-card-input" type="radio" id="db-synapse" name="dbType" value="synapse" />
                  <label className="db-card" htmlFor="db-synapse">
                    <span className="db-logo db-logo-synapse">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white" fillOpacity="0.9"/>
                        <path d="M12 8L2 13L12 18L22 13L12 8Z" fill="white" fillOpacity="0.6"/>
                        <path d="M12 14L2 19L12 24L22 19L12 14Z" fill="white" fillOpacity="0.3"/>
                        <circle cx="12" cy="7" r="2" fill="#0EA5E9"/>
                      </svg>
                    </span>
                    <span className="db-meta">
                      <strong>Azure Synapse</strong>
                      <small>Unlimited Analytics</small>
                    </span>
                  </label>
                </div>

                <div className="db-card-option">
                  <input className="db-card-input" type="radio" id="db-fabric" name="dbType" value="fabric" />
                  <label className="db-card" htmlFor="db-fabric">
                    <span className="db-logo db-logo-fabric">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="8" height="8" rx="1" fill="white" fillOpacity="0.9"/>
                        <rect x="13" y="3" width="8" height="8" rx="1" fill="white" fillOpacity="0.7"/>
                        <rect x="3" y="13" width="8" height="8" rx="1" fill="white" fillOpacity="0.6"/>
                        <path d="M13 13H21V21H13V13Z" fill="white" fillOpacity="0.4"/>
                        <circle cx="17" cy="17" r="2" fill="#8B5CF6"/>
                      </svg>
                    </span>
                    <span className="db-meta">
                      <strong>Microsoft Fabric</strong>
                      <small>OneLake Ecosystem</small>
                    </span>
                  </label>
                </div>
              </fieldset>
            </div>

            <div>
              <label htmlFor="conn" style={{ display: "block", marginBottom: "8px", fontWeight: "500", fontSize: "14px" }}>ODBC Connection String</label>
              <textarea
                id="conn"
                defaultValue="DRIVER={ODBC Driver 18 for SQL Server};SERVER=your.server.address;DATABASE=your_database;UID=your_user;PWD=your_password;"
                style={{ height: "100px", fontFamily: "monospace", fontSize: "13px" }}
              />
            </div>

            <div style={{ padding: "12px 16px", backgroundColor: "#F3F4F6", borderRadius: "6px", fontSize: "13px", color: "#4B5563" }}>
              <strong>Note:</strong> Ensure our IP (<code style={{background:"#E5E7EB", padding:"2px 4px", borderRadius:"4px"}}>34.123.130.126</code>) is whitelisted in your database firewall settings.
            </div>

            <div className="flow-actions" style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <button type="button" className="btn-secondary" style={{ padding: "12px", fontSize: "16px" }}>
                Test Connection
              </button>
              <Link href="/onboarding/step-4" className="btn-primary" style={{ padding: "12px", fontSize: "16px" }}>
                Save Connection
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
