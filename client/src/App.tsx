import { useState } from 'react';
import { useIDEState } from './hooks/useIDEState';
import { Header } from './components/Header/Header';
import { CodeEditor } from './components/Editor/CodeEditor';
import { ChatPanel } from './components/Chat/ChatPanel';
import { LobbyPage } from './components/Lobby/LobbyPage';
import { OutputPanel } from './components/Output/OutputPanel';
import { TabBar } from './components/IDE/TabBar';
import { LeftSidebar } from './components/IDE/LeftSidebar';
import { StatusBar } from './components/IDE/StatusBar';
import './index.css';

interface JoinInfo {
  roomId: string;
  username: string;
  color: string;
}

// ─── IDE View ────────────────────────────────────────────────────────────────
function IDEView({ joinInfo, onLeave }: { joinInfo: JoinInfo; onLeave: () => void }) {
  const {
    activeFile,
    cursorPos,
    setCursorPos,
    languageLabel,
    isLeftSidebarOpen,
    leftSidebarTab,
    setLeftSidebarTab,
    isRightSidebarOpen,
    rightSidebarTab,
    setRightSidebarTab,
    unreadChatCount,
    isOutputPanelOpen,
    setIsOutputPanelOpen,
    projectFiles,
    setEntryFileOverride,
    resolvedEntry,
    doc,
    awareness,
    status,
    isSynced,
    users,
    currentUser,
    roomId,
    isRunning,
    result,
    error,
    clearResult,
    sharedRuns,
    selectedRunId,
    selectRun,
    displayedRun,
    latestPeerRun,
    clearPeerNotification,
    handleFileSelect,
    handleToggleLeftSidebar,
    handleToggleRightSidebar,
    handleExecuteCode,
    handleRunWithStdin,
    handleToggleOutputPanel,
  } = useIDEState(joinInfo);

  return (
    <div className="ide-layout">
      <Header
        roomId={roomId}
        status={status}
        isSynced={isSynced}
        users={users}
        unreadChatCount={unreadChatCount}
        isLeftSidebarOpen={isLeftSidebarOpen}
        leftSidebarTab={leftSidebarTab}
        onToggleLeftSidebar={handleToggleLeftSidebar}
        isRightSidebarOpen={isRightSidebarOpen}
        rightSidebarTab={rightSidebarTab}
        onToggleRightSidebar={handleToggleRightSidebar}
        onExecute={handleExecuteCode}
        isRunning={isRunning}
        projectFiles={projectFiles}
        entryFile={resolvedEntry}
        onEntryFileChange={setEntryFileOverride}
        onLeaveRoom={onLeave}
      />

      <TabBar activeFile={activeFile} userCount={users.length} />

      <div className="editor-main">
        {isLeftSidebarOpen && (
          <LeftSidebar
            leftSidebarTab={leftSidebarTab}
            onTabChange={setLeftSidebarTab}
            doc={doc}
            awareness={awareness}
            activeFile={activeFile}
            onFileSelect={handleFileSelect}
            users={users}
            roomId={roomId}
            currentUser={currentUser}
          />
        )}

        <div className="editor-panel">
          <CodeEditor
            doc={doc}
            awareness={awareness}
            activeFile={activeFile}
            onCursorChange={(line, col) => setCursorPos({ line, col })}
          />
        </div>

        {isRightSidebarOpen && (
          <ChatPanel
            doc={doc}
            activeTab={rightSidebarTab}
            onTabChange={setRightSidebarTab}
            onClose={() => handleToggleRightSidebar(rightSidebarTab)}
            users={users}
            currentUser={currentUser}
            activeFile={activeFile}
          />
        )}
      </div>

      {isOutputPanelOpen && (
        <OutputPanel
          isRunning={isRunning}
          result={result}
          error={error}
          onClear={clearResult}
          onClose={() => setIsOutputPanelOpen(false)}
          onRunWithStdin={handleRunWithStdin}
          sharedRuns={sharedRuns}
          selectedRunId={selectedRunId}
          onSelectRun={selectRun}
          displayedRun={displayedRun}
          latestPeerRun={latestPeerRun}
          onClearPeerNotification={clearPeerNotification}
          currentUserName={currentUser.name}
          currentClientId={doc?.clientID}
        />
      )}

      <StatusBar
        isOutputPanelOpen={isOutputPanelOpen}
        onToggleOutput={handleToggleOutputPanel}
        isRunning={isRunning}
        status={status}
        roomId={roomId}
        cursorPos={cursorPos}
        languageLabel={languageLabel}
      />
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function App() {
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);

  const handleJoin = (roomId: string, username: string, color: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url.toString());
    setJoinInfo({ roomId, username, color });
  };

  const handleLeave = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url.toString());
    setJoinInfo(null);
  };

  if (!joinInfo) {
    return <LobbyPage onJoin={handleJoin} />;
  }

  return <IDEView joinInfo={joinInfo} onLeave={handleLeave} />;
}

export default App;
