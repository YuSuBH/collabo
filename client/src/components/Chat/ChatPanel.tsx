import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  FileCode,
  Layers,
  Square,
  Trash2,
} from 'lucide-react';
import type { Collaborator, UserPresence } from '../../utils/collaborators';
import {
  type ChatTab,
  type YChatMessage,
  sendYChatMessage,
} from '../../utils/chatUtils';
import { ChatMessageItem } from './ChatMessageItem';
import { useChatResize } from '../../hooks/useChatResize';
import { useAIStream } from '../../hooks/useAIStream';

// Re-export types for backward compatibility with App.tsx
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

  // ── Group chat ──────────────────────────────────────────────────────────────
  const [groupInput, setGroupInput] = useState('');
  const [groupMessages, setGroupMessages] = useState<YChatMessage[]>([]);
  const groupEndRef = useRef<HTMLDivElement>(null);
  const aiEndRef = useRef<HTMLDivElement>(null);

  // ── AI input & context ──────────────────────────────────────────────────────
  const [aiInput, setAiInput] = useState('');
  const [includeProjectContext, setIncludeProjectContext] = useState(false);
  const [aiNotification, setAiNotification] = useState<string | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { aiMessages, isStreaming, sendMessage, stopStreaming, clearHistory } = useAIStream({
    doc,
    activeFile,
    currentUser,
    includeProjectContext,
  });

  // ── Notification toast ──────────────────────────────────────────────────────
  const showNotification = (msg: string) => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setAiNotification(msg);
    notificationTimerRef.current = setTimeout(() => {
      setAiNotification(null);
      notificationTimerRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  // ── Yjs group chat subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!doc) return;
    const chatArray = doc.getArray<YChatMessage>('chat-messages');
    const updateMessages = () => setGroupMessages(chatArray.toArray());
    updateMessages();
    chatArray.observe(updateMessages);
    return () => chatArray.unobserve(updateMessages);
  }, [doc]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'group') groupEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages, activeTab]);

  useEffect(() => {
    if (activeTab === 'ai') aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, activeTab, isStreaming]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSendGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const text = groupInput.trim();
    if (!text || !doc) return;
    sendYChatMessage(doc, {
      senderId: doc.clientID,
      senderName: currentUser.name,
      senderColor: currentUser.color,
      text,
    });
    setGroupInput('');
  };

  /** Apply an AI code suggestion directly to the active file in the Yjs doc. */
  const handleApplyCodeToEditor = (newCode: string) => {
    if (!doc || !activeFile) return;
    try {
      const filesMap = doc.getMap('files');
      let yText = filesMap.get(activeFile) as Y.Text | undefined;
      if (!yText) {
        yText = new Y.Text();
        filesMap.set(activeFile, yText);
      }
      doc.transact(() => {
        if (yText) {
          if (yText.length > 0) yText.delete(0, yText.length);
          yText.insert(0, newCode);
        }
      });
      showNotification(`✓ Code applied to ${activeFile}`);
    } catch (err) {
      console.error('Failed to apply code to editor:', err);
    }
  };

  /** Forward an AI response to the shared group chat. */
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

  const handleAIFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = aiInput.trim();
    if (!text || isStreaming) return;
    sendMessage(text);
    setAiInput('');
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

      {/* Tab Switcher Header */}
      <div className="chat-panel-header">
        <div className="chat-tabs">
          <button
            className={`chat-tab-btn ${activeTab === 'group' ? 'chat-tab-active' : ''}`}
            onClick={() => onTabChange('group')}
            title="Group Room Chat"
          >
            <MessageSquare size={14} />
            <span>Group Chat</span>
          </button>
          <button
            className={`chat-tab-btn ${activeTab === 'ai' ? 'chat-tab-active' : ''}`}
            onClick={() => onTabChange('ai')}
            title="AI Coding Assistant"
          >
            <Sparkles size={14} className="sparkle-icon" />
            <span>AI Assistant</span>
          </button>
        </div>

        <div className="chat-header-actions">
          {activeTab === 'ai' && (
            <button
              className="chat-header-btn"
              onClick={clearHistory}
              title="Clear conversation history"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button className="chat-close-btn" onClick={onClose} title="Close panel">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Group Chat Body */}
      {activeTab === 'group' && (
        <div className="chat-body">
          <div className="chat-messages-container">
            {groupMessages.length === 0 ? (
              <div className="chat-empty-state">
                <div className="chat-empty-icon-wrap">
                  <MessageSquare size={28} />
                </div>
                <span className="chat-empty-title">Room Chat</span>
                <span className="chat-empty-subtitle">
                  No messages yet. Send a message to chat with all peers in this session!
                </span>
              </div>
            ) : (
              groupMessages.map((msg) => {
                const isSelf = msg.senderId
                  ? msg.senderId === doc?.clientID
                  : msg.senderName === currentUser.name;
                const senderColor = msg.senderColor || (isSelf ? currentUser.color : '#3b82f6');
                const isAI =
                  msg.senderName === 'CodeSync AI' ||
                  msg.senderName.includes('[Shared from AI]');

                return (
                  <ChatMessageItem
                    key={msg.id}
                    id={msg.id}
                    senderName={msg.senderName}
                    senderColor={senderColor}
                    isSelf={isSelf}
                    isAI={isAI}
                    text={msg.text}
                    timestamp={msg.timestamp}
                    activeFile={activeFile}
                    onApplyCode={handleApplyCodeToEditor}
                  />
                );
              })
            )}
            <div ref={groupEndRef} />
          </div>

          <form onSubmit={handleSendGroup} className="chat-input-form">
            <input
              type="text"
              className="chat-input"
              placeholder="Send message to room..."
              value={groupInput}
              onChange={(e) => setGroupInput(e.target.value)}
              disabled={!doc}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!groupInput.trim() || !doc}
              title="Send message"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* AI Chat Body */}
      {activeTab === 'ai' && (
        <div className="chat-body">
          {/* Active Context Banner */}
          <div className="ai-context-bar">
            <div className="ai-context-item">
              <FileCode size={12} className="ai-context-icon" />
              <span className="ai-context-text">
                Context: <strong>{activeFile}</strong>
              </span>
            </div>
            <label className="ai-context-toggle" title="Include all project files in context">
              <input
                type="checkbox"
                checked={includeProjectContext}
                onChange={(e) => setIncludeProjectContext(e.target.checked)}
              />
              <Layers size={11} />
              <span>All Files</span>
            </label>
          </div>

          {/* Toast Notification Banner */}
          {aiNotification && (
            <div className="ai-notification-banner">
              <span>{aiNotification}</span>
            </div>
          )}

          <div className="chat-messages-container">
            {/* AI Messages List */}
            {aiMessages.map((msg) => {
              const isLastMessage = msg.id === aiMessages[aiMessages.length - 1]?.id;
              const isStreamingThis = isStreaming && isLastMessage;

              return (
                <ChatMessageItem
                  key={msg.id}
                  id={msg.id}
                  senderName={msg.senderName}
                  senderColor={msg.isSelf ? currentUser.color : '#c084fc'}
                  isSelf={msg.isSelf}
                  isAI={msg.isAI}
                  text={msg.text}
                  timestamp={msg.timestamp}
                  error={msg.error}
                  isStreaming={isStreamingThis}
                  activeFile={activeFile}
                  onApplyCode={handleApplyCodeToEditor}
                  onShareToRoom={msg.isAI && msg.id !== 'ai-init' ? handleShareToGroup : undefined}
                />
              );
            })}
            <div ref={aiEndRef} />
          </div>

          {/* AI Input Form */}
          <form onSubmit={handleAIFormSubmit} className="chat-input-form">
            <input
              type="text"
              className="chat-input"
              placeholder={
                isStreaming ? 'CodeSync AI is generating...' : `Ask AI about ${activeFile}...`
              }
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                type="button"
                className="chat-send-btn ai-stop-btn"
                onClick={stopStreaming}
                title="Stop generation"
              >
                <Square size={13} fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                className="chat-send-btn ai-send-btn"
                disabled={!aiInput.trim()}
                title="Ask AI"
              >
                <Sparkles size={14} />
              </button>
            )}
          </form>
        </div>
      )}
    </aside>
  );
};
