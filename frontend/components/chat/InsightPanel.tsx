"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../types";

type InsightPanelProps = {
  isOpen: boolean;
  selectedMessage: Message | null;
  onClose: () => void;
};

export function InsightPanel({ isOpen, selectedMessage, onClose }: InsightPanelProps) {
  if (!isOpen || !selectedMessage) return null;

  return (
    <>
      <div className="fixed inset-0 bg-zinc-900/40 z-[100]" onClick={onClose}></div>
      <div className="fixed inset-y-0 right-0 w-[600px] bg-white shadow-2xl z-[110] transform transition-transform border-l border-zinc-200 flex flex-col overflow-hidden">
        <div className="px-8 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center gap-2 text-slate-800">
            <span className="material-symbols-outlined text-blue-600">assignment</span>
            <h2 className="text-[18px] font-bold">Extended Analysis Report</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 p-2 rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-10 bg-white">
          {(() => {
            try {
              const parsed = JSON.parse(selectedMessage.insight || "{}");
              if (!parsed.extendedReport) return <div className="text-zinc-500 italic mt-4">No extended report available for this analysis.</div>;
              return (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-slate-900 mb-6 border-b border-zinc-100 pb-4" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold text-slate-800 mt-8 mb-4 flex items-center gap-2" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-3" {...props} />,
                    p: ({node, ...props}) => <p className="text-[15px] text-slate-600 leading-relaxed mb-5" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-6 text-[15px] text-slate-600 space-y-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-6 text-[15px] text-slate-600 space-y-2" {...props} />,
                    li: ({node, ...props}) => <li {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-5 bg-blue-50/50 py-3 pr-4 rounded-r-xl italic text-slate-700 my-6" {...props} />
                  }}
                >{parsed.extendedReport}</ReactMarkdown>
              );
            } catch {
              return <div className="text-zinc-500 italic mt-4">Error parsing extended report data.</div>;
            }
          })()}
        </div>
      </div>
    </>
  );
}
