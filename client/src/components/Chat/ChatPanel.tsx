import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MessageSquare,
  Sparkles,
  Send,
  X,
  Bot,
  Code,
  Lightbulb,
  Bug,
  TestTube,
  FileText,
  Copy,
  Check,
  Share2,
  FileCode,
  Layers,
  Square,
  Trash2,
  ArrowRightCircle,
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
  error?: boolean;
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

/**
 * Code Block Component with Copy and Apply to Editor features
 */
interface CodeBlockProps {
  language?: string;
  code: string;
  activeFile: string;
  onApplyCode: (code: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, activeFile, onApplyCode }) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyCode(code);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  return (
    <div className="ai-code-block-container">
      <div className="ai-code-block-header">
        <span className="ai-code-lang">{language || 'code'}</span>
        <div className="ai-code-actions">
          <button
            type="button"
            className="ai-code-btn"
            onClick={handleCopy}
            title="Copy code snippet"
          >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            className={`ai-code-btn ai-code-apply-btn ${applied ? 'ai-code-applied' : ''}`}
            onClick={handleApply}
            title={`Apply snippet directly to ${activeFile}`}
          >
            {applied ? <Check size={12} className="text-success" /> : <ArrowRightCircle size={12} />}
            <span>{applied ? `Applied to ${activeFile}` : `Apply to ${activeFile}`}</span>
          </button>
        </div>
      </div>
      <pre className="ai-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

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

  // AI chat state
  const [aiInput, setAiInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [includeProjectContext, setIncludeProjectContext] = useState(false);
  const [aiNotification, setAiNotification] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([
    {
      id: 'ai-init',
      senderName: 'CodeSync AI',
      isSelf: false,
      isAI: true,
      text: `👋 Hello ${currentUser.name}! I am **CodeSync AI**, your real-time collaborative coding companion.\n\nI can analyze **\`${activeFile}\`**, explain logic, debug syntax issues, write unit tests, and apply code directly into the editor for all collaborators to see.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

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

  // Auto-scroll when messages update
  useEffect(() => {
    if (activeTab === 'group') {
      groupEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [groupMessages, activeTab]);

  useEffect(() => {
    if (activeTab === 'ai') {
      aiEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiMessages, activeTab, isStreaming]);

  // Send message to shared room chat
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

  // Helper to extract active file code
  const getActiveFileContent = (): string => {
    if (!doc || !activeFile) return '';
    const filesMap = doc.getMap('files');
    const yText = filesMap.get(activeFile) as Y.Text | undefined;
    return yText ? yText.toString() : '';
  };

  // Helper to extract all project files
  const getAllProjectFiles = (): Array<{ name: string; content: string }> => {
    if (!doc) return [];
    const filesMap = doc.getMap('files');
    const result: Array<{ name: string; content: string }> = [];
    filesMap.forEach((val, key) => {
      if (val instanceof Y.Text) {
        result.push({ name: key, content: val.toString() });
      }
    });
    return result;
  };

  // Apply code to active file in Monaco / Yjs
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
          if (yText.length > 0) {
            yText.delete(0, yText.length);
          }
          yText.insert(0, newCode);
        }
      });

      setAiNotification(`✓ Code applied to ${activeFile}`);
      setTimeout(() => setAiNotification(null), 3000);
    } catch (err) {
      console.error('Failed to apply code to editor:', err);
    }
  };

  // Share AI message to group chat
  const handleShareToGroup = (messageText: string) => {
    if (!doc) return;

    const chatArray = doc.getArray<YChatMessage>('chat-messages');
    const sharedMsg: YChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      senderId: doc.clientID,
      senderName: `${currentUser.name} 🤖 [Shared from AI]`,
      senderColor: currentUser.color,
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    doc.transact(() => {
      chatArray.push([sharedMsg]);
    });

    setAiNotification('✓ Shared to Group Chat');
    setTimeout(() => setAiNotification(null), 3000);
  };

  // Send request to AI Backend with streaming
  const handleSendAI = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptText = (customPrompt || aiInput).trim();
    if (!promptText || isStreaming) return;

    const userMessageId = `user-${Date.now()}`;
    const aiMessageId = `ai-${Date.now() + 1}`;

    const userMsg: AIChatMessage = {
      id: userMessageId,
      senderName: currentUser.name,
      isSelf: true,
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const initialAiMsg: AIChatMessage = {
      id: aiMessageId,
      senderName: 'CodeSync AI',
      isSelf: false,
      isAI: true,
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Append user message & empty AI placeholder
    setAiMessages((prev) => [...prev, userMsg, initialAiMsg]);
    setAiInput('');
    setIsStreaming(true);

    const activeContent = getActiveFileContent();
    const allFilesList = includeProjectContext ? getAllProjectFiles() : undefined;

    // Build conversation history for context
    const history = aiMessages
      .filter((m) => m.id !== 'ai-init' && !m.error && m.text.trim())
      .slice(-6)
      .map((m) => ({
        role: m.isSelf ? ('user' as const) : ('model' as const),
        text: m.text,
      }));

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptText,
          activeFile: {
            name: activeFile,
            content: activeContent,
          },
          allFiles: allFilesList,
          history,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `Server error (${response.status})` };
        }
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedText += parsed.text;
              setAiMessages((prev) =>
                prev.map((m) => (m.id === aiMessageId ? { ...m, text: accumulatedText } : m))
              );
            }
          } catch (jsonErr: any) {
            if (jsonErr.message && !jsonErr.message.includes('JSON')) {
              throw jsonErr;
            }
          }
        }
      }

      if (!accumulatedText) {
        setAiMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  text: 'No response received. Make sure GEMINI_API_KEY is configured in server/.env.',
                  error: true,
                }
              : m
          )
        );
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setAiMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? { ...m, text: m.text + '\n\n*(Generation stopped by user)*' }
              : m
          )
        );
      } else {
        console.error('AI Request Error:', err);
        setAiMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId
              ? {
                  ...m,
                  text: `⚠️ **Error**: ${err.message || 'Could not connect to AI service.'}\n\n*Tip: Check that \`GEMINI_API_KEY\` is set in \`server/.env\` and the server is running.*`,
                  error: true,
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleClearAIHistory = () => {
    setAiMessages([
      {
        id: 'ai-init',
        senderName: 'CodeSync AI',
        isSelf: false,
        isAI: true,
        text: `Conversation cleared. Ready for your questions about **\`${activeFile}\`**!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const promptSuggestions = [
    {
      icon: <Bug size={13} />,
      label: 'Find & Fix Bugs',
      prompt: `Analyze ${activeFile} for bugs, edge cases, potential runtime exceptions, and provide fixes.`,
    },
    {
      icon: <Code size={13} />,
      label: 'Explain Code',
      prompt: `Explain the architecture, structure, and functions of ${activeFile} step by step.`,
    },
    {
      icon: <Lightbulb size={13} />,
      label: 'Refactor & Optimize',
      prompt: `Suggest performance optimizations, cleaner patterns, and readability refactoring for ${activeFile}.`,
    },
    {
      icon: <TestTube size={13} />,
      label: 'Generate Unit Tests',
      prompt: `Generate comprehensive unit tests for the functions and exports in ${activeFile}.`,
    },
    {
      icon: <FileText size={13} />,
      label: 'Add Comments & Types',
      prompt: `Add clear documentation comments and TypeScript annotations to ${activeFile}.`,
    },
  ];

  return (
    <aside className="chat-panel">
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
              onClick={handleClearAIHistory}
              title="Clear conversation history"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            className="chat-close-btn"
            onClick={onClose}
            title="Close panel"
          >
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
            {/* Quick Suggestions Chips */}
            <div className="ai-suggestions-container">
              <span className="ai-suggestions-title">Quick Actions for {activeFile}</span>
              <div className="ai-chips">
                {promptSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="ai-chip"
                    onClick={() => handleSendAI(undefined, item.prompt)}
                    disabled={isStreaming}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Messages List */}
            {aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${msg.isSelf ? 'chat-message-self' : ''} ${
                  msg.isAI ? 'chat-message-ai' : ''
                }`}
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

                  <div className={`chat-bubble ${msg.isAI ? 'chat-bubble-ai' : ''} ${msg.error ? 'chat-bubble-error' : ''}`}>
                    {msg.isSelf ? (
                      <div className="chat-text-plain">{msg.text}</div>
                    ) : (
                      <div className="ai-markdown-content">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            pre(props: any) {
                              return <>{props.children}</>;
                            },
                            code(props: any) {
                              const { children, className, node: _node, ...rest } = props;
                              const match = /language-(\w+)/.exec(className || '');
                              const codeString = String(children).replace(/\n$/, '');

                              // If it's a code block (contains newlines or has a language class)
                              if (match || codeString.includes('\n')) {
                                return (
                                  <CodeBlock
                                    language={match ? match[1] : undefined}
                                    code={codeString}
                                    activeFile={activeFile}
                                    onApplyCode={handleApplyCodeToEditor}
                                  />
                                );
                              }
                              // Inline code
                              return (
                                <code className="ai-inline-code" {...rest}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.text || 'Thinking...'}
                        </ReactMarkdown>

                        {/* Streaming cursor pulse */}
                        {isStreaming && msg.id === aiMessages[aiMessages.length - 1]?.id && (
                          <span className="ai-streaming-cursor" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message Action Footer for AI messages */}
                  {msg.isAI && !msg.error && msg.text.trim() && msg.id !== 'ai-init' && (
                    <div className="ai-message-footer">
                      <button
                        type="button"
                        className="ai-footer-action-btn"
                        onClick={() => handleShareToGroup(msg.text)}
                        title="Share this response to the collaborative room chat"
                      >
                        <Share2 size={11} />
                        <span>Share to Room</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={aiEndRef} />
          </div>

          {/* AI Input Form */}
          <form onSubmit={handleSendAI} className="chat-input-form">
            <input
              type="text"
              className="chat-input"
              placeholder={isStreaming ? 'CodeSync AI is generating...' : `Ask AI about ${activeFile}...`}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              disabled={isStreaming}
            />
            {isStreaming ? (
              <button
                type="button"
                className="chat-send-btn ai-stop-btn"
                onClick={handleStopStreaming}
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
