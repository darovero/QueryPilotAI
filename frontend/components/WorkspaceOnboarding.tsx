import { useState } from "react";

interface WorkspaceOnboardingProps {
    handleOnboardingComplete: (data: { name: string; industry: string; }) => void;
    isAddingWorkspace: boolean;
}

export function WorkspaceOnboarding({ handleOnboardingComplete, isAddingWorkspace }: WorkspaceOnboardingProps) {
  const [orgForm, setOrgForm] = useState({ name: '', industry: 'Technology' });

  return (
    <div className="min-h-screen w-full bg-[#fafafa] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-100 rounded-full blur-[120px] pointer-events-none opacity-50"></div>
        <div className="z-10 w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
           <div className="space-y-3 text-center">
              <div className="w-16 h-16 bg-white border border-zinc-200 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-sm">
                 <span className="material-symbols-outlined text-[32px] text-zinc-800">analytics</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Create your workspace</h1>
              <p className="text-[15px] font-medium text-zinc-500">Set up your organization to start querying your data securely.</p>
           </div>
           
           <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-6">
              <div className="space-y-1.5">
                 <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Workspace Name</label>
                 <input 
                   type="text" 
                   value={orgForm.name}
                   onChange={e => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                   placeholder="e.g. Acme Corp"
                   className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-[14px] text-zinc-900 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors shadow-sm" 
                 />
              </div>
              <div className="space-y-1.5">
                 <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Industry</label>
                 <select 
                   value={orgForm.industry}
                   onChange={e => setOrgForm(prev => ({ ...prev, industry: e.target.value }))}
                   className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-[14px] text-zinc-900 focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 transition-colors shadow-sm appearance-none">
                     <option value="Technology">Technology</option>
                     <option value="Finance">Finance & Banking</option>
                     <option value="Healthcare">Healthcare</option>
                     <option value="Retail">Retail & E-commerce</option>
                     <option value="Manufacturing">Manufacturing</option>
                     <option value="Other">Other</option>
                 </select>
              </div>
              <button 
                 onClick={() => handleOnboardingComplete(orgForm)}
                 disabled={!orgForm.name.trim() || isAddingWorkspace}
                 className="w-full bg-zinc-900 text-white font-bold rounded-xl py-3.5 text-[14px] hover:bg-zinc-800 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                 {isAddingWorkspace ? 'Creating...' : 'Continue to QueryPilot'}
              </button>
           </div>
           <div className="text-center">
               <p className="text-[12px] font-medium text-zinc-500">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
           </div>
        </div>
    </div>
  );
}
