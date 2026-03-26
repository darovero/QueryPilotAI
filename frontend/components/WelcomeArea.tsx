import { Connection, Organization } from "./types";
import { TypewriterTitle } from "./TypewriterTitle";
import { AppIcon } from "./AppIcon";

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
      <div className="mono-theme mosaic-center flex-1 flex flex-col items-center pt-32 px-10 bg-zinc-950 w-full h-full relative overflow-y-auto animate-in fade-in duration-500">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="mb-12 mono-enter">
                  <h2 className="text-2xl font-medium text-zinc-400 mb-2">
               Hello {userName.split(' ')[0]}
            </h2>
                  <h1 className="text-3xl font-bold text-zinc-100 tracking-wide max-w-full">
               <TypewriterTitle text="Let's get you started with QueryPilot" speedMs={52} startDelayMs={220} />
            </h1>
        </div>
        
        {/* Action Cards */}
        <div className="space-y-4">
           {/* Card 1: Connect Data Source */}
           <button 
              onClick={() => setCurrentView('integrations')}
              className="mono-enter-delay-1 w-full bg-zinc-900 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 p-6 rounded-2xl flex items-center justify-between group transition-all text-left shadow-sm">
              <div className="flex items-center gap-6">
                 <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700 group-hover:bg-zinc-700 transition-colors">
                    <AppIcon name="database" className="h-[24px] w-[24px] text-zinc-200 group-hover:text-white" />
                 </div>
                 <div>
                    <h3 className="text-[15px] font-semibold text-zinc-100 mb-1 tracking-wide">Connect Your Data Source</h3>
                    <p className="text-[13px] text-zinc-400 font-medium">Start asking questions and create charts from your data</p>
                 </div>
              </div>
              <AppIcon name="arrow_forward" className="h-[20px] w-[20px] text-zinc-500 group-hover:text-zinc-200 transition-colors group-hover:translate-x-1 duration-300" />
           </button>

           {/* Card 2: Read Docs */}
           <button 
              onClick={() => {
                window.location.href = '/docs';
              }}
              className="mono-enter-delay-2 mono-scanline w-full bg-zinc-900 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 p-6 rounded-2xl flex items-center justify-between group transition-all text-left shadow-sm">
              <div className="flex items-center gap-6">
                 <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-700 group-hover:bg-zinc-700 transition-colors">
                    <AppIcon name="description" className="h-[24px] w-[24px] text-zinc-200 group-hover:text-white" />
                 </div>
                 <div>
                    <h3 className="text-[15px] font-semibold text-zinc-100 mb-1 tracking-wide">Read Our Integration Docs</h3>
                    <p className="text-[13px] text-zinc-400 font-medium">Learn how to connect your data source with QueryPilot</p>
                 </div>
              </div>
              <AppIcon name="arrow_forward" className="h-[20px] w-[20px] text-zinc-500 group-hover:text-zinc-200 transition-colors group-hover:translate-x-1 duration-300" />
           </button>
        </div>
      </div>
    </div>
  );
}
