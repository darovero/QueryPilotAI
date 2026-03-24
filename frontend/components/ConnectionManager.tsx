import { Connection, ChatSession, DashboardTab } from "./types";
import { toast } from "sonner";

interface ConnectionManagerProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  editingConnId: string | null;
  setEditingConnId: (id: string | null) => void;
  connForm: Partial<Connection>;
  setConnForm: React.Dispatch<React.SetStateAction<Partial<Connection>>>;
  connError: string;
  testSuccess: boolean;
  isTestingConnection: boolean;
  handleMsalLogin: () => void;
  handleSaveConnection: () => void;
  fetchWithAuth: (url: string, options?: any) => Promise<Response>;
  chatSessions: ChatSession[];
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  openTabs: DashboardTab[];
  setOpenTabs: React.Dispatch<React.SetStateAction<DashboardTab[]>>;
  setExpandedConns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  addLog: (level: any, msg: string) => void;
}

export function ConnectionManager({
  currentView, setCurrentView, connections, setConnections,
  editingConnId, setEditingConnId, connForm, setConnForm,
  connError, testSuccess, isTestingConnection, handleMsalLogin, handleSaveConnection,
  fetchWithAuth, chatSessions, setChatSessions, openTabs, setOpenTabs, setExpandedConns, addLog
}: ConnectionManagerProps) {
  return (
    <>
      {/* VIEW: INTEGRATIONS */}
      {currentView === 'integrations' && (
        <div className="py-16 px-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setCurrentView('welcome')}
            className="mb-6 flex items-center gap-2 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Home
          </button>
          <div className="space-y-2 mb-10 text-center md:text-left">
            <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Add New Integration</h1>
            <p className="text-[14px] text-zinc-500 font-medium">Connect your databases to start querying securely.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
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
            ].map((item, i) => (
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
                className={`bg-black border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 flex items-center gap-4 transition-all active:scale-[0.98] group hover:shadow-sm ${item.name !== 'Azure SQL' && 'opacity-50 cursor-not-allowed hover:border-zinc-200 active:scale-100 hover:shadow-none'}`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform ${item.name === 'Azure SQL' ? 'bg-black group-hover:bg-zinc-100 group-hover:scale-105' : 'bg-black'}`}>
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
      )}

      {/* VIEW: CONNECT AZURE SQL / POSTGRES */}
      {(currentView === 'connect_azuresql' || currentView === 'connect_postgres') && (
        <div className="flex h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex-1 flex justify-center py-12 px-8 overflow-y-auto">
              <div className="w-full max-w-[480px]">
                 
                 <button onClick={() => setCurrentView('integrations')} className="flex items-center gap-2 text-[13px] text-zinc-500 hover:text-zinc-900 font-medium mb-8 transition-colors">
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Integrations
                 </button>

                  <div className="flex items-center gap-4 mb-8">
                    {connForm.type === 'Azure SQL' ? (
                       <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-10 h-10" alt="Azure SQL" />
                    ) : (
                       <img src="/assets/iconos sql/DeviconPostgresqlWordmark.svg" className="w-10 h-10" alt="PostgreSQL" />
                    )}
                    <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 leading-tight">
                       Connect {connForm.type || 'Database'}
                    </h2>
                  </div>
                 
                 <div className="space-y-6 bg-black border border-zinc-200 p-8 rounded-3xl">
                     {connError && (
                        <div className="p-3 bg-red-900/10 text-red-500 rounded-xl text-[13px] font-medium border border-red-100 flex items-center gap-2">
                           <span className="material-symbols-outlined text-[16px]">error</span>
                           {connError}
                        </div>
                     )}
                     {testSuccess && (
                        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-[14px] font-medium border border-emerald-200 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                           <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                              <span className="material-symbols-outlined text-[20px]">check</span>
                           </div>
                           Connection verified! Redirecting...
                        </div>
                     )}
                     
                     <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">Display Name*</label>
                        <input 
                          type="text" 
                          value={connForm.name || ""}
                          onChange={(e) => setConnForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-black border border-zinc-200 rounded-xl px-4 py-3 text-[13px] text-black focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-colors font-mono" 
                        />
                     </div>

                     {[
                      { label: "Server Address (URL)*", key: "host", type: "text" },
                      { label: "Database Name*", key: "database", type: "text" }
                    ].map((field, i) => (
                       <div key={i} className="space-y-1.5">
                          <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">{field.label}</label>
                          <input 
                            type={field.type}
                            value={(connForm as any)[field.key] || ""}
                            onChange={(e) => setConnForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full bg-black border border-zinc-200 rounded-xl px-4 py-3 text-[13px] text-black focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-colors font-mono" 
                          />
                       </div>
                    ))}

                    {connForm.type === 'Azure SQL' && (
                       <div className="space-y-3 pt-2">
                          <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">Authentication Method</label>
                          <div className="grid grid-cols-2 gap-3">
                             <button 
                               onClick={() => setConnForm(prev => ({ ...prev, authType: 'SQL' }))}
                               className={`flex items-center gap-2 p-3 border rounded-xl text-[13px] font-medium transition-colors ${connForm.authType !== 'AzureAD' ? 'border-zinc-900 bg-black text-zinc-900' : 'border-zinc-200 bg-black text-zinc-500 hover:border-zinc-300'}`}>
                               <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${connForm.authType !== 'AzureAD' ? 'border-zinc-900' : 'border-zinc-300'}`}>
                                  {connForm.authType !== 'AzureAD' && <div className="w-2 h-2 rounded-full bg-zinc-900"></div>}
                               </div>
                               SQL Authentication
                             </button>
                             <button 
                               onClick={() => setConnForm(prev => ({ ...prev, authType: 'AzureAD' }))}
                               className={`flex items-center gap-2 p-3 border rounded-xl text-[13px] font-medium transition-colors text-left leading-tight ${connForm.authType === 'AzureAD' ? 'border-zinc-900 bg-black text-zinc-900' : 'border-zinc-200 bg-black text-zinc-500 hover:border-zinc-300'}`}>
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

                    {(!connForm.authType || connForm.authType === 'SQL') && [
                      { label: "Username*", key: "username", type: "text" },
                      { label: "Password*", key: "password", type: "password" }
                    ].map((field, i) => (
                       <div key={i + 10} className="space-y-1.5 pt-2">
                          <label className="text-[12px] font-semibold text-zinc-600 uppercase tracking-widest">{field.label}</label>
                          <input 
                            type={field.type}
                            value={(connForm as any)[field.key] || ""}
                            onChange={(e) => setConnForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                            className="w-full bg-black border border-zinc-200 rounded-xl px-4 py-3 text-[13px] text-black focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition-colors font-mono" 
                          />
                       </div>
                    ))}
                    
                    <div className="pt-4 flex gap-4">
                      {editingConnId && (
                        <button 
                          onClick={() => setCurrentView('manage_connections')}
                          className="w-1/3 bg-black border border-zinc-200 text-zinc-700 font-medium rounded-xl py-3.5 text-[14px] hover:bg-black transition-colors flex justify-center items-center">
                            Cancel
                        </button>
                      )}
                      <button 
                        onClick={handleSaveConnection}
                        disabled={isTestingConnection}
                        className={`bg-zinc-900 text-white font-medium rounded-xl py-3.5 text-[14px] hover:bg-zinc-800 transition-colors flex justify-center items-center gap-2 disabled:bg-zinc-400 disabled:cursor-not-allowed ${editingConnId ? 'w-2/3' : 'w-full'}`}>
                          {isTestingConnection ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                              Testing...
                            </>
                          ) : testSuccess ? (
                            <>
                              <span className="material-symbols-outlined text-[18px]">verified</span>
                              Success!
                            </>
                          ) : (
                            <>
                              {editingConnId ? 'Save Changes' : 'Test and Save Connection'} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </>
                          )}
                      </button>
                    </div>
                 </div>
              </div>
           </div>
           
           {/* Right documentation panel */}
           <div className="w-[320px] bg-black border-l border-zinc-200 p-10 hidden xl:flex flex-col">
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
                       { 
                         name: 'Azure SQL', 
                         url: 'https://learn.microsoft.com/en-us/azure/azure-sql/database/',
                         icon: <img src="/assets/iConos 28_28/MaterialIconThemeAzure.svg" className="w-6 h-6" alt="Azure" />
                       },
                       { 
                         name: 'DigitalOcean', 
                         url: 'https://docs.digitalocean.com/products/databases/',
                         icon: <img src="/assets/iConos 28_28/LogosDigitalOceanIcon.svg" className="w-6 h-6" alt="DigitalOcean" />
                       },
                       { 
                         name: 'Heroku', 
                         url: 'https://devcenter.heroku.com/categories/heroku-postgres',
                         icon: <img src="/assets/iConos 28_28/LogosHerokuIcon.svg" className="w-6 h-6" alt="Heroku" />
                       },
                       { 
                         name: 'Neon', 
                         url: 'https://neon.tech/docs/connect/connect-from-any-app',
                         icon: <img src="/assets/iConos 28_28/LogosNeonIcon.svg" className="w-6 h-6" alt="Neon" />
                       },
                       { 
                         name: 'Supabase', 
                         url: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
                         icon: <img src="/assets/iConos 28_28/DeviconSupabase.svg" className="w-6 h-6" alt="Supabase" />
                       }
                     ].map((plat) => (
                       <a key={plat.name} className="flex items-center gap-3 text-[13px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors p-2 rounded-lg hover:bg-zinc-900/5 -ml-2" href={plat.url} target="_blank" rel="noopener noreferrer">
                         <div className="w-7 h-7 flex items-center justify-center shrink-0">
                           {plat.icon}
                         </div>
                         {plat.name}
                       </a>
                     ))}
                   </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* VIEW: MANAGE CONNECTIONS */}
      {currentView === 'manage_connections' && (
        <div className="py-16 px-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setCurrentView('welcome')}
            className="mb-6 flex items-center gap-2 text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Home
          </button>
          <div className="flex justify-between items-center mb-10">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Manage Connections</h1>
              <p className="text-[14px] text-zinc-500 font-medium">View, edit, or remove configured database connections.</p>
            </div>
            <button 
              onClick={() => { setEditingConnId(null); setConnForm({ name: "", host: "", port: "", database: "", username: "", password: "", type: "Azure SQL" }); setCurrentView('connect_azuresql'); }}
              className="bg-zinc-900 text-white hover:bg-zinc-800 px-5 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add</span> Add Connection
            </button>
          </div>

          <div className="bg-black border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-200 bg-black text-[12px] font-semibold text-zinc-500 uppercase tracking-widest">
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Host</div>
              <div className="col-span-2">Database</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {connections.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-[14px]">No connections found. Add one to get started.</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {connections.map((conn) => (
                  <div key={conn.id} className="grid grid-cols-12 gap-4 p-4 items-center text-[14px] hover:bg-black transition-colors text-zinc-700">
                    <div className="col-span-3 font-medium text-zinc-900 truncate">
                      <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center border border-zinc-100">
                               {conn.type === 'Azure SQL' && <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-6 h-6 object-contain" alt="Azure" />}
                               {(conn.type === 'PostgreSQL' || (!conn.type && !conn.authType)) && <img src="/assets/iconos sql/DeviconPostgresqlWordmark.svg" className="w-6 h-6 object-contain" alt="Postgres" />}
                               {conn.type === 'MySQL' && <img src="/assets/iconos sql/LogosMysql.svg" className="w-6 h-6 object-contain" alt="MySQL" />}
                               {conn.type && !['Azure SQL', 'PostgreSQL', 'MySQL'].includes(conn.type) && (
                                  <span className="material-symbols-outlined text-[22px] text-zinc-900">database</span>
                               )}
                            </div>   {conn.name}
                      </div>
                    </div>
                    <div className="col-span-2">{conn.type || 'PostgreSQL'}</div>
                    <div className="col-span-3 truncate font-mono text-[12px]">{conn.host || 'db.mypostgres.com'}</div>
                    <div className="col-span-2 truncate">{conn.database || 'analytics_db'}</div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button 
                        onClick={() => {
                           const newChatId = 'chat-' + Date.now();
                           setChatSessions(prev => [...prev, { id: newChatId, connectionId: conn.id, title: 'New Chat', messages: [] }]);
                           setOpenTabs(prev => { 
                               if (!prev.find(t => t.id === newChatId)) {
                                   return [...prev, { type: 'chat', id: newChatId, title: 'New Chat', connectionId: conn.id }];
                               }
                               return prev;
                           });
                           setCurrentView(newChatId);
                           setExpandedConns(prev => ({ ...prev, [conn.id]: true }));
                           addLog("SUCCESS", `Connected to ${conn.name}.`);
                        }}
                        className="w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                        title="Connect & Chat"
                      >
                        <span className="material-symbols-outlined text-[16px]">link</span>
                      </button>
                      <button 
                        onClick={() => { 
                           setEditingConnId(conn.id); 
                           setConnForm({ ...conn, type: conn.type || (conn.authType ? 'Azure SQL' : 'PostgreSQL') }); 
                           setCurrentView(conn.authType || conn.type === 'Azure SQL' ? 'connect_azuresql' : 'connect_postgres'); 
                        }}
                        className="w-8 h-8 rounded-lg border border-zinc-200 bg-black text-zinc-500 hover:text-zinc-900 hover:bg-black flex items-center justify-center transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button 
                        onClick={() => {
                           if (confirm(`Are you sure you want to delete ${conn.name}?`)) {
                              toast.promise(
                                fetchWithAuth(`/api/connections/${conn.id}`, { method: 'DELETE' }).then(res => {
                                  if (!res.ok) throw new Error("Failed to delete connection.");
                                  return res;
                                }),
                                {
                                  loading: `Deleting ${conn.name}...`,
                                  success: () => {
                                    setConnections(prev => prev.filter(c => c.id !== conn.id));
                                    setChatSessions(prev => prev.filter(c => c.connectionId !== conn.id));
                                    setOpenTabs(prev => prev.filter(t => t.connectionId !== conn.id));
                                    if (currentView === conn.id) setCurrentView('manage_connections');
                                    addLog("SUCCESS", `Connection ${conn.name} deleted.`);
                                    return `Connection ${conn.name} deleted successfully.`;
                                  },
                                  error: `Failed to delete ${conn.name}.`
                                }
                              );
                           }
                        }}
                        className="w-8 h-8 rounded-lg border border-red-100 bg-red-900/10 text-red-500 hover:text-red-400 hover:bg-red-900/20 flex items-center justify-center transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
