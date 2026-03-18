"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { readOnboardingState, updateOnboardingState } from "../lib/onboardingState";

type DbKey = "sql" | "mysql" | "postgres" | "mariadb" | "oracle" | "sqlite";

type DbOption = {
  id: DbKey;
  name: string;
  desc: string;
  icon: string;
  defaultPort: string;
  driverHint: string;
};

type TestResult = {
  ok: boolean;
  message: string;
};

const DB_OPTIONS: DbOption[] = [
  {
    id: "sql",
    name: "MS SQL Server",
    desc: "Enterprise Data",
    icon: "DeviconMicrosoftsqlserverWordmark.svg",
    defaultPort: "1433",
    driverHint: "ODBC Driver 18 for SQL Server"
  },
  {
    id: "mysql",
    name: "MySQL",
    desc: "Web Standard",
    icon: "LogosMysql.svg",
    defaultPort: "3306",
    driverHint: "MySQL ODBC 8.0 Unicode Driver"
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    desc: "Advanced Open Source",
    icon: "DeviconPostgresqlWordmark.svg",
    defaultPort: "5432",
    driverHint: "PostgreSQL Unicode(x64)"
  },
  {
    id: "mariadb",
    name: "MariaDB",
    desc: "Reliable & Fast",
    icon: "LogosMariadb.svg",
    defaultPort: "3306",
    driverHint: "MariaDB ODBC 3.1 Driver"
  },
  {
    id: "oracle",
    name: "Oracle DB",
    desc: "Cloud Enterprise",
    icon: "DeviconOracle.svg",
    defaultPort: "1521",
    driverHint: "Oracle in OraClient"
  },
  {
    id: "sqlite",
    name: "SQLite",
    desc: "Local Storage",
    icon: "LogosSqlite.svg",
    defaultPort: "",
    driverHint: "SQLite3 ODBC Driver"
  }
];

