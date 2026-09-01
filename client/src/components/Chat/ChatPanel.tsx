import React, { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Bot,
  Code,
  Lightbulb,
  Bug,
} from 'lucide-react';
import type { Collaborator, UserPresence } from '../../utils/collaborators';

export type ChatTab = 'group' | 'ai';

interface ChatMessage {
  id: string;
  senderName: string;
  senderColor?: string;
  isSelf: boolean;
  isAI?: boolean;
  text: string;
  timestamp: string;
}

interface ChatPanelProps {
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
  onClose: () => void;
  users: Collaborator[];
  currentUser: UserPresence;
  activeFile: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  activeTab,
  onTabChange,
  onClose,
  users: _users,
  currentUser,
  activeFile,
}) => {
  // Group chat state
  const [groupInput, setGroupInput] = useState('');
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([
    {
      id: 'system-1',
      senderName: 'System',
      isSelf: false,
      text: `Welcome to the room! All collaborators in this session will see messages here.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // AI chat state
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([
    {
      id: 'ai-1',
      senderName: 'CodeSync AI',
      isSelf: false,
      isAI: true,
      text: `Hello ${currentUser.name}! I am your AI coding assistant. Ask me to explain code, suggest optimizations, generate tests, or fix bugs in ${activeFile}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleSendGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const text = groupInput.trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      senderName: currentUser.name,
      senderColor: currentUser.color,
      isSelf: true,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setGroupMessages((prev) => [...prev, newMsg]);
    setGroupInput('');
  };

  const handleSendAI = (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const text = (customPrompt || aiInput).trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      senderName: currentUser.name,
      isSelf: true,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      senderName: 'CodeSync AI',
      isSelf: false,
      isAI: true,
      text: `[AI Analysis for "${text}"]: Connect an AI backend or API key to unlock full autonomous completions & real-time explanations for ${activeFile}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAiMessages((prev) => [...prev, userMsg, aiResponse]);
    setAiInput('');
  };

  const promptSuggestions = [
    { icon: <Code size={13} />, label: 'Explain this file', prompt: `Explain the structure and logic of ${activeFile}` },
    { icon: <Bug size={13} />, label: 'Find potential bugs', prompt: `Check ${activeFile} for syntax errors and edge cases` },
    { icon: <Lightbulb size={13} />, label: 'Suggest optimizations', prompt: `How can I refactor and optimize the code in ${activeFile}?` },
  ];

  return (
    <aside className="chat-panel">
      {/* Tab Switcher Header */}
      <div className="chat-panel-header">
        <div className="chat-tabs">
          <button
            className={`chat-tab-btn ${activeTab === 'group' ? 'chat-tab-active' : ''}`}
            onClick={() => onTabChange('group')}
            title="Group Chat"
          >
            <MessageSquare size={14} />
            <span>Group Chat</span>
          </button>
          <button
            className={`chat-tab-btn ${activeTab === 'ai' ? 'chat-tab-active' : ''}`}
            onClick={() => onTabChange('ai')}
            title="AI Assistant"
          >
            <Sparkles size={14} className="sparkle-icon" />
            <span>AI Chat</span>
          </button>
        </div>

        <button
          className="chat-close-btn"
          onClick={onClose}
          title="Close chat panel"
        >
          <X size={15} />
        </button>
      </div>

      {/* Group Chat Body */}
      {activeTab === 'group' && (
        <div className="chat-body">
          <div className="chat-messages-container">
            {groupMessages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${msg.isSelf ? 'chat-message-self' : ''}`}
              >
                {!msg.isSelf && (
                  <div
                    className="chat-avatar"
                    style={{ backgroundColor: msg.senderColor || '#3b82f6' }}
                  >
                    {msg.senderName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="chat-bubble-wrapper">
                  <div className="chat-sender-info">
                    <span className="chat-sender-name">
                      {msg.isSelf ? 'You' : msg.senderName}
                    </span>
                    <span className="chat-timestamp">{msg.timestamp}</span>
                  </div>
                  <div className="chat-bubble">{msg.text}</div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendGroup} className="chat-input-form">
            <input
              type="text"
              className="chat-input"
              placeholder="Send message to room..."
              value={groupInput}
              onChange={(e) => setGroupInput(e.target.value)}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!groupInput.trim()}
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
          <div className="chat-messages-container">
            <div className="ai-suggestions-container">
              <span className="ai-suggestions-title">Quick Actions</span>
              <div className="ai-chips">
                {promptSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    className="ai-chip"
                    onClick={() => handleSendAI(undefined, item.prompt)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${msg.isSelf ? 'chat-message-self' : ''} ${msg.isAI ? 'chat-message-ai' : ''}`}
              >
                {!msg.isSelf && (
                  <div className="chat-avatar ai-avatar">
                    <Bot size={15} />
                  </div>
                )}
                <div className="chat-bubble-wrapper">
                  <div className="chat-sender-info">
                    <span className="chat-sender-name">
                      {msg.isSelf ? 'You' : msg.senderName}
                    </span>
                    <span className="chat-timestamp">{msg.timestamp}</span>
                  </div>
                  <div className={`chat-bubble ${msg.isAI ? 'chat-bubble-ai' : ''}`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendAI} className="chat-input-form">
            <input
              type="text"
              className="chat-input"
              placeholder={`Ask AI about ${activeFile}...`}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
            />
            <button
              type="submit"
              className="chat-send-btn ai-send-btn"
              disabled={!aiInput.trim()}
              title="Ask AI"
            >
              <Sparkles size={14} />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
};
