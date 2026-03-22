"use client";

import type { ViewState } from "../types";

type WelcomeViewProps = {
  userName: string;
  setCurrentView: (v: ViewState) => void;
};

export function WelcomeView({ userName, setCurrentView }: WelcomeViewProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center max-w-[600px] mx-auto space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3">
        <h2 className="text-xl text-zinc-500 tracking-tight font-medium">Hello {userName}</h2>
        <h1 className="text-4xl font-semibold text-zinc-900 tracking-tight">Let&apos;s get you started.</h1>
      </div>
      <div className="w-full space-y-4">
        <button
          onClick={() => setCurrentView('integrations')}
          className="w-full text-left bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 flex items-center justify-between transition-all group active:scale-[0.99] hover:shadow-md"
        >
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shadow-inner group-hover:bg-zinc-100 transition-colors">
              <span className="material-symbols-outlined text-[24px] text-zinc-700">database</span>
            </div>
            <div>
              <h3 className="text-[15px] font-medium text-zinc-900 mb-1">Connect Your Data Source</h3>
              <p className="text-[13px] text-zinc-500 font-medium">Start asking questions and create charts from your data seamlessly.</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-900 transition-all border border-zinc-200 group-hover:border-zinc-900 shadow-sm group-hover:shadow-zinc-900/20">
            <span className="material-symbols-outlined text-[18px] text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
          </div>
        </button>
        <button className="w-full text-left bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl p-6 flex items-center justify-between transition-all group active:scale-[0.99] hover:shadow-md">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shadow-inner group-hover:bg-zinc-100 transition-colors">
              <span className="material-symbols-outlined text-[24px] text-zinc-700">menu_book</span>
            </div>
            <div>
              <h3 className="text-[15px] font-medium text-zinc-900 mb-1">Read Our Integration Docs</h3>
              <p className="text-[13px] text-zinc-500 font-medium">Learn how to connect your data source with our robust API guides.</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center group-hover:bg-zinc-900 transition-all border border-zinc-200 group-hover:border-zinc-900 shadow-sm group-hover:shadow-zinc-900/20">
            <span className="material-symbols-outlined text-[18px] text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
          </div>
        </button>
      </div>
    </div>
  );
}
