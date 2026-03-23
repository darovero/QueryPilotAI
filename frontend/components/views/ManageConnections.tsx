"use client";

import { toast } from "sonner";
import type { Connection, ChatSession, DashboardTab, ViewState } from "../types";

type ManageConnectionsProps = {
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  setCurrentView: (v: ViewState) => void;
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  setOpenTabs: React.Dispatch<React.SetStateAction<DashboardTab[]>>;
  setExpandedConns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setEditingConnId: (id: string | null) => void;
  setConnForm: React.Dispatch<React.SetStateAction<Partial<Connection>>>;
  currentView: ViewState;
  addLog: (level: "INFO" | "SUCCESS" | "WARN" | "ERROR" | "DEBUG" | "READY", msg: string) => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
};

export function ManageConnections({
  connections, setConnections, setCurrentView,
  setChatSessions, setOpenTabs, setExpandedConns,
  setEditingConnId, setConnForm, currentView, addLog, fetchWithAuth,
}: ManageConnectionsProps) {
  return (
    <div className="py-16 px-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-200 bg-zinc-50 text-[12px] font-semibold text-zinc-500 uppercase tracking-widest">
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
              <div key={conn.id} className="grid grid-cols-12 gap-4 p-4 items-center text-[14px] hover:bg-zinc-50/50 transition-colors text-zinc-700">
                <div className="col-span-3 font-medium text-zinc-900 truncate">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100">
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
                      setOpenTabs(prev => { if (!prev.find(t => t.id === newChatId)) return [...prev, { type: 'chat', id: newChatId, title: 'New Chat', connectionId: conn.id }]; return prev; });
                      setCurrentView(newChatId);
                      setExpandedConns(prev => ({ ...prev, [conn.id]: true }));
                      addLog("SUCCESS", `Connected to ${conn.name}.`);
                    }}
                    className="w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                    title="Connect & Chat"
                  ><span className="material-symbols-outlined text-[16px]">link</span></button>
                  <button
                    onClick={() => {
                      setEditingConnId(conn.id);
                      setConnForm({ ...conn, type: conn.type || (conn.authType ? 'Azure SQL' : 'PostgreSQL') });
                      setCurrentView(conn.authType || conn.type === 'Azure SQL' ? 'connect_azuresql' : 'connect_postgres');
                    }}
                    className="w-8 h-8 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 flex items-center justify-center transition-colors"
                    title="Edit"
                  ><span className="material-symbols-outlined text-[16px]">edit</span></button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${conn.name}?`)) {
                        toast.promise(
                          fetchWithAuth(`/api/connections/${conn.id}`, { method: 'DELETE' }).then(res => { if (!res.ok) throw new Error("Failed to delete connection."); return res; }),
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
                    className="w-8 h-8 rounded-lg border border-red-100 bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 flex items-center justify-center transition-colors"
                    title="Delete"
                  ><span className="material-symbols-outlined text-[16px]">delete</span></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