export function OnboardingStepThree() {
  const router = useRouter();
  const onboarding = readOnboardingState();

  const [selectedDb, setSelectedDb] = useState<DbKey>("sql");
  const [connectionMode, setConnectionMode] = useState<"basic" | "odbc">("basic");
  const [host, setHost] = useState("your.server.address");
  const [port, setPort] = useState("1433");
  const [database, setDatabase] = useState("your_database");
  const [username, setUsername] = useState("your_user");
  const [password, setPassword] = useState("");
  const [filePath, setFilePath] = useState("C:/data/analytics.db");
  const [odbcConnectionString, setOdbcConnectionString] = useState(
    "Driver={ODBC Driver 18 for SQL Server};Server=tcp:your.server.address,1433;Database=your_database;Uid=your_user;Pwd=your_password;Encrypt=yes;TrustServerCertificate=no;"
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const selectedOption = useMemo(
    () => DB_OPTIONS.find((db) => db.id === selectedDb) ?? DB_OPTIONS[0],
    [selectedDb]
  );

  const connectionExample = useMemo(() => {
    if (selectedDb === "sql" && connectionMode === "odbc") {
      return odbcConnectionString;
    }

    if (selectedDb === "sqlite") {
      return `DRIVER={${selectedOption.driverHint}};Database=${filePath};`;
    }

    if (selectedDb === "oracle") {
      return `DRIVER={${selectedOption.driverHint}};DBQ=${host}:${port}/${database};UID=${username};PWD=${password};`;
    }

    return `DRIVER={${selectedOption.driverHint}};SERVER=${host};PORT=${port};DATABASE=${database};UID=${username};PWD=${password};`;
  }, [connectionMode, database, filePath, host, odbcConnectionString, password, port, selectedDb, selectedOption.driverHint, username]);

  function handleDbChange(dbId: DbKey) {
    const option = DB_OPTIONS.find((db) => db.id === dbId);
    setSelectedDb(dbId);
    setPort(option?.defaultPort ?? "");
    setConnectionMode("basic");
    setTestResult(null);
  }

  function testConnection() {
    const missing: string[] = [];

    if (selectedDb === "sqlite") {
      if (!filePath.trim()) {
        missing.push("SQLite File Path");
      }
    } else if (selectedDb === "sql" && connectionMode === "odbc") {
      if (!odbcConnectionString.trim()) {
        missing.push("ODBC Connection String");
      }
    } else {
      if (!host.trim()) {
        missing.push("Host");
      }
      if (!port.trim()) {
        missing.push("Port");
      }
      if (!database.trim()) {
        missing.push("Database");
      }
      if (!username.trim()) {
        missing.push("Username");
      }
      if (!password.trim()) {
        missing.push("Password");
      }
    }

    if (missing.length > 0) {
      setTestResult({
        ok: false,
        message: `Completa los campos requeridos: ${missing.join(", ")}.`
      });
      return;
    }

    setTestResult({
      ok: true,
      message: "Configuracion validada. Ya puedes guardar la conexion."
    });
  }

  function saveConnection() {
    if (!testResult?.ok) {
      setTestResult({
        ok: false,
        message: "Primero ejecuta Test Connection para validar la configuracion."
      });
      return;
    }

    updateOnboardingState({
      connection: {
        dbType: selectedDb,
        dbLabel: selectedOption.name,
        mode: selectedDb === "sql" ? connectionMode : "basic",
        host: selectedDb !== "sqlite" && !(selectedDb === "sql" && connectionMode === "odbc") ? host.trim() : undefined,
        port: selectedDb !== "sqlite" && !(selectedDb === "sql" && connectionMode === "odbc") ? port.trim() : undefined,
        database: selectedDb !== "sqlite" && !(selectedDb === "sql" && connectionMode === "odbc") ? database.trim() : undefined,
        username: selectedDb !== "sqlite" && !(selectedDb === "sql" && connectionMode === "odbc") ? username.trim() : undefined,
        odbcConnectionString: selectedDb === "sql" && connectionMode === "odbc" ? odbcConnectionString.trim() : undefined,
        tested: true,
        testedAt: new Date().toISOString()
      }
    });

    router.push("/onboarding/step-4");
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

      <div className="flow-container" style={{ maxWidth: "1200px" }}>
        <section className="flow-main">
          <div className="stepper">
            <div className="step-dot active"></div>
            <div className="step-dot active"></div>
            <div className="step-dot active"></div>
            <div className="step-dot"></div>
          </div>

          <div className="flow-nav" style={{ padding: 0, margin: "0 0 24px 0" }}>
            <Link href="/onboarding/step-2" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Volver a Detalles
            </Link>
          </div>

          <h1>Conexión de Datos</h1>
          <p>Sincroniza tu base de datos para habilitar análisis en tiempo real con IA.</p>

          <form action="#" method="post" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            <div className="input-group-container">
              <label style={{ display: "block", marginBottom: "16px", fontWeight: "700", fontSize: "12px", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Selecciona el Motor</label>
              <div className="db-card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "12px" }}>
                {DB_OPTIONS.map((db) => (
                  <div key={db.id} className="db-card-option">
                    <input
                      className="db-card-input"
                      type="radio"
                      id={`db-${db.id}`}
                      name="dbType"
                      value={db.id}
                      checked={selectedDb === db.id}
                      onChange={() => handleDbChange(db.id)}
                    />
                    <label className="db-card" htmlFor={`db-${db.id}`} style={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      alignItems: "center", 
                      justifyContent: "center",
                      padding: "16px", 
                      height: "110px", 
                      gap: "10px",
                      textAlign: "center"
                    }}>
                      <div style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <img 
                          src={`/assets/iconos sql/${db.icon}`} 
                          alt={db.name} 
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} 
                        />
                      </div>
                      <span className="db-meta">
                        <strong style={{ fontSize: "13px" }}>{db.name}</strong>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#FFFFFF", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "32px", boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontSize: "18px", marginBottom: "24px", color: "var(--text)" }}>Configuración de Red</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {selectedDb === "sql" ? (
                  <div>
                    <label style={{ display: "block", marginBottom: "12px", fontWeight: "600", fontSize: "14px" }}>Método de Conexión</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <label style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "14px", cursor: "pointer", background: connectionMode === "basic" ? "var(--accent-soft)" : "#FFF", display: "flex", alignItems: "center", transition: "var(--transition)" }}>
                        <input type="radio" name="sql-mode" checked={connectionMode === "basic"} onChange={() => setConnectionMode("basic")} style={{ marginRight: "10px" }} />
                        <span style={{ fontSize: "14px", fontWeight: "600" }}>Parámetros Estándar</span>
                      </label>
                      <label style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "14px", cursor: "pointer", background: connectionMode === "odbc" ? "var(--accent-soft)" : "#FFF", display: "flex", alignItems: "center", transition: "var(--transition)" }}>
                        <input type="radio" name="sql-mode" checked={connectionMode === "odbc"} onChange={() => setConnectionMode("odbc")} style={{ marginRight: "10px" }} />
                        <span style={{ fontSize: "14px", fontWeight: "600" }}>Cadena ODBC</span>
                      </label>
                    </div>
                  </div>
                ) : null}

                {selectedDb === "sql" && connectionMode === "odbc" ? (
                  <div>
                    <label htmlFor="odbcConn" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Connection String (DSN-less)</label>
                    <textarea id="odbcConn" value={odbcConnectionString} onChange={(event) => setOdbcConnectionString(event.target.value)} style={{ minHeight: "120px", fontFamily: "monospace" }} />
                  </div>
                ) : selectedDb !== "sqlite" ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "20px" }}>
                      <div>
                        <label htmlFor="dbHost" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Endpoint / Host</label>
                        <input id="dbHost" type="text" value={host} onChange={(event) => setHost(event.target.value)} placeholder="db.company.com" />
                      </div>
                      <div>
                        <label htmlFor="dbPort" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Puerto</label>
                        <input id="dbPort" type="text" value={port} onChange={(event) => setPort(event.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="dbName" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Nombre de la Base de Datos</label>
                      <input id="dbName" type="text" value={database} onChange={(event) => setDatabase(event.target.value)} placeholder="prod_analytics" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                      <div>
                        <label htmlFor="dbUser" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Usuario</label>
                        <input id="dbUser" type="text" value={username} onChange={(event) => setUsername(event.target.value)} />
                      </div>
                      <div>
                        <label htmlFor="dbPassword" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Contraseña</label>
                        <input id="dbPassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label htmlFor="sqlitePath" style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>Ruta del Archivo (.db, .sqlite)</label>
                    <input id="sqlitePath" type="text" value={filePath} onChange={(event) => setFilePath(event.target.value)} placeholder="C:/data/local.db" />
                  </div>
                )}
              </div>

              <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  style={{ background: "none", border: "none", color: "var(--accent)", padding: 0, cursor: "pointer", fontWeight: "700", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={showAdvanced ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-9"}/></svg>
                  {showAdvanced ? "Ocultar opciones avanzadas" : "Configuración avanzada y vista previa"}
                </button>

                {showAdvanced ? (
                  <div style={{ marginTop: "20px", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "20px" }}>
                    <label htmlFor="conn" style={{ display: "block", marginBottom: "12px", fontWeight: "700", fontSize: "11px", textTransform: "uppercase", color: "var(--muted)" }}>
                      Generated Connection String Preview
                    </label>
                    <textarea
                      id="conn"
                      value={connectionExample}
                      readOnly
                      style={{ height: "100px", fontFamily: "monospace", fontSize: "12px", background: "#f1f5f9", border: "none" }}
                    />
                    <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--muted)" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                      <span>Driver detectado: <strong>{selectedOption.driverHint}</strong></span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#36B37E" }}></div>
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: "500" }}>Asegúrate de permitir nuestra IP: <strong>34.123.130.126</strong></span>
              </div>
            </div>

            {testResult ? (
              <div style={{ 
                padding: "16px 20px", 
                borderRadius: "var(--radius-md)", 
                fontSize: "14px", 
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: testResult.ok ? "#ECFDF5" : "#FEF2F2", 
                color: testResult.ok ? "#065F46" : "#991B1B",
                border: `1px solid ${testResult.ok ? "#A7F3D0" : "#FECACA"}`
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {testResult.ok ? <path d="M20 6L9 17l-5-5"/> : <path d="M18 6L6 18M6 6l12 12"/>}
                </svg>
                {testResult.message}
              </div>
            ) : null}

            <div className="flow-actions" style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "20px" }}>
              <button type="button" className="btn-secondary" onClick={testConnection}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: "8px" }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Test Connection
              </button>
              <button type="button" className="btn-primary" onClick={saveConnection}>
                Guardar Configuración y Finalizar
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: "8px" }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </form>
        </section>

        <aside className="flow-aside">
          <div className="info-card">
            <h3>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L22 22m-5-10l4-4"/></svg>
              Análisis Seguro (Read-Only)
            </h3>
            <p>QueryPilot AI solo requiere acceso de lectura. Tus bases de datos transaccionales permanecen intactas y seguras.</p>
            
            <div className="highlight-box">
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "700" }}>¿Problemas de conexión?</h4>
              <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.4" }}>Verifica que tu firewall permita el puerto <strong>{port || "default"}</strong> para nuestra IP estática.</p>
            </div>
            
            <div style={{ marginTop: "24px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "12px" }}>Motores Optimizados:</h4>
              <ul style={{ padding: "0 0 0 20px", margin: 0, fontSize: "13px", color: "var(--muted)", display: "grid", gap: "6px" }}>
                <li>Microsoft SQL Server (Azure/Hybrid)</li>
                <li>PostgreSQL (Perfecto para startups)</li>
                <li>MySQL / MariaDB (Standard Web)</li>
                <li>Oracle (Enterprise Data Warehouse)</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
