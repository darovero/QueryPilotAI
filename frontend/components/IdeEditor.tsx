"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { prism } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { DashboardTab } from "./types";

type IdeEditorProps = {
  activeTab: DashboardTab;
  setOpenTabs: React.Dispatch<React.SetStateAction<DashboardTab[]>>;
};

export function IdeEditor({ activeTab, setOpenTabs }: IdeEditorProps) {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4]">
      {/* Editor Toolbar */}
      <div className="h-16 border-b border-[#2d2d2d] flex items-center px-8 justify-between shrink-0 bg-[#1e1e1e]">
        <div className="flex items-center gap-3 text-[14px] font-mono text-[#858585]">
          <span className="material-symbols-outlined text-[18px] text-[#4d90fe]">database</span>
          <span>analytics_db</span>
          <span className="text-[#555] mx-2">|</span>
          <span className="text-[#858585] text-[12px] font-normal">Connected • 12ms</span>
        </div>
        <div>
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[18px]">play_arrow</span>
            Run Query <span className="text-emerald-200/50 text-[11px] ml-2 font-mono">⌘Enter</span>
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative overflow-hidden bg-[#1e1e1e] text-[15px]">
        <textarea
          className="absolute inset-0 w-full h-full text-transparent caret-white p-8 resize-none focus:outline-none z-10 bg-transparent"
          style={{ fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace', lineHeight: '1.6' }}
          value={activeTab.sql}
          onChange={(e) => {
            const newSql = e.target.value;
            setOpenTabs(prev => prev.map(t => t.id === activeTab.id ? { ...t, sql: newSql } : t));
          }}
          onScroll={(e) => {
            const target = e.target as HTMLTextAreaElement;
            const div = target.nextElementSibling as HTMLDivElement;
            if (div) { div.scrollTop = target.scrollTop; div.scrollLeft = target.scrollLeft; }
          }}
          spellCheck="false"
        />
        <div className="absolute inset-0 w-full h-full pointer-events-none p-8 z-0 overflow-hidden" aria-hidden="true">
          <SyntaxHighlighter language="sql" style={prism} customStyle={{ margin: 0, padding: 0, background: 'transparent', lineHeight: '1.6', fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace' }}>
            {activeTab.sql || ' '}
          </SyntaxHighlighter>
        </div>
      </div>

      {/* Results Area (Mock) */}
      <div className="h-[45%] bg-[#181818] border-t border-[#2d2d2d] flex flex-col shrink-0">
        <div className="h-12 flex items-center px-8 justify-between bg-[#1e1e1e]">
          <div className="flex items-center gap-8 text-[13px] text-[#858585]">
            <span className="text-[#cccccc] font-medium">Results</span>
            <span className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"><span className="material-symbols-outlined text-[16px]">download</span> Export CSV</span>
            <span className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"><span className="material-symbols-outlined text-[16px]">content_copy</span> Copy</span>
            <span className="text-[#555] mx-1">|</span>
            <span>4 rows in result</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-8 bg-[#181818]">
          <table className="w-full text-left border-collapse text-[14px]">
            <thead>
              <tr>
                <th className="border-b border-[#2d2d2d] text-[#858585] font-medium p-3 sticky top-0 bg-[#181818]">empresa</th>
                <th className="border-b border-[#2d2d2d] text-[#858585] font-medium p-3 sticky top-0 bg-[#181818]">gasto_total_salarios</th>
              </tr>
            </thead>
            <tbody className="text-[#d4d4d4] font-mono">
              <tr className="border-b border-[#2d2d2d]/50 hover:bg-[#2a2d2e] transition-colors"><td className="p-3 whitespace-nowrap pt-4">Quantum Dynamics</td><td className="p-3 whitespace-nowrap pt-4">375000.00</td></tr>
              <tr className="border-b border-[#2d2d2d]/50 hover:bg-[#2a2d2e] transition-colors"><td className="p-3 whitespace-nowrap">Pacific FinTech</td><td className="p-3 whitespace-nowrap">142000.00</td></tr>
              <tr className="border-b border-[#2d2d2d]/50 hover:bg-[#2a2d2e] transition-colors"><td className="p-3 whitespace-nowrap">Global Logistics Corp</td><td className="p-3 whitespace-nowrap">95000.00</td></tr>
              <tr className="border-b border-[#2d2d2d]/50 hover:bg-[#2a2d2e] transition-colors"><td className="p-3 whitespace-nowrap pb-4">NeoEnergy S.A.</td><td className="p-3 whitespace-nowrap pb-4">82000.00</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
