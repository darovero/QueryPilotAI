"use client";

import type { Organization } from "../types";

type SettingsViewProps = {
  userName: string;
  userEmail: string;
  userInitial: string;
  organization: Organization | null;
  organizations: Organization[];
  setOrganization: (o: Organization | null) => void;
  setIsAddingWorkspace: (v: boolean) => void;
  handleLogout: () => void;
  handleDeleteWorkspace: () => void;
  handleDeleteAccount: () => void;
};

export function SettingsView({
  userName, userEmail, userInitial,
  organization, organizations, setOrganization,
  setIsAddingWorkspace, handleLogout, handleDeleteWorkspace, handleDeleteAccount,
}: SettingsViewProps) {
  return (
    <div className="flex bg-white h-full text-zinc-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 p-10 max-w-4xl mx-auto overflow-y-auto">
        <div className="mb-8 border-b border-zinc-200 pb-6 text-center">
          <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Personal Settings</h1>
          <p className="text-[14px] text-zinc-500 mt-2">Manage your account and preferences.</p>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row md:items-center gap-6 relative">
          <div className="w-16 h-16 rounded-xl bg-purple-600 flex items-center justify-center text-white text-2xl font-medium shadow-sm shrink-0">{userInitial}</div>
          <div className="flex-1">
            <h2 className="text-[18px] font-semibold text-zinc-900 flex items-center gap-2">
              {organization?.name || `${userName}'s Workspace`}
              {organizations.length > 1 && (
                <select
                  className="text-sm bg-transparent border-none text-zinc-500 cursor-pointer focus:ring-0 p-0"
                  value={organization?.id || ''}
                  onChange={(e) => setOrganization(organizations.find(o => o.id === e.target.value) || null)}
                >
                  {organizations.map(o => (<option key={o.id} value={o.id}>{o.name}</option>))}
                </select>
              )}
            </h2>
            <p className="text-[14px] text-zinc-500 mt-1">{organization ? 'Organization Account' : 'Personal Account'} · {organizations.length}/3 Workspaces</p>
          </div>
          <div className="flex items-center gap-3">
            {organizations.length < 3 && (
              <button onClick={() => setIsAddingWorkspace(true)} className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors">
                + Add Workspace
              </button>
            )}
            <button onClick={handleLogout} className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-colors shadow-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
            </button>
          </div>
        </div>

        <div className="space-y-10">
          <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-2">
              <div>
                <h3 className="text-[15px] font-medium text-zinc-900">Workspace Name</h3>
                <p className="text-[13px] text-zinc-500 mt-1 max-w-md">Change the name of your workspace. This will be visible to all members associated with this workspace.</p>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <input type="text" value={organization?.name || `${userName}'s Workspace`} readOnly className="bg-zinc-100 border border-zinc-200 text-zinc-600 rounded-xl px-4 py-2.5 text-[14px] font-medium w-full md:w-[260px] focus:outline-none transition-all shadow-sm cursor-not-allowed" />
                <button disabled className="opacity-50 bg-zinc-900 text-white font-medium rounded-xl px-5 text-[13px] shadow-sm border border-transparent whitespace-nowrap cursor-not-allowed">Save</button>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-[15px] font-medium text-zinc-900">Account Identity</h3>
                <p className="text-[13px] text-zinc-500 mt-1">Your personal details authenticated through Azure AD</p>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 text-[15px] font-bold shadow-sm">{userInitial}</div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shrink-0">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] font-medium text-zinc-900">{userName}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-md">Entra ID</span>
                  </div>
                </div>
                <span className="text-[14px] text-zinc-500 font-medium">{userEmail}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-red-100 pt-10">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 space-y-8">
              <div>
                <h3 className="text-[15px] font-semibold text-red-900 mb-2">Delete Workspace</h3>
                <p className="text-[13px] text-red-700 mb-4 max-w-2xl">Permanently delete this organization workspace. All members will lose access immediately.</p>
                <button onClick={handleDeleteWorkspace} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium px-5 py-2.5 rounded-xl text-[13px] transition-colors shadow-sm">Delete Workspace</button>
              </div>
              <div className="border-t border-red-200/50 pt-8">
                <h3 className="text-[15px] font-semibold text-red-900 mb-2">Delete Account</h3>
                <p className="text-[13px] text-red-700 mb-4 max-w-2xl">Permanently delete your account and all of its contents. This action is not reversible. All your connected databases and chat history will be wiped from InsightForge AI.</p>
                <button onClick={handleDeleteAccount} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium px-5 py-2.5 rounded-xl text-[13px] transition-colors shadow-sm">Delete Account</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
