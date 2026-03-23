"use client";

import React from "react";
import { MessageBubble } from "./MessageBubble";
import type { Message, DashboardTab } from "../types";

type ChatPanelProps = {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  isTyping: boolean;
  userName: string;
  handleSubmit: () => void;
  handleApproval: (msg: Message, decision: 'Approved' | 'Rejected', comments?: string) => void;
  handleCopySQL: (sql: string) => void;
  activeTabs: Record<string, 'query' | 'insight' | 'results'>;
  setActiveTabs: React.Dispatch<React.SetStateAction<Record<string, 'query' | 'insight' | 'results'>>>;
  setSelectedMessageForPanel: (m: Message | null) => void;
  setIsInsightPanelOpen: (v: boolean) => void;
  openTabs: DashboardTab[];
  setOpenTabs: React.Dispatch<React.SetStateAction<DashboardTab[]>>;
  setCurrentView: (v: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
};

export function ChatPanel({
  messages, input, setInput, isTyping, userName,
  handleSubmit, handleApproval, handleCopySQL,
  activeTabs, setActiveTabs,
  setSelectedMessageForPanel, setIsInsightPanelOpen,
  openTabs, setOpenTabs, setCurrentView, messagesEndRef,
}: ChatPanelProps) {
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-focus input after sending a message
  React.useEffect(() => {
    if (!isTyping && inputRef.current) {
      inputRef.current.focus();
    }
  }, [messages.length, isTyping]);

  return (
    <div className="flex flex-col h-full w-full relative animate-in fade-in duration-300">

      {/* Empty state */}
      {messages.length === 0 && (
        <div className="h-full flex flex-col justify-center items-center w-full px-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-full max-w-xl space-y-10 mb-16">
            <div className="space-y-3">
              <h2 className="text-lg text-zinc-400 font-medium tracking-tight">Welcome, {userName}</h2>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">What would you like to explore?</h1>
            </div>
            <div className="w-full relative rounded-2xl bg-white border border-zinc-200 focus-within:border-zinc-300 focus-within:shadow-md transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                disabled={isTyping}
                autoFocus
                className="w-full bg-transparent rounded-2xl px-5 py-4 pr-14 text-[15px] text-zinc-900 focus:outline-none border-0 resize-none h-28 font-medium placeholder:text-zinc-400"
                placeholder="Ask a question or create a chart..."
              ></textarea>
              <button onClick={handleSubmit} disabled={isTyping || !input.trim()} className="absolute right-3 bottom-3 w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center disabled:opacity-20 disabled:bg-zinc-200 disabled:text-zinc-400 transition-all hover:bg-zinc-800 cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
              </button>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                { icon: 'bar_chart', label: 'Chart', prompt: 'Generate a chart showing ' },
                { icon: 'table_chart', label: 'Table', prompt: 'Show me a table of ' },
                { icon: 'lightbulb', label: 'Insight', prompt: 'Give me insights about ' },
                { icon: 'analytics', label: 'Analysis', prompt: 'Analyze the trends in ' }
              ].map(action => (
                <button key={action.label} onClick={() => setInput(action.prompt)} className="px-4 py-1.5 rounded-full border border-zinc-200 bg-white text-[12px] font-medium text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 flex items-center gap-1.5 transition-all">
                  <span className="material-symbols-outlined text-[14px]">{action.icon}</span> {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat history area */}
      {messages.length > 0 && (
        <div className="w-full flex-1 overflow-y-auto px-6 md:px-10 lg:px-16 pt-6 pb-28">
          <div className="w-full space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                <MessageBubble
                  msg={msg}
                  activeTabs={activeTabs}
                  setActiveTabs={setActiveTabs}
                  handleApproval={handleApproval}
                  handleCopySQL={handleCopySQL}
                  setSelectedMessageForPanel={setSelectedMessageForPanel}
                  setIsInsightPanelOpen={setIsInsightPanelOpen}
                  openTabs={openTabs}
                  setOpenTabs={setOpenTabs}
                  setCurrentView={setCurrentView}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Fixed input bar at bottom */}
      {messages.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 px-6 md:px-10 lg:px-16 pb-4 pt-4 bg-[var(--surface)] z-20">
          <div className="relative rounded-xl bg-zinc-50 border border-zinc-200 focus-within:border-zinc-400 focus-within:bg-white focus-within:shadow-sm transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              disabled={isTyping}
              className="w-full bg-transparent px-5 py-3 pr-14 text-[14px] font-medium text-zinc-900 focus:outline-none border-0 resize-none h-[48px] placeholder:text-zinc-400 rounded-xl"
              placeholder="Ask a follow-up question..."
            ></textarea>
            <button onClick={handleSubmit} disabled={isTyping || !input.trim()} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center disabled:opacity-20 disabled:bg-zinc-200 disabled:text-zinc-400 transition-all hover:bg-zinc-800">
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
