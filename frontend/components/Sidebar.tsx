import { Connection, ChatSession, DashboardTab, Organization } from "./types";
import { toast } from "sonner";
import { useMsal } from "@azure/msal-react";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean) => void;
  organization: { name: string; industry?: string } | null;
  userName: string;
  currentView: string;
  setCurrentView: (view: string) => void;
  fetchWithAuth: (url: string, options?: any) => Promise<Response>;
  userId: string | undefined;
  setHistoryData: (data: any[]) => void;
  connections: any[];
  setConnections: React.Dispatch<React.SetStateAction<any[]>>;
  chatSessions: any[];
  setChatSessions: React.Dispatch<React.SetStateAction<any[]>>;
  openTabs: any[];
  setOpenTabs: React.Dispatch<React.SetStateAction<any[]>>;
  expandedConns: Record<string, boolean>;
  setExpandedConns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  openChat: (chatId: string) => void;
  setEditingConnId: (id: string | null) => void;
  setConnForm: React.Dispatch<React.SetStateAction<Partial<any>>>;
  addLog: (level: any, msg: string) => void;
}

export function Sidebar({
  isSidebarOpen, setIsSidebarOpen, organization, userName, currentView, setCurrentView, fetchWithAuth, userId, setHistoryData,
  connections, setConnections, chatSessions, setChatSessions, openTabs, setOpenTabs, expandedConns, setExpandedConns,
  openChat, setEditingConnId, setConnForm, addLog
}: SidebarProps) {
  const { instance } = useMsal();

  const handleLogout = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  };

  return (
    <>
      <div className={`fixed inset-0 bg-[#a78bfa]/50 z-40 transition-opacity duration-300 md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
      
      <div className={`fixed inset-y-0 left-0 z-50 md:relative flex shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0 w-[260px] md:w-0'}`}>
        <aside className={`bg-[#000000] border-r border-[#333333] flex flex-col justify-between absolute inset-0 z-20 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'opacity-100' : 'opacity-0 overflow-hidden border-none pointer-events-none'}`}>
          
          <button 
             onClick={() => setIsSidebarOpen(false)}
             className="absolute -right-4 top-7 w-9 h-9 bg-[#0a0a0a] border border-[#333333] rounded-xl flex items-center justify-center text-[#8a8a8a] hover:text-[#f4f0e6] hover:bg-[#111111] transition-colors z-50 shadow-sm"
          >
             <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>

          <div className="flex flex-col h-full">
        {/* Workspace Switcher */}
        <button type="button" className="py-5 px-6 flex items-center justify-between group cursor-pointer border-b border-[#333333]">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-none overflow-hidden shadow-sm flex items-center justify-center bg-[#a78bfa]">
               <span className="text-black text-[10px] font-bold">{organization?.name?.charAt(0) || 'O'}</span>
            </div>
            <span className="text-[13px] font-medium tracking-wide text-[#f4f0e6] transition-colors">
              {organization?.name || `${userName.split(' ')[0]}'s workspace`}
            </span>
          </div>
          <span className="material-symbols-outlined text-sm text-[#8a8a8a] group-hover:text-[#f4f0e6] transition-colors">unfold_more</span>
        </button>
        
        {/* Navigation Links & Connections */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="px-4 py-4 space-y-1 border-b border-[#333333]">
            <button 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-[13px] transition-all duration-200 group active:scale-[0.98] ${currentView === 'welcome' || currentView === 'integrations' || currentView === 'connect_postgres' ? 'bg-[#1a1a1a] text-[#f4f0e6] font-medium' : 'text-[#a3a3a3] hover:text-[#f4f0e6] hover:bg-[#1a1a1a]/50'}`}
              onClick={() => setCurrentView('welcome')}
            >
              <span className="material-symbols-outlined text-[20px] transition-transform text-[#8a8a8a] group-hover:text-[#d1cdbd]">grid_view</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">Data Sources</span>
            </button>
            <button 
              onClick={() => setCurrentView('manage_connections')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-[13px] transition-all duration-200 group active:scale-[0.98] ${currentView === 'manage_connections' ? 'bg-[#1a1a1a] text-[#f4f0e6] font-medium' : 'text-[#a3a3a3] hover:text-[#f4f0e6] hover:bg-[#1a1a1a]/50'}`}>
              <span className="material-symbols-outlined text-[20px] transition-transform text-[#8a8a8a] group-hover:text-[#d1cdbd]">dns</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">Manage Connections</span>
            </button>
            <button 
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-[13px] transition-all duration-200 group active:scale-[0.98] ${currentView.startsWith('settings') ? 'bg-[#1a1a1a] text-[#f4f0e6] font-medium' : 'text-[#a3a3a3] hover:text-[#f4f0e6] hover:bg-[#1a1a1a]/50'}`}>
              <span className="material-symbols-outlined text-[20px] transition-transform text-[#8a8a8a] group-hover:text-[#d1cdbd]">tune</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">Settings</span>
            </button>
          </div>
          
          <div className="px-4 py-4">
             <div className="flex items-center justify-between px-3 text-[11px] uppercase tracking-widest text-[#a3a3a3] font-bold mb-3">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[24px] text-[#8a8a8a]">database</span>
                  Connections
                </span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingConnId(null); setConnForm({ name: "New Connection", host: "", port: "5432", database: "", username: "", password: "", type: "PostgreSQL" }); setCurrentView('integrations'); }} className="hover:text-[#f4f0e6] transition-colors text-[#8a8a8a]" title="New Connection">
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </button>
                </div>
             </div>
             
             <div className="space-y-3">
                {connections.map(conn => {
                   const chats = chatSessions.filter(c => c.connectionId === conn.id);
                   const isConnActive = chats.some(c => c.id === currentView) || openTabs.some(t => t.connectionId === conn.id && t.id === currentView);
                   const isExpanded = expandedConns[conn.id] !== false;
                   
                   return (
                      <div key={conn.id} className="space-y-1">
                         <div className={`flex items-center justify-between px-3 py-1.5 rounded-none text-[13px] font-medium transition-colors group ${isConnActive ? 'bg-[#1a1a1a] text-[#f4f0e6]' : 'text-[#b5b5b5] hover:bg-[#111111] hover:text-[#f4f0e6]'}`}>
                             <button 
                                onClick={() => setExpandedConns(prev => ({ ...prev, [conn.id]: prev[conn.id] === false ? true : false }))}
                                className="w-5 h-5 flex items-center justify-center text-[#8a8a8a] hover:text-[#f4f0e6] transition-colors shrink-0"
                             >
                                <span className="material-symbols-outlined text-[16px] transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>chevron_right</span>
                             </button>
                             <button 
                                onClick={() => {
                                   if (chats.length === 0) {
                                       const newChatId = crypto.randomUUID();
                                       fetchWithAuth('/api/sessions', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ id: newChatId, userId: userId, connectionId: conn.id, title: "New Chat" })
                                       });
                                       setChatSessions(prev => [...prev, { id: newChatId, connectionId: conn.id, title: 'New Chat', messages: [] }]);
                                       setOpenTabs(prev => { 
                                           if (!prev.find(t => t.id === newChatId)) {
                                               return [...prev, { type: 'chat', id: newChatId, title: 'New Chat', connectionId: conn.id }];
                                           }
                                           return prev;
                                       });
                                       setCurrentView(newChatId);
                                   } else {
                                       openChat(chats[chats.length - 1].id);
                                   }
                                }}
                                className="flex flex-1 items-center gap-3 truncate text-left h-full py-1 ml-1"
                             >
                                 <div className="w-5 h-5 flex items-center justify-center shrink-0 relative">
                                    {conn.type === 'Azure SQL' && <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-4 h-4 object-contain" alt="Azure SQL" />}
                                    {conn.type === 'PostgreSQL' && <img src="/assets/iconos sql/DeviconPostgresqlWordmark.svg" className="w-4 h-4 object-contain" alt="PostgreSQL" />}
                                    {conn.type === 'MySQL' && <img src="/assets/iconos sql/LogosMysql.svg" className="w-4 h-4 object-contain" alt="MySQL" />}
                                    {(!conn.type || !['Azure SQL', 'PostgreSQL', 'MySQL'].includes(conn.type)) && (
                                       <span className="material-symbols-outlined text-[16px] text-[#8a8a8a]">database</span>
                                    )}
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-none border border-[#fafafa] transition-colors ${isConnActive ? 'bg-emerald-500' : 'bg-zinc-300'}`}></div>
                                 </div>
                                <span className="truncate">{conn.name}</span>
                             </button>
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newChatId = crypto.randomUUID();
                                    fetchWithAuth('/api/sessions', {
                                       method: 'POST',
                                       headers: { 'Content-Type': 'application/json' },
                                       body: JSON.stringify({ id: newChatId, userId: userId, connectionId: conn.id, title: "New Chat" })
                                    });
                                    setChatSessions(prev => [...prev, { id: newChatId, connectionId: conn.id, title: 'New Chat', messages: [] }]);
                                    setOpenTabs(prev => [...prev, { type: 'chat', id: newChatId, title: 'New Chat', connectionId: conn.id }]);
                                    setCurrentView(newChatId);
                                    setExpandedConns(prev => ({ ...prev, [conn.id]: true }));
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#222222] rounded-none text-[#a3a3a3] hover:text-[#f4f0e6] transition-all shrink-0 ml-1" 
                                title="New Chat">
                                 <span className="material-symbols-outlined text-[16px]">add</span>
                              </button>
                         </div>
                         {isExpanded && chats.length > 0 && (
                            <div className="pl-6 pr-2 space-y-0.5">
                               {chats.map(chat => (
                                  <div key={chat.id} className="group flex items-center pr-1">
                                     <button 
                                        onClick={() => openChat(chat.id)}
                                        className={`flex-1 text-left truncate px-3 py-1.5 rounded-none text-[13px] transition-colors ${currentView === chat.id ? 'bg-[#1a1a1a] text-[#f4f0e6] font-medium' : 'text-[#a3a3a3] hover:text-[#f4f0e6] hover:bg-[#111111]'}`}
                                     >
                                        {chat.title}
                                     </button>
                                     <button 
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              if (!confirm('Are you sure you want to delete this chat? All messages will be lost.')) return;
                                              fetchWithAuth(`/api/sessions/${chat.id}`, { method: 'DELETE' }).then(r => {
                                                if (r.ok) {
                                                  setChatSessions(prev => prev.filter(c => c.id !== chat.id));
                                                  setOpenTabs(prev => {
                                                      const newTabs = prev.filter(t => t.id !== chat.id);
                                                      if (currentView === chat.id) {
                                                          setCurrentView(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : 'welcome');
                                                      }
                                                      return newTabs;
                                                  });
                                                  toast.success('Chat deleted.');
                                                } else { toast.error('Failed to delete chat.'); }
                                              }).catch(() => toast.error('Failed to delete chat.'));
                                          }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/10 text-red-500 hover:text-red-500 rounded-none transition-all shrink-0 ml-1"
                                        title="Delete Chat"
                                     >
                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                     </button>
                                  </div>
                               ))}
                            </div>
                         )}
                      </div>
                   );
                })}
             </div>
          </div>
        </div>

        {/* User + Logout */}
        <div className="border-t border-[#333333] px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-none bg-[#222222] flex items-center justify-center shrink-0">
                <span className="text-[12px] font-bold text-[#b5b5b5]">{userName?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
              <span className="text-[13px] text-[#b5b5b5] truncate">{userName || 'User'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-none text-[#8a8a8a] hover:text-red-500 hover:bg-red-900/10 transition-all"
              title="Sign out"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
      </div>
    </>
  );
}
