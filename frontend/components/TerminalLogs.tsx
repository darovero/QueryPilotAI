import { LogEntry } from "./types";
import { useEffect, useRef } from "react";

export function TerminalLogs({ terminalLogs }: { terminalLogs: LogEntry[] }) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  return (
    <div className="w-[320px] bg-zinc-950 border-l border-zinc-800 flex flex-col shrink-0 text-zinc-300 relative z-20 hidden lg:flex rounded-l-2xl shadow-2xl ml-2">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900/50 bg-[#0a0a0b]/80 backdrop-blur-md rounded-tl-2xl">
          <h3 className="text-[12px] font-bold tracking-widest uppercase text-zinc-500 font-mono">Terminal</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] space-y-3 leading-relaxed" ref={terminalRef}>
          {terminalLogs.map((log) => (
              <div key={log.id} className="flex flex-col gap-1 tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-zinc-600 font-mono text-[10px] tabular-nums font-semibold opacity-70">
                     {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                  </span>
                  <div className="flex items-start gap-2.5">
                      <span className={`w-14 shrink-0 font-bold tracking-wider opacity-90 ${log.level === 'INFO' ? 'text-blue-400' : log.level === 'SUCCESS' ? 'text-emerald-400' : log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-amber-400' : 'text-zinc-400'}`}>
                          [{log.level}]
                      </span>
                      <span className={`break-words ${log.level === 'ERROR' ? 'text-red-300/90' : log.level === 'WARN' ? 'text-amber-300/90' : 'text-zinc-300/90'}`}>
                          {log.message}
                      </span>
                  </div>
              </div>
          ))}
          {/* Typing animation block */}
          {terminalLogs.length > 0 && Array.from({ length: 1 }).map((_, i) => (
             <div key={'cursor-'+i} className="flex items-end gap-1 text-zinc-600 mt-4 opacity-50">
                <span className="text-emerald-500 font-bold">~</span>
                <span className="text-blue-500 font-bold">$</span>
                <div className="w-1.5 h-3 bg-zinc-400 animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite]"></div>
             </div>
          ))}
      </div>
    </div>
  );
}
