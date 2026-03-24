import { useState, useRef, useEffect } from "react";
import { ChatSession, Message, Connection } from "./types";

interface ChatAreaProps {
  activeChatSession: ChatSession | null;
  connections: Connection[];
  isFullView: boolean;
  setIsFullView: React.Dispatch<React.SetStateAction<boolean>>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  addLog: (level: any, msg: string) => void;
  fetchWithAuth: (url: string, options?: any) => Promise<Response>;
  handleApproval: (msg: Message, decision: 'Approved' | 'Rejected', comments?: string) => void;
  handleSubmit: () => void;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isTyping: boolean;
}

export function ChatArea({
  activeChatSession, connections, isFullView, setIsFullView, messagesEndRef,
  addLog, fetchWithAuth, handleApproval, handleSubmit, input, setInput, isTyping
}: ChatAreaProps) {
  const [approvalComments, setApprovalComments] = useState<Record<string, string>>({});

  const activeConnection = connections.find(c => c.id === activeChatSession?.connectionId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatSession?.messages]);

  if (!activeChatSession) return null;

  return (
    <div className={`flex flex-col h-full bg-black transition-all duration-300 ease-in-out relative ${isFullView ? 'opacity-100 flex-1' : 'opacity-100 flex-1 z-10'}`}>
        
        {/* Full View Toggle */}
        <button 
           onClick={() => setIsFullView(!isFullView)}
           className="absolute top-6 left-6 z-50 p-2.5 bg-black border border-zinc-200 rounded-xl hover:bg-black hover:border-zinc-300 shadow-sm text-zinc-500 hover:text-zinc-900 transition-all flex items-center justify-center group hidden md:flex"
           title={isFullView ? "Show Code Space" : "Hide Code Space"}
        >
           <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:scale-110">
              {isFullView ? 'close_fullscreen' : 'fullscreen'}
           </span>
        </button>
        {isFullView && (
           <div className="absolute top-6 left-20 z-50 px-4 py-2.5 bg-zinc-900 text-white rounded-xl shadow-sm text-[13px] font-medium flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300 pointer-events-none">
              <span className="material-symbols-outlined text-[16px] text-zinc-400">info</span>
              Focus Mode Enabled
           </div>
        )}

        <div className={`pt-6 pb-4 border-b border-zinc-100/80 bg-black/80 backdrop-blur-md sticky top-0 z-30 transition-all duration-300 ${isFullView ? 'px-24' : 'px-8 md:px-16 lg:px-24'}`}>
           <div className="flex items-center justify-between mx-auto max-w-4xl">
              <div className="flex flex-col">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
                     <span className="material-symbols-outlined text-[22px] text-zinc-400">forum</span>
                     {activeChatSession.title}
                  </h2>
                  <div className="flex items-center gap-2 text-[12px] font-medium text-zinc-500 mt-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      Connected to {activeConnection ? activeConnection.name : 'Unknown Database'}
                  </div>
              </div>
              <div className="flex gap-2">
                 <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors border border-transparent hover:border-zinc-200" title="Clear Chat">
                    <span className="material-symbols-outlined text-[18px]">mop</span>
                 </button>
                 <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors border border-transparent hover:border-zinc-200" title="Export">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                 </button>
              </div>
           </div>
        </div>

        <div className={`flex-1 overflow-y-auto w-full transition-all duration-300 scroll-smooth ${isFullView ? 'px-24' : 'px-8 md:px-16 lg:px-24'}`}>
          <div className="max-w-4xl mx-auto py-8 space-y-8">
            {activeChatSession.messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-6 pt-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="w-20 h-20 bg-black border border-zinc-100 rounded-3xl flex items-center justify-center shadow-sm">
                     <span className="material-symbols-outlined text-[40px] text-zinc-300">chat_bubble</span>
                  </div>
                  <div className="max-w-sm space-y-2">
                     <h3 className="text-xl font-semibold text-zinc-900 tracking-tight">How can I help you today?</h3>
                     <p className="text-[14px] text-zinc-500 font-medium leading-relaxed">Ask anything about your database {activeConnection?.name}. I can analyze data, write SQL, and create visualizations.</p>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center mt-4">
                     {["Show recent transactions", "Summarize user growth", "Find data anomalies"].map(suggestion => (
                        <button 
                          key={suggestion}
                          onClick={() => { setInput(suggestion); setTimeout(() => handleSubmit(), 100); }}
                          className="px-4 py-2.5 bg-black border border-zinc-200 rounded-xl text-[13px] font-medium text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-black transition-all shadow-sm active:scale-95">
                           {suggestion}
                        </button>
                     ))}
                  </div>
               </div>
            ) : (
                activeChatSession.messages.map((msg, i) => (
                  <div key={msg.id} className={`flex gap-5 w-full animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'flex-row-reverse text-right' : ''}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-zinc-900 text-white' : 'bg-black border border-zinc-200 text-zinc-600'}`}>
                      {msg.role === 'user' ? (
                          <span className="text-[14px] font-bold">U</span>
                      ) : (
                          <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                      )}
                    </div>
                    <div className={`max-w-[75%] space-y-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`text-[12px] font-bold text-zinc-400 uppercase tracking-widest px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            {msg.role === 'user' ? 'You' : 'QueryPilot AI'}
                        </div>
                        {msg.role === 'user' ? (
                            <div className="bg-zinc-900 text-white rounded-2xl rounded-tr-sm px-5 py-3.5 text-[15px] font-medium leading-relaxed shadow-sm">
                                {msg.content}
                            </div>
                        ) : (
                            <div className="bg-black border border-zinc-200 rounded-2xl p-6 text-[14px] text-zinc-800 leading-relaxed shadow-sm space-y-5 relative overflow-hidden group">
                                {msg.status === 'Running' && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 overflow-hidden">
                                        <div className="h-full bg-zinc-900 rounded-full w-1/3 animate-[slide_1.5s_ease-in-out_infinite]"></div>
                                    </div>
                                )}
                                
                                {msg.status === 'PendingApproval' && (
                                   <div className="mb-6 p-5 bg-amber-50 rounded-xl border border-amber-200 space-y-4">
                                       <div className="flex items-start gap-3">
                                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                             <span className="material-symbols-outlined text-[18px] text-amber-600">security</span>
                                          </div>
                                          <div>
                                             <h4 className="text-[14px] font-bold text-amber-900">Action Required: Privacy/Security Review</h4>
                                             <p className="text-[13px] text-amber-800/80 mt-1 font-medium">{msg.content}</p>
                                          </div>
                                       </div>
                                       
                                       <div className="bg-black rounded-lg p-4 border border-amber-100 font-mono text-[12px] text-zinc-800 overflow-auto whitespace-pre-wrap max-h-[200px] shadow-inner font-medium">
                                          {msg.sql}
                                       </div>

                                       <div className="pt-2 space-y-3">
                                          <textarea 
                                             placeholder="Add comments for the audit log (optional)"
                                             value={approvalComments[msg.id] || ''}
                                             onChange={(e) => setApprovalComments(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                             className="w-full bg-black border border-amber-200 rounded-xl px-4 py-3 text-[13px] text-black focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200/50 transition-colors resize-none placeholder:text-amber-300"
                                             rows={2}
                                          />
                                          <div className="flex gap-3">
                                             <button 
                                                onClick={() => handleApproval(msg, 'Approved', approvalComments[msg.id])}
                                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium text-[13px] transition-colors shadow-sm flex justify-center items-center gap-2">
                                                <span className="material-symbols-outlined text-[16px]">check_circle</span> Approve & Execute
                                             </button>
                                             <button 
                                                onClick={() => handleApproval(msg, 'Rejected', approvalComments[msg.id])}
                                                className="flex-1 bg-black hover:bg-black border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl font-medium text-[13px] transition-colors text-center">
                                                Reject Query
                                             </button>
                                          </div>
                                       </div>
                                   </div>
                                )}

                                {(msg.status === 'Completed' || msg.status === 'Failed' || msg.status === 'Rejected') && msg.content && !msg.insight && (
                                     <div className="text-[15px] max-w-none prose prose-zinc prose-p:leading-relaxed prose-pre:bg-black prose-pre:border prose-pre:border-zinc-200 prose-pre:rounded-xl">
                                         {msg.content}
                                     </div>
                                )}
                                
                                {msg.insight && (
                                   <div className="space-y-4">
                                      <div className="text-[15px] font-medium">{msg.insight}</div>
                                      
                                      {msg.results && msg.results.length > 0 && (
                                         <div className="overflow-x-auto border border-zinc-200 rounded-xl bg-black shadow-sm mt-4">
                                            <table className="min-w-full text-left text-[13px] border-collapse">
                                               <thead className="bg-black border-b border-zinc-200 text-zinc-500 uppercase tracking-widest text-[11px] font-bold">
                                                  <tr>
                                                     {Object.keys(msg.results[0]).map(key => (
                                                        <th key={key} className="px-5 py-3 whitespace-nowrap">{key}</th>
                                                     ))}
                                                  </tr>
                                               </thead>
                                               <tbody className="divide-y divide-zinc-100 font-mono">
                                                  {msg.results.slice(0, 10).map((row, idx) => (
                                                     <tr key={idx} className="hover:bg-black transition-colors">
                                                        {Object.values(row).map((val: any, j) => (
                                                           <td key={j} className="px-5 py-3 text-zinc-700 truncate max-w-[200px]">
                                                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                           </td>
                                                        ))}
                                                     </tr>
                                                  ))}
                                               </tbody>
                                            </table>
                                            {msg.results.length > 10 && (
                                               <div className="px-5 py-3 bg-black text-center text-[12px] font-medium text-zinc-500 border-t border-zinc-200">
                                                  Showing 10 of {msg.results.length} rows
                                               </div>
                                            )}
                                         </div>
                                      )}
                                      
                                      {msg.sql && (
                                         <details className="group/code mt-4">
                                            <summary className="cursor-pointer flex items-center gap-2 text-[12px] font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-800 transition-colors select-none">
                                               <span className="material-symbols-outlined text-[16px] transition-transform group-open/code:rotate-90">chevron_right</span>
                                               View Generated SQL
                                            </summary>
                                            <div className="mt-3 p-4 bg-zinc-900 text-zinc-300 rounded-xl font-mono text-[13px] overflow-auto whitespace-pre-wrap shadow-inner leading-relaxed">
                                               {msg.sql}
                                            </div>
                                         </details>
                                      )}
                                   </div>
                                )}
                                
                                {msg.progressEvents && msg.progressEvents.length > 0 && msg.status !== 'PendingApproval' && (
                                   <div className={`mt-6 pt-5 border-t border-zinc-100 flex flex-col gap-3 ${msg.status === 'Completed' || msg.status === 'Failed' ? 'opacity-60' : ''}`}>
                                      <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold flex items-center justify-between">
                                          <span>Agent Progress</span>
                                          <span>{msg.progressEvents[msg.progressEvents.length-1].time}</span>
                                      </div>
                                      <div className="space-y-3">
                                         {msg.progressEvents.map((evt, j) => (
                                            <div key={j} className="flex gap-3 text-[13px] items-start animate-in fade-in slide-in-from-left-2 duration-300">
                                               <div className="flex flex-col items-center mt-0.5">
                                                  <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                  </div>
                                                  {j < msg.progressEvents!.length - 1 && <div className="w-[1px] h-6 bg-emerald-100 my-1"></div>}
                                               </div>
                                               <div className="flex flex-col">
                                                  <span className="font-semibold text-zinc-900">{evt.label}</span>
                                                  <span className="text-zinc-500 text-[12px]">{evt.status}</span>
                                               </div>
                                            </div>
                                         ))}
                                      </div>
                                   </div>
                                )}
                            </div>
                        )}
                    </div>
                  </div>
                ))
            )}
            <div ref={messagesEndRef} className="h-4 w-full" />
          </div>
        </div>

        <div className={`p-6 bg-black/80 backdrop-blur-md border-t border-zinc-100/80 sticky bottom-0 z-30 transition-all duration-300 ${isFullView ? 'px-24' : 'px-8 md:px-16 lg:px-24'}`}>
          <div className="max-w-4xl mx-auto relative group">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                disabled={isTyping}
                placeholder="Message QueryPilot..."
                className="w-full bg-black border border-zinc-200 rounded-2xl pl-5 pr-14 py-4 text-[15px] font-medium text-black focus:outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all resize-none shadow-sm disabled:bg-black disabled:text-zinc-400 disabled:cursor-not-allowed placeholder:text-zinc-400 min-h-[56px] max-h-[200px]"
                rows={1}
                style={{ height: 'auto' }}
              />
              <button 
                 onClick={handleSubmit} 
                 disabled={!input.trim() || isTyping}
                 className="absolute right-2 top-2 p-2.5 rounded-xl bg-zinc-900 text-white disabled:bg-zinc-100 disabled:text-zinc-400 transition-all active:scale-95 disabled:active:scale-100 shadow-sm flex items-center justify-center">
                {isTyping ? (
                   <div className="w-[18px] h-[18px] border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
                ) : (
                   <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                )}
              </button>
              <div className="absolute -bottom-5 left-0 w-full text-center text-[11px] text-zinc-400 font-medium">
                  QueryPilot can make mistakes. Consider verifying important information.
              </div>
          </div>
        </div>
    </div>
  );
}
