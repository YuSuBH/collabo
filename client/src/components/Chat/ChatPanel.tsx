import React, { useState } from 'react';
import * as Y from 'yjs';
import type { Collaborator, UserPresence } from '../../utils/collaborators';
import {
  type ChatTab,
  type YChatMessage,
  sendYChatMessage,
} from '../../utils/chatUtils';
import { useChatResize } from '../../hooks/useChatResize';
import { useAIStream } from '../../hooks/useAIStream';
import { useApplyCode } from '../../hooks/useApplyCode';
import { ChatHeader } from './ChatHeader';
import { GroupChatTab } from './GroupChatTab';
import { AIChatTab } from './AIChatTab';

// Re-export types for backward compatibility
export type { ChatTab, YChatMessage };

interface ChatPanelProps {
  doc: Y.Doc | null;
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
  onClose: () => void;
  users: Collaborator[];
  currentUser: UserPresence;
  activeFile: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  doc,
  activeTab,
  onTabChange,
  onClose,
  users: _users,
  currentUser,
  activeFile,
}) => {
  const { panelWidth, isResizing, handleResizeStart, handleResetWidth } = useChatResize();
  const [includeProjectContext, setIncludeProjectContext] = useState(false);

  const { aiMessages, isStreaming, sendMessage, stopStreaming, clearHistory } = useAIStream({
    doc,
    activeFile,
    currentUser,
    includeProjectContext,
  });

  const {
    applyCode: handleApplyCodeToEditor,
    notification: aiNotification,
    showNotification,
  } = useApplyCode({
    doc,
    activeFile,
  });

  const handleShareToGroup = (messageText: string) => {
    if (!doc) return;
    sendYChatMessage(doc, {
      senderId: doc.clientID,
      senderName: `${currentUser.name} 🤖 [Shared from AI]`,
      senderColor: currentUser.color,
      text: messageText,
    });
    showNotification('✓ Shared to Group Chat');
  };

  return (
    <aside
      className={`chat-panel ${isResizing ? 'is-resizing' : ''}`}
      style={{ width: `${panelWidth}px` }}
    >
      {/* Resizer Handle */}
      <div
        className={`chat-resize-handle ${isResizing ? 'active' : ''}`}
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
        onDoubleClick={handleResetWidth}
        title="Drag to resize chat panel (Double-click to reset)"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize Chat Panel"
      >
        <div className="chat-resize-line" />
      </div>

      {/* Tab Switcher & Action Header */}
      <ChatHeader
        activeTab={activeTab}
        onTabChange={onTabChange}
        onClose={onClose}
        onClearHistory={clearHistory}
      />

      {/* Group Chat Body */}
      {activeTab === 'group' && (
        <GroupChatTab
          doc={doc}
          currentUser={currentUser}
          activeFile={activeFile}
          panelWidth={panelWidth}
          onApplyCode={handleApplyCodeToEditor}
        />
      )}

      {/* AI Chat Body */}
      {activeTab === 'ai' && (
        <AIChatTab
          currentUser={currentUser}
          activeFile={activeFile}
          panelWidth={panelWidth}
          includeProjectContext={includeProjectContext}
          onToggleProjectContext={setIncludeProjectContext}
          aiNotification={aiNotification}
          aiMessages={aiMessages}
          isStreaming={isStreaming}
          onSendMessage={sendMessage}
          onStopStreaming={stopStreaming}
          onApplyCode={handleApplyCodeToEditor}
          onShareToGroup={handleShareToGroup}
        />
      )}
    </aside>
  );
};
