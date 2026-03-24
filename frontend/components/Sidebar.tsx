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
    <div className={`relative flex shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[260px]' : 'w-0'}`}>
        <aside className={`bg-[#fafafa] border-r border-zinc-200 flex flex-col justify-between absolute inset-0 z-20 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'opacity-100' : 'opacity-0 overflow-hidden border-none pointer-events-none'}`}>
          
          <button 
             onClick={() => setIsSidebarOpen(false)}
             className="absolute -right-3 top-8 w-6 h-6 bg-white border border-zinc-200 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-colors z-50 shadow-sm"
          >
             <span className="material-symbols-outlined text-[14px]">chevron_left</span>
          </button>

          <div className="flex flex-col h-full">
        {/* Workspace Switcher */}
        <button type="button" className="py-5 px-6 flex items-center justify-between group cursor-pointer border-b border-zinc-200">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded overflow-hidden shadow-sm flex items-center justify-center bg-zinc-900">
               <span className="text-white text-[10px] font-bold">{organization?.name?.charAt(0) || 'O'}</span>
            </div>
            <span className="text-[13px] font-medium tracking-wide text-zinc-900 transition-colors">
              {organization?.name || `${userName.split(' ')[0]}'s workspace`}
            </span>
          </div>
          <span className="material-symbols-outlined text-sm text-zinc-400 group-hover:text-zinc-900 transition-colors">unfold_more</span>
        </button>
        
        {/* Navigation Links & Connections */}
        <div className="flex-1 overflow-y-auto w-full">
          <div className="px-4 py-4 space-y-1 border-b border-zinc-200">
            <button 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 group active:scale-[0.98] ${currentView === 'welcome' || currentView === 'integrations' || currentView === 'connect_postgres' ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50'}`}
              onClick={() => setCurrentView('welcome')}
            >
              <span className="material-symbols-outlined text-[20px] transition-transform text-zinc-400 group-hover:text-zinc-700">grid_view</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">Data Sources</span>
            </button>
            <button 
              onClick={() => setCurrentView('manage_connections')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 group active:scale-[0.98] ${currentView === 'manage_connections' ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50'}`}>
              <span className="material-symbols-outlined text-[20px] transition-transform text-zinc-400 group-hover:text-zinc-700">dns</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">Manage Connections</span>
            </button>
            <button 
              onClick={() => setCurrentView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 group active:scale-[0.98] ${currentView === 'settings' ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50'}`}>
              <span className="material-symbols-outlined text-[20px] transition-transform text-zinc-400 group-hover:text-zinc-700">tune</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">Settings</span>
            </button>
          </div>
          
          <div className="px-4 py-4">
             <div className="flex items-center justify-between px-3 text-[11px] uppercase tracking-widest text-zinc-500 font-bold mb-3">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[24px] text-zinc-400">database</span>
                  Connections
                </span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingConnId(null); setConnForm({ name: "New Connection", host: "", port: "5432", database: "", username: "", password: "", type: "PostgreSQL" }); setCurrentView('integrations'); }} className="hover:text-zinc-900 transition-colors text-zinc-400" title="New Connection">
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
                         <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors group ${isConnActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'}`}>
                             <button 
                                onClick={() => setExpandedConns(prev => ({ ...prev, [conn.id]: prev[conn.id] === false ? true : false }))}
                                className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors shrink-0"
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
                                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                   {(!conn.type || !['Azure SQL', 'PostgreSQL', 'MySQL'].includes(conn.type)) && (
                                      <div className={`w-1.5 h-1.5 rounded-full ${isConnActive ? 'bg-emerald-500' : 'bg-zinc-400'}`}></div>
                                   )}
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
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-200 rounded text-zinc-500 hover:text-zinc-900 transition-all shrink-0 ml-1" 
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
                                        className={`flex-1 text-left truncate px-3 py-1.5 rounded-md text-[13px] transition-colors ${currentView === chat.id ? 'bg-zinc-100 text-zinc-900 font-medium' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
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
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-red-500 hover:text-red-600 rounded transition-all shrink-0 ml-1"
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
        <div className="border-t border-zinc-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                <span className="text-[12px] font-bold text-zinc-600">{userName?.charAt(0)?.toUpperCase() || 'U'}</span>
              </div>
              <span className="text-[13px] text-zinc-600 truncate">{userName || 'User'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
              title="Sign out"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  </div>
  );
}
