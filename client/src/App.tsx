import { useState, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { useYjs } from './hooks/useYjs';
import { Header } from './components/Header/Header';
import { CodeEditor } from './components/Editor/CodeEditor';
import { FileExplorer } from './components/FileExplorer/FileExplorer';
import { LobbyPage } from './components/Lobby/LobbyPage';
import { getLanguageLabel } from './utils/languageDetection';
import { FileCode, Activity, Terminal } from 'lucide-react';
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

// ─── IDE View ────────────────────────────────────────────────────────────────
function IDEView({ joinInfo, onLeave }: { joinInfo: JoinInfo; onLeave: () => void }) {
  const [activeFile, setActiveFile] = useState<string>('main.js');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const {
    doc,
    awareness,
    status,
    isSynced,
    users,
    currentUser,
    updateUser,
    roomId,
    setRoomId,
  } = useYjs({
    initialRoomId: joinInfo.roomId,
    initialName: joinInfo.username,
    initialColor: joinInfo.color,
  });

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

  const languageLabel = getLanguageLabel(activeFile);

  return (
    <div className="ide-layout">
      <Header
        roomId={roomId}
        onRoomChange={setRoomId}
        status={status}
        isSynced={isSynced}
        users={users}
        currentUser={currentUser}
        onUpdateUser={updateUser}
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
        {doc && awareness && (
          <FileExplorer
            doc={doc}
            awareness={awareness}
            activeFile={activeFile}
            onFileSelect={handleFileSelect}
            users={users}
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
      </div>

      <footer className="status-bar">
        <div className="status-bar-left">
          <div className="status-item">
            <Terminal size={12} />
            <span>CodeSync Yjs Relay</span>
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
