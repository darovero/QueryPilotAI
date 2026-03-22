"use client";

import type { Connection, ConnFormField, ViewState } from "../types";

type ConnectionFormProps = {
  connForm: Partial<Connection>;
  setConnForm: React.Dispatch<React.SetStateAction<Partial<Connection>>>;
  connError: string;
  isTestingConnection: boolean;
  testSuccess: boolean;
  editingConnId: string | null;
  handleSaveConnection: () => void;
  handleMsalLogin: () => void;
  setCurrentView: (v: ViewState) => void;
};

export function ConnectionForm({
  connForm, setConnForm, connError, isTestingConnection, testSuccess,
  editingConnId, handleSaveConnection, handleMsalLogin, setCurrentView,
}: ConnectionFormProps) {
  return (
    <div className="flex h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 flex justify-center py-12 px-8 overflow-y-auto">
        <div className="w-full max-w-[480px]">
          <button onClick={() => setCurrentView('integrations')} className="flex items-center gap-2 text-[13px] text-zinc-500 hover:text-zinc-900 font-medium mb-8 transition-colors">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Integrations
          </button>

          <div className="flex items-center gap-4 mb-8">
            <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-10 h-10" alt="Azure SQL" />
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 leading-tight">Connect Azure SQL</h2>
          </div>

          <div className="space-y-6 bg-white border border-zinc-200 p-8 rounded-3xl">
            {connError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[13px] font-medium border border-red-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {connError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">Display Name*</label>
              <input
                type="text"
                value={connForm.name || ""}
                onChange={(e) => setConnForm(prev => ({ ...prev, name: e.target.value, type: "Azure SQL" }))}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-[13px] text-black focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-colors font-mono"
              />
            </div>

            {([
              { label: "Server Address (URL)*", key: "host", type: "text" },
              { label: "Database Name*", key: "database", type: "text" }
            ] as ConnFormField[]).map((field, i) => (
              <div key={i} className="space-y-1.5">
                <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">{field.label}</label>
                <input
                  type={field.type}
                  value={connForm[field.key] || ""}
                  onChange={(e) => setConnForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-[13px] text-black focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-colors font-mono"
                />
              </div>
            ))}

            {connForm.type === 'Azure SQL' && (
              <div className="space-y-3 pt-2">
                <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">Authentication Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConnForm(prev => ({ ...prev, authType: 'SQL' }))}
                    className={`flex items-center gap-2 p-3 border rounded-xl text-[13px] font-medium transition-colors ${connForm.authType !== 'AzureAD' ? 'border-zinc-900 bg-zinc-50 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'}`}>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${connForm.authType !== 'AzureAD' ? 'border-zinc-900' : 'border-zinc-300'}`}>
                      {connForm.authType !== 'AzureAD' && <div className="w-2 h-2 rounded-full bg-zinc-900"></div>}
                    </div>
                    SQL Authentication
                  </button>
                  <button
                    onClick={() => setConnForm(prev => ({ ...prev, authType: 'AzureAD' }))}
                    className={`flex items-center gap-2 p-3 border rounded-xl text-[13px] font-medium transition-colors text-left leading-tight ${connForm.authType === 'AzureAD' ? 'border-zinc-900 bg-zinc-50 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'}`}>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${connForm.authType === 'AzureAD' ? 'border-zinc-900' : 'border-zinc-300'}`}>
                      {connForm.authType === 'AzureAD' && <div className="w-2 h-2 rounded-full bg-zinc-900"></div>}
                    </div>
                    Microsoft Entra ID
                  </button>
                </div>
              </div>
            )}

            {connForm.authType === 'AzureADToken' && (
              <div className="pt-2">
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">lock_open</span>
                    </div>
                    <div>
                      <div className="text-[13px] font-bold">Successfully authenticated</div>
                      <div className="text-[12px] opacity-80">{connForm.username}</div>
                    </div>
                  </div>
                  <button onClick={() => setConnForm(prev => ({ ...prev, authType: 'AzureAD', username: '', password: '' }))} className="text-[12px] font-semibold underline hover:text-emerald-900 transition-colors">
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {connForm.authType === 'AzureAD' && (
              <div className="pt-2">
                <button
                  onClick={handleMsalLogin}
                  className="w-full bg-[#2F2F2F] hover:bg-[#1f1f1f] text-white border border-[#2F2F2F] rounded-xl px-4 py-3.5 text-[14px] font-semibold transition-colors flex items-center justify-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 21 21"><path fill="#f35325" d="M1 1h9v9H1z"/><path fill="#81bc06" d="M11 1h9v9h-9z"/><path fill="#05a6f0" d="M1 11h9v9H1z"/><path fill="#ffba08" d="M11 11h9v9h-9z"/></svg>
                  Sign in with Microsoft
                </button>
              </div>
            )}

            {(!connForm.authType || connForm.authType === 'SQL') && ([
              { label: "Username*", key: "username", type: "text" },
              { label: "Password*", key: "password", type: "password" }
            ] as ConnFormField[]).map((field, i) => (
              <div key={i + 10} className="space-y-1.5 pt-2">
                <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">{field.label}</label>
                <input
                  type={field.type}
                  value={connForm[field.key] || ""}
                  onChange={(e) => setConnForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-[13px] text-black focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-colors font-mono"
                />
              </div>
            ))}

            <div className="pt-4 flex gap-4">
              {editingConnId && (
                <button onClick={() => setCurrentView('manage_connections')} className="w-1/3 bg-white border border-zinc-200 text-zinc-700 font-medium rounded-xl py-3.5 text-[14px] hover:bg-zinc-50 transition-colors flex justify-center items-center">Cancel</button>
              )}
              <button
                onClick={handleSaveConnection}
                disabled={isTestingConnection}
                className={`bg-zinc-900 text-white font-medium rounded-xl py-3.5 text-[14px] hover:bg-zinc-800 transition-colors flex justify-center items-center gap-2 disabled:bg-zinc-400 disabled:cursor-not-allowed ${editingConnId ? 'w-2/3' : 'w-full'}`}>
                {isTestingConnection ? (
                  <><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> Testing...</>
                ) : testSuccess ? (
                  <><span className="material-symbols-outlined text-[18px]">verified</span> Success!</>
                ) : (
                  <>{editingConnId ? 'Save Changes' : 'Test and Save Connection'} <span className="material-symbols-outlined text-[18px]">arrow_forward</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right documentation panel */}
      <div className="w-[320px] bg-zinc-50/50 border-l border-zinc-200 p-10 hidden xl:flex flex-col">
        <h3 className="text-[15px] font-semibold text-zinc-900 mb-8">Need help?</h3>
        <div className="space-y-10">
          <div className="space-y-4">
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Documentation</div>
            <a className="flex items-center gap-3 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors" href="https://learn.microsoft.com/en-us/azure/azure-sql/database/connect-query-portal" target="_blank" rel="noopener noreferrer">
              <img src="/assets/iConos 28_28/LogosMicrosoftIcon.svg" className="w-8 h-8" alt="Microsoft" />
              Connecting Azure SQL
            </a>
          </div>
          <div className="space-y-4">
            <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Platform Guides</div>
            <div className="space-y-2">
              {[
                { name: 'Azure SQL', url: 'https://learn.microsoft.com/en-us/azure/azure-sql/database/', icon: <img src="/assets/iConos 28_28/MaterialIconThemeAzure.svg" className="w-6 h-6" alt="Azure" /> },
                { name: 'DigitalOcean', url: 'https://docs.digitalocean.com/products/databases/', icon: <img src="/assets/iConos 28_28/LogosDigitalOceanIcon.svg" className="w-6 h-6" alt="DigitalOcean" /> },
                { name: 'Heroku', url: 'https://devcenter.heroku.com/categories/heroku-postgres', icon: <img src="/assets/iConos 28_28/LogosHerokuIcon.svg" className="w-6 h-6" alt="Heroku" /> },
                { name: 'Neon', url: 'https://neon.tech/docs/connect/connect-from-any-app', icon: <img src="/assets/iConos 28_28/LogosNeonIcon.svg" className="w-6 h-6" alt="Neon" /> },
                { name: 'Supabase', url: 'https://supabase.com/docs/guides/database/connecting-to-postgres', icon: <img src="/assets/iConos 28_28/DeviconSupabase.svg" className="w-6 h-6" alt="Supabase" /> }
              ].map((plat) => (
                <a key={plat.name} className="flex items-center gap-3 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors p-2 rounded-lg hover:bg-zinc-900/5 -ml-2" href={plat.url} target="_blank" rel="noopener noreferrer">
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">{plat.icon}</div>
                  {plat.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
