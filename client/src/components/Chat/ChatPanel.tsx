import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
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

export interface YChatMessage {
  id: string;
  senderId?: number;
  senderName: string;
  senderColor?: string;
  text: string;
  timestamp: string;
}

interface AIChatMessage {
  id: string;
  senderName: string;
  isSelf: boolean;
  isAI?: boolean;
  text: string;
  timestamp: string;
}

interface ChatPanelProps {
  doc: Y.Doc | null;
  activeTab: ChatTab;
  onTabChange: (tab: ChatTab) => void;
  onClose: () => void;
  users: Collaborator[];
  currentUser: UserPresence;
  activeFile: string;
}

function getContrastTextColor(hexColor?: string): string {
  if (!hexColor) return '#ffffff';
  const cleanHex = hexColor.replace('#', '');
  let r = 255;
  let g = 255;
  let b = 255;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#0f172a' : '#ffffff';
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
  // Group chat state bound to Y.Array
  const [groupInput, setGroupInput] = useState('');
  const [groupMessages, setGroupMessages] = useState<YChatMessage[]>([]);
  const groupEndRef = useRef<HTMLDivElement>(null);
  const aiEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to Yjs 'chat-messages' Array
  useEffect(() => {
    if (!doc) return;

    const chatArray = doc.getArray<YChatMessage>('chat-messages');

    const updateMessages = () => {
      setGroupMessages(chatArray.toArray());
    };

    updateMessages();
    chatArray.observe(updateMessages);

    return () => {
      chatArray.unobserve(updateMessages);
    };
  }, [doc]);

  // Scroll to bottom when group messages change
  useEffect(() => {
    if (activeTab === 'group') {
      groupEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [groupMessages, activeTab]);

  // AI chat state
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([
    {
      id: 'ai-1',
      senderName: 'CodeSync AI',
      isSelf: false,
      isAI: true,
      text: `Hello ${currentUser.name}! I am your AI coding assistant. Ask me to explain code, suggest optimizations, generate tests, or fix bugs in ${activeFile}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Scroll to bottom when AI messages change
  useEffect(() => {
    if (activeTab === 'ai') {
      aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, activeTab]);

  const handleSendGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const text = groupInput.trim();
    if (!text || !doc) return;

    const newMsg: YChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      senderId: doc.clientID,
      senderName: currentUser.name,
      senderColor: currentUser.color,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const chatArray = doc.getArray<YChatMessage>('chat-messages');
    doc.transact(() => {
      chatArray.push([newMsg]);
    });

    setGroupInput('');
  };

  const handleSendAI = (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const text = (customPrompt || aiInput).trim();
    if (!text) return;

    const userMsg: AIChatMessage = {
      id: Date.now().toString(),
      senderName: currentUser.name,
      isSelf: true,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const aiResponse: AIChatMessage = {
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
                const textColor = getContrastTextColor(senderColor);

                return (
                  <div
                    key={msg.id}
                    className={`chat-message ${isSelf ? 'chat-message-self' : ''}`}
                  >
                    {!isSelf && (
                      <div
                        className="chat-avatar"
                        style={{ backgroundColor: senderColor }}
                      >
                        {msg.senderName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="chat-bubble-wrapper">
                      <div className="chat-sender-info">
                        <span className="chat-sender-name">
                          {isSelf ? 'You' : msg.senderName}
                        </span>
                        <span className="chat-timestamp">{msg.timestamp}</span>
                      </div>
                      <div
                        className="chat-bubble chat-bubble-peer"
                        style={{
                          backgroundColor: senderColor,
                          color: textColor,
                          borderColor: 'transparent',
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  </div>
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
            <div ref={aiEndRef} />
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
