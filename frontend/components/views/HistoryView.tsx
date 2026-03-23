"use client";

import type { Connection, ChatSession, HistorySession } from "../types";

type HistoryViewProps = {
  historyData: HistorySession[];
  connections: Connection[];
  chatSessions: ChatSession[];
  setChatSessions: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  openChat: (chatId: string) => void;
};

export function HistoryView({ historyData, connections, chatSessions, setChatSessions, openChat }: HistoryViewProps) {
  return (
    <div className="flex bg-white h-full text-zinc-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Chat History</h1>
          <p className="text-[14px] text-zinc-500 mt-2">Your previous conversations and query sessions.</p>
        </div>

        {historyData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <span className="material-symbols-outlined text-[48px] mb-3">history</span>
            <p className="text-[14px] font-medium">No sessions yet</p>
            <p className="text-[12px] mt-1">Start a conversation to see your history here.</p>
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-zinc-200 bg-zinc-50 text-[12px] font-semibold text-zinc-500 uppercase tracking-widest">
              <div className="col-span-4">Session</div>
              <div className="col-span-3">Connection</div>
              <div className="col-span-2">Created</div>
              <div className="col-span-2">Last Activity</div>
              <div className="col-span-1 text-right">Action</div>
            </div>
            <div className="divide-y divide-zinc-100">
              {historyData.map((session) => {
                const conn = connections.find(c => c.id === session.connectionId);
                return (
                  <div key={session.id} className="grid grid-cols-12 gap-4 p-4 items-center text-[14px] hover:bg-zinc-50/50 transition-colors text-zinc-700">
                    <div className="col-span-4 font-medium text-zinc-900 truncate flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px] text-zinc-600">chat_bubble</span>
                      </div>
                      {session.title || 'Untitled Chat'}
                    </div>
                    <div className="col-span-3 truncate text-zinc-500 flex items-center gap-2">
                      {conn ? (
                        <>
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            {conn.type === 'Azure SQL' && <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-4 h-4 object-contain" alt="Azure" />}
                            {conn.type === 'PostgreSQL' && <img src="/assets/iconos sql/DeviconPostgresqlWordmark.svg" className="w-4 h-4 object-contain" alt="Postgres" />}
                            {(!conn.type || !['Azure SQL', 'PostgreSQL'].includes(conn.type)) && <span className="material-symbols-outlined text-[14px]">database</span>}
                          </div>
                          <span className="truncate">{conn.name}</span>
                        </>
                      ) : (
                        <span className="text-zinc-400 italic">Disconnected</span>
                      )}
                    </div>
                    <div className="col-span-2 text-zinc-400 text-[12px]">
                      {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : '-'}
                    </div>
                    <div className="col-span-2 text-zinc-400 text-[12px]">
                      {session.lastActivity ? new Date(session.lastActivity).toLocaleString() : '-'}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => {
                          const existingSession = chatSessions.find(s => s.id === session.id);
                          if (!existingSession) {
                            setChatSessions(prev => [...prev, { id: session.id, connectionId: session.connectionId || '', title: session.title || 'Chat', messages: [] }]);
                          }
                          openChat(session.id);
                        }}
                        className="w-8 h-8 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 flex items-center justify-center transition-colors"
                        title="Open Chat"
                      ><span className="material-symbols-outlined text-[16px]">open_in_new</span></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
