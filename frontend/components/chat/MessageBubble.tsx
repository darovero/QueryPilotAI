"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { prism } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import type { Message, DashboardTab } from "../types";

type MessageBubbleProps = {
  msg: Message;
  activeTabs: Record<string, 'query' | 'insight' | 'results'>;
  setActiveTabs: React.Dispatch<React.SetStateAction<Record<string, 'query' | 'insight' | 'results'>>>;
  handleApproval: (msg: Message, decision: 'Approved' | 'Rejected', comments?: string) => void;
  handleCopySQL: (sql: string) => void;
  setSelectedMessageForPanel: (m: Message | null) => void;
  setIsInsightPanelOpen: (v: boolean) => void;
  openTabs: DashboardTab[];
  setOpenTabs: React.Dispatch<React.SetStateAction<DashboardTab[]>>;
  setCurrentView: (v: string) => void;
};

export function MessageBubble({
  msg, activeTabs, setActiveTabs, handleApproval, handleCopySQL,
  setSelectedMessageForPanel, setIsInsightPanelOpen,
  openTabs, setOpenTabs, setCurrentView,
}: MessageBubbleProps) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end w-full">
        <div className="bg-zinc-100 rounded-2xl px-5 py-3 text-[14px] text-zinc-900 max-w-[70%] font-medium leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 w-full">
      <div className="mt-0.5 shrink-0">
        <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center">
          <span className="material-symbols-outlined text-[14px] text-white">smart_toy</span>
        </div>
      </div>
      <div className="flex-1 space-y-3 min-w-0">

        {/* Pipeline Stepper (active) */}
        {msg.progressEvents && msg.progressEvents.length > 0 && msg.status === 'Running' && (
          <div className="flex flex-wrap gap-2 mt-1">
            {msg.progressEvents.map((evt, i) => (
              <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${evt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : evt.status === 'Active' ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse' : evt.status === 'Failed' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-zinc-50 text-zinc-500 border border-zinc-200'}`}>
                <span className="material-symbols-outlined text-[12px]">{evt.status === 'Completed' ? 'check_circle' : evt.status === 'Active' ? 'pending' : evt.status === 'Failed' ? 'error' : 'radio_button_unchecked'}</span>
                {evt.label}
              </div>
            ))}
          </div>
        )}

        {/* Completed pipeline summary (collapsed) */}
        {msg.progressEvents && msg.progressEvents.length > 0 && msg.status !== 'Running' && (
          <details className="group">
            <summary className="text-[11px] text-zinc-400 font-medium cursor-pointer hover:text-zinc-600 transition-colors flex items-center gap-1 select-none">
              <span className="material-symbols-outlined text-[14px]">timeline</span>
              {msg.progressEvents.length} pipeline steps
              <span className="material-symbols-outlined text-[12px] group-open:rotate-180 transition-transform">expand_more</span>
            </summary>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {msg.progressEvents.map((evt, i) => (
                <div key={i} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${evt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : evt.status === 'Failed' ? 'bg-red-50 text-red-500' : 'bg-zinc-50 text-zinc-400'}`}>
                  <span className="material-symbols-outlined text-[10px]">{evt.status === 'Completed' ? 'check' : 'close'}</span>
                  {evt.label}
                </div>
              ))}
            </div>
          </details>
        )}

        {msg.content && msg.status !== 'Running' && (
          <div className="text-[14px] text-zinc-700 leading-relaxed font-medium mt-0.5">{msg.content}</div>
        )}

        {msg.status === 'Running' && msg.content && (
          <div className="text-[13px] text-zinc-500 leading-relaxed font-semibold mt-0.5">{msg.content}</div>
        )}

        {/* PendingApproval inline */}
        {msg.status === 'PendingApproval' && (
          <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 mt-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-600">gpp_maybe</span>
              <span className="text-[13px] font-bold text-amber-800">Aprobación requerida</span>
              {msg.riskLevel && (
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">{msg.riskLevel} Risk</span>
              )}
            </div>
            {msg.sql && (
              <div className="bg-white rounded-lg border border-amber-200 p-3 overflow-x-auto">
                <SyntaxHighlighter language="sql" style={prism} customStyle={{ margin: 0, padding: 0, background: 'transparent', fontSize: '12px' }}>
                  {msg.sql.trim()}
                </SyntaxHighlighter>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => handleApproval(msg, 'Approved')} className="px-4 py-2 bg-emerald-600 text-white text-[12px] font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">check_circle</span> Aprobar
              </button>
              <button onClick={() => { const reason = prompt('Razón del rechazo (opcional):'); handleApproval(msg, 'Rejected', reason || ''); }} className="px-4 py-2 bg-white text-red-600 border border-red-200 text-[12px] font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">cancel</span> Rechazar
              </button>
            </div>
          </div>
        )}

        {/* SQL/Insight/Results Tabs */}
        {msg.sql && msg.status !== 'PendingApproval' && (
          <div className="border border-zinc-200/80 rounded-xl overflow-hidden mt-2">
            <div className="flex items-center border-b border-zinc-100 bg-zinc-50/80">
              <div onClick={() => setActiveTabs(prev => ({ ...prev, [msg.id]: 'query' }))} className={`px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold cursor-pointer transition-colors ${activeTabs[msg.id] === 'query' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-700'}`}>Query</div>
              <div onClick={() => setActiveTabs(prev => ({ ...prev, [msg.id]: 'insight' }))} className={`px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold cursor-pointer transition-colors ${!activeTabs[msg.id] || activeTabs[msg.id] === 'insight' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-700'}`}>Insight</div>
              {msg.results && msg.results.length > 0 && (
                <div onClick={() => setActiveTabs(prev => ({ ...prev, [msg.id]: 'results' }))} className={`px-4 py-2.5 text-[11px] uppercase tracking-widest font-bold cursor-pointer transition-colors flex items-center gap-1 ${activeTabs[msg.id] === 'results' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-700'}`}>
                  Results <span className="text-[9px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded-full font-bold">{msg.results.length}</span>
                </div>
              )}
              <button title="Copy SQL" onClick={() => handleCopySQL(msg.sql!)} className="ml-auto text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-md hover:bg-zinc-100">
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
              </button>
              <button
                title={(!activeTabs[msg.id] || activeTabs[msg.id] === 'insight') ? "Open Detailed Report" : "Open in Query Editor"}
                onClick={() => {
                  if (!activeTabs[msg.id] || activeTabs[msg.id] === 'insight') {
                    setSelectedMessageForPanel(msg);
                    setIsInsightPanelOpen(true);
                  } else {
                    const tabId = 'ide-' + msg.id;
                    const exists = openTabs.find(t => t.id === tabId);
                    if (!exists) setOpenTabs(prev => [...prev, { type: 'ide', id: tabId, title: "Query Editor", sql: msg.sql || '' }]);
                    setCurrentView(tabId);
                  }
                }}
                className="mr-3 text-zinc-400 hover:text-zinc-900 transition-colors p-1 rounded-md hover:bg-zinc-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px]">
                  {(!activeTabs[msg.id] || activeTabs[msg.id] === 'insight') ? 'article' : 'open_in_new'}
                </span>
              </button>
            </div>

            {activeTabs[msg.id] === 'query' ? (
              <div className="p-4 overflow-x-auto text-[13px]">
                <SyntaxHighlighter language="sql" style={prism} customStyle={{ margin: 0, padding: 0, background: 'transparent' }}>
                  {msg.sql.trim()}
                </SyntaxHighlighter>
              </div>
            ) : activeTabs[msg.id] === 'results' && msg.results ? (
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto border-t border-zinc-200">
                <table className="w-full text-[13px] font-mono border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#f3f3f3] border-b border-zinc-300">
                      <th className="text-center px-3 py-2 text-zinc-400 font-normal border-r border-zinc-200 w-10">
                        <span className="material-symbols-outlined text-[14px]">grid_on</span>
                      </th>
                      {Object.keys(msg.results[0]).map(col => {
                        const isDate = col.toLowerCase().includes('date') || col.toLowerCase().includes('_ts');
                        const isNum = col.toLowerCase().includes('rate') || col.toLowerCase().includes('total') || col.toLowerCase().includes('count') || col.toLowerCase().includes('factor') || col.toLowerCase().includes('score');
                        return (
                          <th key={col} className="text-left px-4 py-2.5 font-normal text-zinc-700 border-r border-zinc-200 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-blue-500 text-[13px]">{isDate ? '📅' : isNum ? 'eˣ' : '⊞'}</span>
                              <span>{col}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {msg.results.map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-zinc-100 hover:bg-blue-50/40 transition-colors">
                        <td className="text-center px-3 py-2 text-zinc-400 font-normal border-r border-zinc-200 bg-[#f9f9f9] tabular-nums text-[12px]">{rIdx + 1}</td>
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx} className="px-4 py-2 text-zinc-800 border-r border-zinc-100 whitespace-nowrap tabular-nums">
                            {val != null ? String(val) : <span className="text-zinc-300 italic">NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-[14px] text-zinc-700 font-medium leading-relaxed">
                {(() => {
                  if (!msg.insight) return <span className="text-zinc-400 italic">No insight generated yet...</span>;
                  try {
                    const parsed = JSON.parse(msg.insight);
                    const hasChart = parsed.chart && parsed.chart.should_render_chart && parsed.chart.chart_type && parsed.chart.chart_type !== 'none' && parsed.chart.chart_type !== 'table';
                    return (
                      <div className="space-y-4">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-xl font-bold text-slate-800 mb-4" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-lg font-bold text-slate-800 mt-5 mb-3" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-md font-semibold text-slate-800 mt-4 mb-2" {...props} />,
                            p: ({node, ...props}) => <p className="text-[13px] text-slate-600 leading-relaxed mb-3" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 text-[13px] text-slate-600 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-slate-800" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-slate-200 pl-4 italic text-slate-500 my-3" {...props} />
                          }}
                        >{parsed.summary}</ReactMarkdown>
                        {hasChart && msg.results && msg.results.length > 0 && (
                          <div className="mt-4 border border-slate-100 rounded-[24px] p-6 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                            <div className="mb-6">
                              <h4 className="text-[16px] font-semibold text-slate-800">{parsed.chart.title || 'Analysis Chart'}</h4>
                              {parsed.chart.subtitle && <p className="text-[13px] text-slate-500 mt-1">{parsed.chart.subtitle}</p>}
                            </div>
                            <div className="h-[320px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                {parsed.chart.chart_type === 'bar' ? (
                                  <BarChart data={msg.results} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey={parsed.chart.x_axis} tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dx={-10} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px 16px', fontWeight: 500}} />
                                    <Legend wrapperStyle={{fontSize: '13px', paddingTop: '20px'}} iconType="circle" />
                                    <Bar dataKey={parsed.chart.y_axis} radius={[4, 4, 0, 0]} maxBarSize={50} minPointSize={5}>
                                      {msg.results.map((_entry, index) => (<Cell key={`cell-${index}`} fill={['#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b'][index % 9]} />))}
                                    </Bar>
                                  </BarChart>
                                ) : parsed.chart.chart_type === 'horizontal_bar' ? (
                                  <BarChart layout="vertical" data={msg.results} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis type="category" dataKey={parsed.chart.x_axis} tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dx={-10} width={80} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px 16px', fontWeight: 500}} />
                                    <Legend wrapperStyle={{fontSize: '13px', paddingTop: '20px'}} iconType="circle" />
                                    <Bar dataKey={parsed.chart.y_axis} radius={[0, 4, 4, 0]} maxBarSize={30} minPointSize={5}>
                                      {msg.results.map((_entry, index) => (<Cell key={`cell-${index}`} fill={['#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b'][index % 9]} />))}
                                    </Bar>
                                  </BarChart>
                                ) : parsed.chart.chart_type === 'line' ? (
                                  <LineChart data={msg.results} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey={parsed.chart.x_axis} tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} tickLine={false} axisLine={false} dx={-10} />
                                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px 16px', fontWeight: 500}} />
                                    <Legend wrapperStyle={{fontSize: '13px', paddingTop: '20px'}} iconType="circle" />
                                    <Line type="monotone" dataKey={parsed.chart.y_axis} stroke="#6366f1" strokeWidth={4} activeDot={{r: 8, fill: '#6366f1', strokeWidth: 0}} dot={{r: 0}} />
                                  </LineChart>
                                ) : parsed.chart.chart_type === 'pie' || parsed.chart.chart_type === 'donut' ? (
                                  <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                    <Pie data={msg.results} dataKey={parsed.chart.y_axis} nameKey={parsed.chart.x_axis} cx="50%" cy="50%" innerRadius={parsed.chart.chart_type === 'donut' ? 70 : 0} outerRadius={100} paddingAngle={4} stroke="none">
                                      {msg.results.map((_entry, index) => (<Cell key={`cell-${index}`} fill={['#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b'][index % 9]} />))}
                                    </Pie>
                                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '13px', padding: '12px 16px', fontWeight: 500}} />
                                    <Legend wrapperStyle={{fontSize: '13px', paddingTop: '10px'}} iconType="circle" />
                                  </PieChart>
                                ) : (
                                  <div className="flex items-center justify-center h-full text-slate-400 italic text-[13px]">Unsupported chart type: {parsed.chart.chart_type}</div>
                                )}
                              </ResponsiveContainer>
                            </div>
                            {parsed.chart.reason && <p className="text-[12px] text-zinc-400 text-center mt-3 flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-[14px]">lightbulb</span> {parsed.chart.reason}</p>}
                          </div>
                        )}
                      </div>
                    );
                  } catch {
                    return msg.insight;
                  }
                })()}
              </div>
            )}
          </div>
        )}

        {msg.status === 'Running' && (
          <div className="flex gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce"></div>
            <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce delay-75"></div>
            <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce delay-150"></div>
          </div>
        )}

      </div>
    </div>
  );
}
