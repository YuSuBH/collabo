import { useState, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { useYjs } from './hooks/useYjs';
import { useCodeExecution, autoDetectEntryFile } from './hooks/useCodeExecution';
import { Header } from './components/Header/Header';
import { CodeEditor } from './components/Editor/CodeEditor';
import { FileExplorer } from './components/FileExplorer/FileExplorer';
import { RoomInfo } from './components/Sidebar/RoomInfo';
import { ChatPanel, type ChatTab, type YChatMessage } from './components/Chat/ChatPanel';
import { LobbyPage } from './components/Lobby/LobbyPage';
import { OutputPanel } from './components/Output/OutputPanel';
import { getLanguageLabel } from './utils/languageDetection';
import { FileCode, Activity, Terminal, FolderTree, Users } from 'lucide-react';
import './index.css';

const DEFAULT_STARTER_CODE = `// 🚀 Welcome to Collaborative CodeSync!
// Open this same URL in another browser tab to experience real-time sync & remote cursors.

interface User {
  id: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

function greetCollaborator(user: User): string {
  return \`👋 Hello \${user.name}, you are currently editing with live CRDT sync!\`;
}

console.log(greetCollaborator({ id: '1', name: 'Collaborator', role: 'editor' }));
`;

interface JoinInfo {
  roomId: string;
  username: string;
  color: string;
}

type LeftSidebarTab = 'files' | 'room';

// ─── IDE View ────────────────────────────────────────────────────────────────
function IDEView({ joinInfo, onLeave }: { joinInfo: JoinInfo; onLeave: () => void }) {
  const [activeFile, setActiveFile] = useState<string>('main.js');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Sidebar visibility and active tabs
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(true);
  const [leftSidebarTab, setLeftSidebarTab] = useState<LeftSidebarTab>('files');
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(false);
  const [rightSidebarTab, setRightSidebarTab] = useState<ChatTab>('group');
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Output panel state
  const [isOutputPanelOpen, setIsOutputPanelOpen] = useState<boolean>(false);

  // Project files list (synced from Yjs for the run config popover)
  const [projectFiles, setProjectFiles] = useState<string[]>([]);

  // User-selected entry file (overrides auto-detect when set)
  const [entryFileOverride, setEntryFileOverride] = useState<string | null>(null);

  const {
    doc,
    awareness,
    status,
    isSynced,
    users,
    currentUser,
    updateUser: _updateUser,
    roomId,
    setRoomId: _setRoomId,
  } = useYjs({
    initialRoomId: joinInfo.roomId,
    initialName: joinInfo.username,
    initialColor: joinInfo.color,
  });

  // Code execution hook
  const { run, isRunning, result, error, clearResult } = useCodeExecution({
    doc,
    activeFile,
  });

  // Derive the currently resolved entry file for display in header
  const resolvedEntry = entryFileOverride ?? autoDetectEntryFile(projectFiles, activeFile);

  // Clear unread count when group chat drawer is opened
  useEffect(() => {
    if (isRightSidebarOpen && rightSidebarTab === 'group') {
      setUnreadChatCount(0);
    }
  }, [isRightSidebarOpen, rightSidebarTab]);

  // Track unread messages from Y.Array 'chat-messages'
  useEffect(() => {
    if (!doc) return;

    const chatArray = doc.getArray<YChatMessage>('chat-messages');

    const handleChatChange = (event: Y.YArrayEvent<YChatMessage>) => {
      const isGroupChatActive = isRightSidebarOpen && rightSidebarTab === 'group';
      if (isGroupChatActive) {
        setUnreadChatCount(0);
        return;
      }

      // Count new messages inserted that were not sent by current client
      let newIncomingCount = 0;
      event.changes.added.forEach((item) => {
        item.content.getContent().forEach((msg: YChatMessage) => {
          if (msg && msg.senderId !== doc.clientID && msg.senderName !== currentUser.name) {
            newIncomingCount += 1;
          }
        });
      });

      if (newIncomingCount > 0) {
        setUnreadChatCount((prev) => prev + newIncomingCount);
      }
    };

    chatArray.observe(handleChatChange);

    return () => {
      chatArray.unobserve(handleChatChange);
    };
  }, [doc, isRightSidebarOpen, rightSidebarTab, currentUser.name]);

  // Seed the files map if empty (client-side fallback in case server didn't seed)
  useEffect(() => {
    if (!doc || !isSynced) return;

    const filesMap = doc.getMap('files');

    // Seed default file if the map is empty
    if (filesMap.size === 0) {
      doc.transact(() => {
        const mainFile = new Y.Text();
        mainFile.insert(0, DEFAULT_STARTER_CODE);
        filesMap.set('main.js', mainFile);
      });
    }

    // Set activeFile to the first file in the map
    const fileNames = Array.from(filesMap.keys()).sort();
    if (fileNames.length > 0 && !filesMap.has(activeFile)) {
      setActiveFile(fileNames[0]);
    }
  }, [doc, isSynced]);

  // Keep projectFiles in sync with Yjs filesMap
  useEffect(() => {
    if (!doc) return;
    const filesMap = doc.getMap<Y.Text>('files');
    const sync = () => {
      const names = Array.from(filesMap.keys()).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );
      setProjectFiles(names);
    };
    sync();
    filesMap.observe(sync);
    return () => filesMap.unobserve(sync);
  }, [doc]);

  // Publish active file to awareness so peers can see what we're editing
  useEffect(() => {
    if (awareness && activeFile) {
      awareness.setLocalStateField('activeFile', activeFile);
    }
  }, [awareness, activeFile]);

  // Stable file select handler
  const handleFileSelect = useCallback((fileName: string) => {
    setActiveFile(fileName);
  }, []);

  // Left sidebar toggling
  const handleToggleLeftSidebar = useCallback((tab: LeftSidebarTab) => {
    if (isLeftSidebarOpen && leftSidebarTab === tab) {
      setIsLeftSidebarOpen(false);
    } else {
      setIsLeftSidebarOpen(true);
      setLeftSidebarTab(tab);
    }
  }, [isLeftSidebarOpen, leftSidebarTab]);

  // Right sidebar toggling
  const handleToggleRightSidebar = useCallback((tab: ChatTab) => {
    if (isRightSidebarOpen && rightSidebarTab === tab) {
      setIsRightSidebarOpen(false);
    } else {
      setIsRightSidebarOpen(true);
      setRightSidebarTab(tab);
    }
  }, [isRightSidebarOpen, rightSidebarTab]);

  // Execute code: open output panel and run
  const handleExecuteCode = useCallback(() => {
    setIsOutputPanelOpen(true);
    run(entryFileOverride ?? undefined);
  }, [run, entryFileOverride]);

  // Run with custom stdin
  const handleRunWithStdin = useCallback((stdin: string) => {
    setIsOutputPanelOpen(true);
    run(entryFileOverride ?? undefined, stdin);
  }, [run, entryFileOverride]);

  const languageLabel = getLanguageLabel(activeFile);

  return (
    <div className="ide-layout">
      {/* Icon-only Clean Header */}
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

      <div className="tab-bar">
        <div className="tab-item active-tab">
          <FileCode size={14} className="tab-icon" />
          <span className="tab-title">{activeFile}</span>
          <span className="tab-sync-dot" title="Yjs CRDT Active" />
        </div>
        <div className="tab-actions">
          <span className="tab-hint">
            <Activity size={13} />
            {users.length} collaborator{users.length !== 1 ? 's' : ''} in room
          </span>
        </div>
      </div>

      <div className="editor-main">
        {/* Left Sidebar with Switchable Views */}
        {isLeftSidebarOpen && (
          <div className="sidebar-container left-sidebar">
            <div className="sidebar-tab-switcher">
              <button
                className={`sidebar-tab-btn ${leftSidebarTab === 'files' ? 'sidebar-tab-btn-active' : ''}`}
                onClick={() => setLeftSidebarTab('files')}
                title="File Explorer"
              >
                <FolderTree size={14} />
                <span>Files</span>
              </button>
              <button
                className={`sidebar-tab-btn ${leftSidebarTab === 'room' ? 'sidebar-tab-btn-active' : ''}`}
                onClick={() => setLeftSidebarTab('room')}
                title="Room & Members"
              >
                <Users size={14} />
                <span>Room</span>
              </button>
            </div>

            <div className="sidebar-content-view">
              {leftSidebarTab === 'files' && doc && awareness && (
                <FileExplorer
                  doc={doc}
                  awareness={awareness}
                  activeFile={activeFile}
                  onFileSelect={handleFileSelect}
                  users={users}
                />
              )}

              {leftSidebarTab === 'room' && (
                <RoomInfo
                  roomId={roomId}
                  users={users}
                  currentUser={currentUser}
                />
              )}
            </div>
          </div>
        )}

        {/* Center Code Editor */}
        <div className="editor-panel">
          <CodeEditor
            doc={doc}
            awareness={awareness}
            activeFile={activeFile}
            onCursorChange={(line, col) => setCursorPos({ line, col })}
          />
        </div>

        {/* Right Collapsible Chat Panel (Group & AI Chat) */}
        {isRightSidebarOpen && (
          <ChatPanel
            doc={doc}
            activeTab={rightSidebarTab}
            onTabChange={setRightSidebarTab}
            onClose={() => setIsRightSidebarOpen(false)}
            users={users}
            currentUser={currentUser}
            activeFile={activeFile}
          />
        )}
      </div>

      {/* Output Panel — slides up from bottom */}
      {isOutputPanelOpen && (
        <OutputPanel
          isRunning={isRunning}
          result={result}
          error={error}
          onClear={clearResult}
          onClose={() => setIsOutputPanelOpen(false)}
          onRunWithStdin={handleRunWithStdin}
        />
      )}

      <footer className="status-bar">
        <div className="status-bar-left">
          <div className="status-item">
            <Terminal size={12} />
            <span>CodeSync Relay</span>
          </div>
          <div className="status-item">
            <span>Room: {roomId}</span>
          </div>
        </div>

        <div className="status-bar-right">
          <div className="status-item">
            <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          </div>
          <div className="status-item">
            <span>Spaces: 2</span>
          </div>
          <div className="status-item">
            <span>UTF-8</span>
          </div>
          <div className="status-item highlight-item">
            <span>{languageLabel}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function App() {
  const [joinInfo, setJoinInfo] = useState<JoinInfo | null>(null);

  const handleJoin = (roomId: string, username: string, color: string) => {
    // Reflect the room in the URL so the link is shareable
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
