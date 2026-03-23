"use client";

import type { Connection, ViewState } from "../types";

type IntegrationsViewProps = {
  setCurrentView: (v: ViewState) => void;
  setEditingConnId: (id: string | null) => void;
  setConnForm: React.Dispatch<React.SetStateAction<Partial<Connection>>>;
};

export function IntegrationsView({ setCurrentView, setEditingConnId, setConnForm }: IntegrationsViewProps) {
  const integrations = [
    { name: 'Azure SQL', icon: '/assets/iconos sql/DeviconAzuresqldatabase.svg' },
    { name: 'PostgreSQL', icon: '/assets/iconos sql/DeviconPostgresqlWordmark.svg' },
    { name: 'MySQL', icon: '/assets/iconos sql/LogosMysql.svg' },
    { name: 'MariaDB', icon: '/assets/iconos sql/LogosMariadb.svg' },
    { name: 'SQLite', icon: '/assets/iconos sql/LogosSqlite.svg' },
    { name: 'Oracle', icon: '/assets/iconos sql/DeviconOracle.svg' },
    { name: 'TursoDB', icon: 'database' },
    { name: 'Cloudflare D1', icon: 'database' },
    { name: 'ClickHouse', icon: 'database' },
    { name: 'MotherDuck', icon: 'database' },
    { name: 'GraphQL APIs', icon: 'database' },
    { name: 'BigQuery', icon: 'database' }
  ];

  return (
    <div className="py-16 px-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2 mb-10 text-center md:text-left">
        <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Add New Integration</h1>
        <p className="text-[14px] text-zinc-500 font-medium">Connect your databases to start querying securely.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {integrations.map((item) => (
          <button
            key={item.name}
            onClick={() => {
              if (item.name === 'Azure SQL') {
                setEditingConnId(null);
                setConnForm({ name: "", host: "", port: "", database: "", username: "", password: "", type: "Azure SQL", authType: 'SQL' });
                setCurrentView('connect_azuresql');
              } else if (item.name === 'PostgreSQL') {
                setEditingConnId(null);
                setConnForm({ name: "My Postgres Database", host: "db.mypostgres.com", port: "5432", database: "analytics_db", username: "postgres_admin", password: "", type: "PostgreSQL" });
                setCurrentView('connect_postgres');
              }
            }}
            className={`bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 flex items-center gap-4 transition-all active:scale-[0.98] group hover:shadow-sm ${item.name !== 'Azure SQL' && 'opacity-50 cursor-not-allowed hover:border-zinc-200 active:scale-100 hover:shadow-none'}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform ${item.name === 'Azure SQL' ? 'bg-zinc-50 group-hover:bg-zinc-100 group-hover:scale-105' : 'bg-zinc-50'}`}>
              {item.icon.includes('.svg') ? (
                <img src={item.icon} className="w-6 h-6 object-contain" alt={item.name} />
              ) : (
                <span className={`material-symbols-outlined text-[20px] ${item.name === 'Azure SQL' ? 'text-zinc-900' : 'text-zinc-500'}`}>database</span>
              )}
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className={`text-[14px] font-medium ${item.name === 'Azure SQL' ? 'text-zinc-900' : 'text-zinc-700'}`}>{item.name}</span>
              {item.name !== 'Azure SQL' && <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Coming Soon</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
