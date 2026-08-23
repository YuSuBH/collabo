import { useState } from 'react';
import { useYjs } from './hooks/useYjs';
import { Header } from './components/Header/Header';
import { CodeEditor } from './components/Editor/CodeEditor';
import { FileCode, Activity, Terminal } from 'lucide-react';
import './index.css';

const EXTENSION_MAP: Record<string, string> = {
  typescript: '.ts',
  javascript: '.js',
  python: '.py',
  cpp: '.cpp',
  html: '.html',
  css: '.css',
  json: '.json',
  markdown: '.md',
};

function App() {
  const [language, setLanguage] = useState('typescript');
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
  } = useYjs();

  const activeFileName = `main${EXTENSION_MAP[language] || '.txt'}`;

  return (
    <div className="ide-layout">
      {/* Top Header */}
      <Header
        roomId={roomId}
        onRoomChange={setRoomId}
        status={status}
        isSynced={isSynced}
        users={users}
        currentUser={currentUser}
        onUpdateUser={updateUser}
        language={language}
        onLanguageChange={setLanguage}
      />

      {/* Editor Sub-header / File Tab */}
      <div className="tab-bar">
        <div className="tab-item active-tab">
          <FileCode size={14} className="tab-icon" />
          <span className="tab-title">{activeFileName}</span>
          <span className="tab-sync-dot" title="Yjs CRDT Active" />
        </div>
        <div className="tab-actions">
          <span className="tab-hint">
            <Activity size={13} />
            {users.length} collaborator{users.length !== 1 ? 's' : ''} in room
          </span>
        </div>
      </div>

      {/* Main Monaco Editor Area */}
      <main className="editor-main">
        <CodeEditor
          doc={doc}
          awareness={awareness}
          language={language}
          onCursorChange={(line, col) => setCursorPos({ line, col })}
        />
      </main>

      {/* Bottom Status Bar */}
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
            <span>{language.toUpperCase()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
