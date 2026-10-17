import React from 'react';
import { MessageSquare, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '../common';
import type { ChatTab } from '../../utils/chatUtils';

export interface ChatHeaderProps {
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
  onClose: () => void;
  onClearHistory?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeTab,
  onTabChange,
  onClose,
  onClearHistory,
}) => {
  return (
    <div className="chat-panel-header">
      <div className="chat-tabs">
        <Button
          variant="ghost"
          size="sm"
          className="chat-tab-btn"
          active={activeTab === 'group'}
          onClick={() => onTabChange('group')}
          title="Group Room Chat"
          icon={<MessageSquare size={14} />}
        >
          <span>Group Chat</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="chat-tab-btn"
          active={activeTab === 'ai'}
          onClick={() => onTabChange('ai')}
          title="AI Coding Assistant"
          icon={<Sparkles size={14} className="sparkle-icon" />}
        >
          <span>AI Assistant</span>
        </Button>
      </div>

      <div className="chat-header-actions">
        {activeTab === 'ai' && onClearHistory && (
          <Button
            variant="ghost"
            size="xs"
            iconOnly
            className="chat-header-btn"
            onClick={onClearHistory}
            title="Clear conversation history"
            aria-label="Clear conversation history"
            icon={<Trash2 size={13} />}
          />
        )}
        <Button
          variant="ghost"
          size="xs"
          iconOnly
          className="chat-close-btn"
          onClick={onClose}
          title="Close panel"
          aria-label="Close panel"
          icon={<X size={15} />}
        />
      </div>
    </div>
  );
};
