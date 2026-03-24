import { Connection, Organization } from "./types";

interface WelcomeAreaProps {
  userName: string;
  organization: Organization | null;
  connections: Connection[];
  setCurrentView: (view: string) => void;
  setEditingConnId: (id: string | null) => void;
  setConnForm: (form: Partial<Connection>) => void;
}

export function WelcomeArea({ userName, setCurrentView }: WelcomeAreaProps) {
  return (
    <div className="flex-1 flex flex-col items-center pt-32 px-10 bg-black w-full h-full relative overflow-y-auto animate-in fade-in duration-500">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="mb-12">
            <h2 className="text-2xl font-medium text-zinc-500 mb-2">
               Hello {userName.split(' ')[0]}
            </h2>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-wide">
               Let's get you started with QueryPilot
            </h1>
        </div>
        
        {/* Action Cards */}
        <div className="space-y-4">
           {/* Card 1: Connect Data Source */}
           <button 
              onClick={() => setCurrentView('integrations')}
              className="w-full bg-black hover:bg-black border border-zinc-200 hover:border-zinc-300 p-6 rounded-2xl flex items-center justify-between group transition-all text-left shadow-sm">
              <div className="flex items-center gap-6">
                 <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200 group-hover:bg-zinc-200 transition-colors">
                    <span className="material-symbols-outlined text-[24px] text-zinc-600 group-hover:text-zinc-900">database</span>
                 </div>
                 <div>
                    <h3 className="text-[15px] font-semibold text-zinc-900 mb-1 tracking-wide">Connect Your Data Source</h3>
                    <p className="text-[13px] text-zinc-500 font-medium">Start asking questions and create charts from your data</p>
                 </div>
              </div>
              <span className="material-symbols-outlined text-zinc-400 group-hover:text-zinc-600 transition-colors group-hover:translate-x-1 duration-300">arrow_forward</span>
           </button>

           {/* Card 2: Read Docs */}
           <button 
              onClick={() => window.open('https://querypilot.com/docs', '_blank')}
              className="w-full bg-black hover:bg-black border border-zinc-200 hover:border-zinc-300 p-6 rounded-2xl flex items-center justify-between group transition-all text-left shadow-sm">
              <div className="flex items-center gap-6">
                 <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 border border-zinc-200 group-hover:bg-zinc-200 transition-colors">
                    <span className="material-symbols-outlined text-[24px] text-zinc-600 group-hover:text-zinc-900">description</span>
                 </div>
                 <div>
                    <h3 className="text-[15px] font-semibold text-zinc-900 mb-1 tracking-wide">Read Our Integration Docs</h3>
                    <p className="text-[13px] text-zinc-500 font-medium">Learn how to connect your data source with QueryPilot</p>
                 </div>
              </div>
              <span className="material-symbols-outlined text-zinc-400 group-hover:text-zinc-600 transition-colors group-hover:translate-x-1 duration-300">arrow_forward</span>
           </button>
        </div>
      </div>
    </div>
  );
}
