"use client";

import { OnboardingFlow } from "./OnboardingFlow";
import { useChatEngine } from "./hooks/useChatEngine";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { WelcomeView } from "./views/WelcomeView";
import { IntegrationsView } from "./views/IntegrationsView";
import { ConnectionForm } from "./views/ConnectionForm";
import { ManageConnections } from "./views/ManageConnections";
import { SettingsView } from "./views/SettingsView";
import { HistoryView } from "./views/HistoryView";
import { ChatPanel } from "./chat/ChatPanel";
import { InsightPanel } from "./chat/InsightPanel";
import { IdeEditor } from "./IdeEditor";
import "./UnifiedChat.css";

export function UnifiedChat() {
  const engine = useChatEngine();

  return (
    <>
      {/* Loading spinner */}
      {engine.userId && engine.isLoadingOrg && (
        <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center animate-out fade-out duration-1000 fill-mode-forwards">
          <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 shadow-2xl animate-pulse">
            <span className="material-symbols-outlined text-white text-[32px] animate-spin" style={{ animationDuration: '3s' }}>hourglass_empty</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight animate-pulse">InsightForge AI</h2>
          <p className="text-[14px] text-zinc-500 mt-2">Securing your workspace...</p>
        </div>
      )}

      {/* Onboarding flow */}
      {engine.userId && !engine.isLoadingOrg && (!engine.organization || engine.isAddingWorkspace) && (
        <div className="relative w-full h-full">
          {engine.isAddingWorkspace && engine.organizations.length > 0 && (
            <button
              onClick={() => engine.setIsAddingWorkspace(false)}
              className="absolute top-6 right-6 z-[120] text-zinc-500 hover:text-zinc-900 bg-white shadow-sm border border-zinc-200 rounded-full w-10 h-10 flex items-center justify-center transition-colors"
              title="Cancel"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
          <OnboardingFlow userName={engine.userName} onComplete={engine.handleOnboardingComplete} />
        </div>
      )}

      {/* Main layout */}
      <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)] font-sans antialiased selection:bg-zinc-900 selection:text-white">

        {/* Sidebar */}
        <Sidebar
          isSidebarOpen={engine.isSidebarOpen}
          organization={engine.organization}
          userName={engine.userName}
          currentView={engine.currentView}
          setCurrentView={engine.setCurrentView}
          connections={engine.connections}
          chatSessions={engine.chatSessions}
          openTabs={engine.openTabs}
          setOpenTabs={engine.setOpenTabs}
          expandedConns={engine.expandedConns}
          setExpandedConns={engine.setExpandedConns}
          setConnections={engine.setConnections}
          setChatSessions={engine.setChatSessions}
          setEditingConnId={engine.setEditingConnId}
          setConnForm={engine.setConnForm}
          setHistoryData={engine.setHistoryData}
          openChat={engine.openChat}
          addLog={engine.addLog}
          fetchWithAuth={engine.fetchWithAuth}
          userId={engine.userId}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">

          {/* Top Bar */}
          <TopBar
            currentView={engine.currentView}
            setCurrentView={engine.setCurrentView}
            openTabs={engine.openTabs}
            setOpenTabs={engine.setOpenTabs}
            isSidebarOpen={engine.isSidebarOpen}
            setIsSidebarOpen={engine.setIsSidebarOpen}
            editingConnId={engine.editingConnId}
            userName={engine.userName}
            userEmail={engine.userEmail}
            userInitial={engine.userInitial}
            isProfileMenuOpen={engine.isProfileMenuOpen}
            setIsProfileMenuOpen={engine.setIsProfileMenuOpen}
            handleLogout={engine.handleLogout}
          />

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto relative">
            {engine.currentView === 'welcome' && (
              <WelcomeView userName={engine.userName} setCurrentView={engine.setCurrentView} />
            )}

            {engine.currentView === 'integrations' && (
              <IntegrationsView
                setCurrentView={engine.setCurrentView}
                setEditingConnId={engine.setEditingConnId}
                setConnForm={engine.setConnForm}
              />
            )}

            {(engine.currentView === 'connect_azuresql' || engine.currentView === 'connect_postgres') && (
              <ConnectionForm
                connForm={engine.connForm}
                setConnForm={engine.setConnForm}
                connError={engine.connError}
                isTestingConnection={engine.isTestingConnection}
                testSuccess={engine.testSuccess}
                editingConnId={engine.editingConnId}
                handleSaveConnection={engine.handleSaveConnection}
                handleMsalLogin={engine.handleMsalLogin}
                setCurrentView={engine.setCurrentView}
              />
            )}

            {engine.currentView === 'manage_connections' && (
              <ManageConnections
                connections={engine.connections}
                setConnections={engine.setConnections}
                setCurrentView={engine.setCurrentView}
                setChatSessions={engine.setChatSessions}
                setOpenTabs={engine.setOpenTabs}
                setExpandedConns={engine.setExpandedConns}
                setEditingConnId={engine.setEditingConnId}
                setConnForm={engine.setConnForm}
                currentView={engine.currentView}
                addLog={engine.addLog}
                fetchWithAuth={engine.fetchWithAuth}
              />
            )}

            {engine.currentView === 'settings' && (
              <SettingsView
                userName={engine.userName}
                userEmail={engine.userEmail}
                userInitial={engine.userInitial}
                organization={engine.organization}
                organizations={engine.organizations}
                setOrganization={engine.setOrganization}
                setIsAddingWorkspace={engine.setIsAddingWorkspace}
                handleLogout={engine.handleLogout}
                handleDeleteWorkspace={engine.handleDeleteWorkspace}
                handleDeleteAccount={engine.handleDeleteAccount}
              />
            )}

            {engine.currentView === 'history' && (
              <HistoryView
                historyData={engine.historyData}
                connections={engine.connections}
                chatSessions={engine.chatSessions}
                setChatSessions={engine.setChatSessions}
                openChat={engine.openChat}
              />
            )}

            {/* Chat view */}
            {engine.openTabs.find(t => t.id === engine.currentView && t.type === 'chat') && (
              <ChatPanel
                messages={engine.messages}
                input={engine.input}
                setInput={engine.setInput}
                isTyping={engine.isTyping}
                userName={engine.userName}
                handleSubmit={engine.handleSubmit}
                handleApproval={engine.handleApproval}
                handleCopySQL={engine.handleCopySQL}
                activeTabs={engine.activeTabs}
                setActiveTabs={engine.setActiveTabs}
                setSelectedMessageForPanel={engine.setSelectedMessageForPanel}
                setIsInsightPanelOpen={engine.setIsInsightPanelOpen}
                openTabs={engine.openTabs}
                setOpenTabs={engine.setOpenTabs}
                setCurrentView={engine.setCurrentView}
                messagesEndRef={engine.messagesEndRef}
              />
            )}

            {/* IDE Editor view */}
            {engine.openTabs.find(t => t.id === engine.currentView && t.type === 'ide') && (() => {
              const activeTab = engine.openTabs.find(t => t.id === engine.currentView)!;
              return <IdeEditor activeTab={activeTab} setOpenTabs={engine.setOpenTabs} />;
            })()}
          </div>

        </main>

      </div>

      {/* Insight Panel overlay */}
      <InsightPanel
        isOpen={engine.isInsightPanelOpen}
        selectedMessage={engine.selectedMessageForPanel}
        onClose={() => engine.setIsInsightPanelOpen(false)}
      />
    </>
  );
}
