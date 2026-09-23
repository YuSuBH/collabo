import { useState, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { useYjs } from './useYjs';
import { useCodeExecution, autoDetectEntryFile } from './useCodeExecution';
import { type ChatTab, type YChatMessage } from '../components/Chat/ChatPanel';
import { getLanguageLabel } from '../utils/languageDetection';

const DEFAULT_STARTER_CODE = `// 🚀 Welcome to Collaborative CodeSync!
// Open this same URL in another browser tab to experience real-time sync & remote cursors.

function greetCollaborator(user) {
  return \`👋 Hello \${user.name}, you are currently editing with live CRDT sync!\`;
}

console.log(greetCollaborator({ id: '1', name: 'Collaborator', role: 'editor' }));
`;

export type LeftSidebarTab = 'files' | 'room';

interface JoinInfo {
  roomId: string;
  username: string;
  color: string;
}

export function useIDEState(joinInfo: JoinInfo) {
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

  const {
    run,
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
  } = useCodeExecution({
    doc,
    activeFile,
    currentUser,
  });

  // Derive the currently resolved entry file for display in header
  const resolvedEntry = entryFileOverride ?? autoDetectEntryFile(projectFiles, activeFile);

  // Derive language label for status bar
  const languageLabel = getLanguageLabel(activeFile);

  // ─── Effects ────────────────────────────────────────────────────────────────

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
    return () => chatArray.unobserve(handleChatChange);
  }, [doc, isRightSidebarOpen, rightSidebarTab, currentUser.name]);

  // Seed the files map if empty (client-side fallback in case server didn't seed)
  useEffect(() => {
    if (!doc || !isSynced) return;

    const filesMap = doc.getMap('files');

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

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleFileSelect = useCallback((fileName: string) => {
    setActiveFile(fileName);
  }, []);

  const handleToggleLeftSidebar = useCallback((tab: LeftSidebarTab) => {
    if (isLeftSidebarOpen && leftSidebarTab === tab) {
      setIsLeftSidebarOpen(false);
    } else {
      setIsLeftSidebarOpen(true);
      setLeftSidebarTab(tab);
    }
  }, [isLeftSidebarOpen, leftSidebarTab]);

  const handleToggleRightSidebar = useCallback((tab: ChatTab) => {
    if (isRightSidebarOpen && rightSidebarTab === tab) {
      setIsRightSidebarOpen(false);
    } else {
      setIsRightSidebarOpen(true);
      setRightSidebarTab(tab);
    }
  }, [isRightSidebarOpen, rightSidebarTab]);

  const handleExecuteCode = useCallback(() => {
    setIsOutputPanelOpen(true);
    run(entryFileOverride ?? undefined);
  }, [run, entryFileOverride]);

  const handleRunWithStdin = useCallback((stdin: string) => {
    setIsOutputPanelOpen(true);
    run(entryFileOverride ?? undefined, stdin);
  }, [run, entryFileOverride]);

  const handleToggleOutputPanel = useCallback(() => {
    setIsOutputPanelOpen((prev) => !prev);
  }, []);

  return {
    // Editor state
    activeFile,
    cursorPos,
    setCursorPos,
    languageLabel,

    // Sidebar state
    isLeftSidebarOpen,
    leftSidebarTab,
    setLeftSidebarTab,
    isRightSidebarOpen,
    rightSidebarTab,
    setRightSidebarTab,
    unreadChatCount,

    // Output state
    isOutputPanelOpen,
    setIsOutputPanelOpen,

    // Project files
    projectFiles,
    entryFileOverride,
    setEntryFileOverride,
    resolvedEntry,

    // Yjs
    doc,
    awareness,
    status,
    isSynced,
    users,
    currentUser,
    roomId,

    // Code execution
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

    // Handlers
    handleFileSelect,
    handleToggleLeftSidebar,
    handleToggleRightSidebar,
    handleExecuteCode,
    handleRunWithStdin,
    handleToggleOutputPanel,
  };
}
