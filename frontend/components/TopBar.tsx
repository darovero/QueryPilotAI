"use client";

import type { DashboardTab, ViewState } from "./types";

type TopBarProps = {
  currentView: ViewState;
  setCurrentView: (v: ViewState) => void;
  openTabs: DashboardTab[];
  setOpenTabs: React.Dispatch<React.SetStateAction<DashboardTab[]>>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingConnId: string | null;
  userName: string;
  userEmail: string;
  userInitial: string;
  isProfileMenuOpen: boolean;
  setIsProfileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleLogout: () => void;
};

export function TopBar({
  currentView, setCurrentView, openTabs, setOpenTabs,
  isSidebarOpen, setIsSidebarOpen, editingConnId,
  userName, userEmail, userInitial,
  isProfileMenuOpen, setIsProfileMenuOpen, handleLogout,
}: TopBarProps) {
  return (
    <div className="h-14 border-b border-zinc-200 flex items-center px-6 gap-6 shrink-0 bg-[var(--surface)] z-10 sticky top-0">
      <button
        onClick={() => setIsSidebarOpen(prev => !prev)}
        className="text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-100 -ml-2 mr-2"
        title="Toggle Sidebar"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>

      {currentView === 'welcome' && (
        <div className="text-[13px] font-medium flex items-center gap-2 h-full text-zinc-900 relative">
          <span className="material-symbols-outlined text-[16px]">grid_view</span>
          Data Sources
          <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-900 rounded-t-full"></div>
        </div>
      )}
      {currentView === 'integrations' && (
        <div className="text-[13px] font-medium flex items-center gap-2 h-full text-zinc-900 relative">
          <span className="material-symbols-outlined text-[16px]">grid_view</span>
          Integrations
          <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-900 rounded-t-full"></div>
        </div>
      )}
      {currentView === 'connect_postgres' && (
        <div className="text-[13px] font-medium flex items-center gap-2 h-full text-zinc-900 relative">
          <span className="material-symbols-outlined text-[16px]">database</span>
          {editingConnId ? 'Edit Connection' : 'Connect PostgreSQL'}
          <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-900 rounded-t-full"></div>
        </div>
      )}
      {currentView === 'manage_connections' && (
        <div className="text-[13px] font-medium flex items-center gap-2 h-full text-zinc-900 relative">
          <span className="material-symbols-outlined text-[16px]">settings_input_component</span>
          Manage Connections
          <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-900 rounded-t-full"></div>
        </div>
      )}

      {openTabs.map((tab) => (
        <div key={tab.id} className="flex items-center h-full relative group shrink-0">
          <button
            type="button"
            className={`text-[13px] font-medium flex items-center gap-2 h-full transition-colors pl-4 pr-1 ${currentView === tab.id ? 'text-zinc-900' : 'text-zinc-600 hover:text-zinc-900'}`}
            onClick={() => setCurrentView(tab.id)}
          >
            <span className="material-symbols-outlined text-[16px]">
              {tab.type === 'chat' ? 'chat_bubble' : 'terminal'}
            </span>
            <span className="truncate max-w-[120px]">{tab.title}</span>
            {currentView === tab.id && <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-900 rounded-t-full"></div>}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenTabs(prev => {
                const newTabs = prev.filter(t => t.id !== tab.id);
                if (currentView === tab.id) {
                  setCurrentView(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : 'welcome');
                }
                return newTabs;
              });
            }}
            className="ml-1 mr-4 w-5 h-5 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 opacity-0 group-hover:opacity-100 transition-all">
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      ))}

      <button onClick={() => setCurrentView('welcome')} className="text-zinc-300 hover:text-zinc-600 flex items-center transition-colors">
        <span className="material-symbols-outlined text-[18px]">add</span>
      </button>

      <div className="ml-auto flex items-center gap-4 relative">
        <button className="text-zinc-600 hover:text-zinc-900 transition-colors flex items-center"><span className="material-symbols-outlined text-[18px]">notifications</span></button>
        <button
          onClick={() => setIsProfileMenuOpen(prev => !prev)}
          className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-[12px] font-medium text-white shadow-inner hover:ring-2 hover:ring-zinc-200 transition-all focus:outline-none"
        >{userInitial}</button>

        {isProfileMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
            <div className="absolute top-12 right-0 w-[240px] bg-white rounded-2xl shadow-xl border border-zinc-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-zinc-100 flex flex-col items-start">
                <p className="text-[14px] font-semibold text-zinc-900">{userName}</p>
                <p className="text-[12px] text-zinc-500 truncate w-full">{userEmail}</p>
              </div>
              <div className="py-1">
                <button onClick={() => setIsProfileMenuOpen(false)} className="w-full text-left px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">help</span> Help and Support
                </button>
                <button onClick={() => setIsProfileMenuOpen(false)} className="w-full text-left px-4 py-2 text-[13px] text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">menu_book</span> Docs
                </button>
              </div>
              <div className="border-t border-zinc-100 py-1">
                <button
                  onClick={() => { setIsProfileMenuOpen(false); handleLogout(); }}
                  className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span> Logout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
