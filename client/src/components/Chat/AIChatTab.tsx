import React, { useState, useEffect, useRef } from 'react';
import { FileCode, Layers, Square, Sparkles } from 'lucide-react';
import type { UserPresence } from '../../utils/collaborators';
import type { AIChatMessage } from '../../utils/chatUtils';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';

export interface AIChatTabProps {
  currentUser: UserPresence;
  activeFile: string;
  panelWidth: number;
  includeProjectContext: boolean;
  onToggleProjectContext: (include: boolean) => void;
  aiNotification: string | null;
  aiMessages: AIChatMessage[];
  isStreaming: boolean;
  onSendMessage: (promptText: string) => void;
  onStopStreaming: () => void;
  onApplyCode: (code: string, targetFile: string) => void;
  onShareToGroup: (messageText: string) => void;
}

export const AIChatTab: React.FC<AIChatTabProps> = ({
  currentUser,
  activeFile,
  panelWidth,
  includeProjectContext,
  onToggleProjectContext,
  aiNotification,
  aiMessages,
  isStreaming,
  onSendMessage,
  onStopStreaming,
  onApplyCode,
  onShareToGroup,
}) => {
  const [aiInput, setAiInput] = useState('');
  const aiEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isStreaming]);

  const handleSendAI = () => {
    const text = aiInput.trim();
    if (!text || isStreaming) return;
    onSendMessage(text);
    setAiInput('');
  };

  return (
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
            onChange={(e) => onToggleProjectContext(e.target.checked)}
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

      {/* Messages List */}
      <div className="chat-messages-container">
        {aiMessages.map((msg) => {
          const isLastMessage = msg.id === aiMessages[aiMessages.length - 1]?.id;
          const isStreamingThis = isStreaming && isLastMessage;

          return (
            <ChatMessageItem
              key={msg.id}
              id={msg.id}
              senderName={msg.senderName}
              senderColor={msg.isSelf ? currentUser.color : undefined}
              isSelf={msg.isSelf}
              isAI={msg.isAI}
              text={msg.text}
              timestamp={msg.timestamp}
              error={msg.error}
              isStreaming={isStreamingThis}
              activeFile={msg.contextFile || activeFile}
              onApplyCode={onApplyCode}
              onShareToRoom={msg.isAI && msg.id !== 'ai-init' ? onShareToGroup : undefined}
            />
          );
        })}
        <div ref={aiEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        value={aiInput}
        onChange={setAiInput}
        onSubmit={handleSendAI}
        placeholder={
          isStreaming ? 'Collabo AI is generating...' : `Ask AI about ${activeFile}...`
        }
        disabled={isStreaming}
        panelWidth={panelWidth}
        sendButtonTitle="Ask AI (Enter)"
        sendButtonIcon={<Sparkles size={14} />}
        sendButtonClassName="ai-send-btn"
        isStreaming={isStreaming}
        onStop={onStopStreaming}
        stopButtonTitle="Stop generation"
        stopButtonIcon={<Square size={13} fill="currentColor" />}
      />
    </div>
  );
};
