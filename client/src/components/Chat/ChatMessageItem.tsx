import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Sparkles, Share2 } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { getContrastTextColor } from '../../utils/chatUtils';

export interface ChatMessageItemProps {
  id: string;
  senderName: string;
  senderColor?: string;
  isSelf: boolean;
  isAI?: boolean;
  text: string;
  timestamp: string;
  error?: boolean;
  isStreaming?: boolean;
  activeFile: string;
  onApplyCode: (code: string) => void;
  onShareToRoom?: (text: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  senderName,
  senderColor,
  isSelf,
  isAI,
  text,
  timestamp,
  error,
  isStreaming,
  activeFile,
  onApplyCode,
  onShareToRoom,
}) => {
  const avatarTextColor = getContrastTextColor(senderColor);
  const isSharedAI = senderName.includes('[Shared from AI]');
  let cleanSenderName = isSelf
    ? 'You'
    : senderName.replace(' 🤖 [Shared from AI]', '').replace(' [Shared from AI]', '');

  if (cleanSenderName === 'CodeSync AI') {
    cleanSenderName = 'Collabo AI';
  } else if (cleanSenderName.includes('CodeSync')) {
    cleanSenderName = cleanSenderName.replace(/CodeSync/g, 'Collabo');
  }

  const displayText = (text || '').replace(/CodeSync/g, 'Collabo');

  return (
    <div className={`chat-message ${isSelf ? 'chat-message-self' : ''}`}>
      {!isSelf && (
        <div
          className={`chat-avatar ${isAI && !isSharedAI ? 'ai-avatar' : ''}`}
          style={
            !isAI || isSharedAI
              ? { backgroundColor: senderColor || 'var(--bg-surface)', color: avatarTextColor }
              : undefined
          }
        >
          {isAI && !isSharedAI ? (
            <Bot size={15} />
          ) : (
            cleanSenderName.charAt(0).toUpperCase()
          )}
        </div>
      )}

      <div className="chat-bubble-wrapper">
        <div className="chat-sender-info">
          <span
            className={`chat-sender-name ${isAI && !isSharedAI ? 'ai-sender-name' : ''}`}
            style={
              senderColor
                ? { color: senderColor }
                : isAI && !isSharedAI
                ? { color: 'var(--accent-primary)' }
                : isSelf
                ? { color: 'var(--accent-primary)' }
                : { color: 'var(--text-muted)' }
            }
          >
            {cleanSenderName}
          </span>
          {isSharedAI && (
            <span className="chat-shared-badge" title="Shared from AI Assistant">
              <Sparkles size={9} />
              <span>AI</span>
            </span>
          )}
          <span className="chat-timestamp">{timestamp}</span>
        </div>

        <div
          className={`chat-bubble ${isSelf ? 'chat-bubble-self' : ''} ${
            error ? 'chat-bubble-error' : ''
          }`}
        >
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

                  if (match || codeString.includes('\n')) {
                    return (
                      <CodeBlock
                        language={match ? match[1] : undefined}
                        code={codeString}
                        activeFile={activeFile}
                        onApplyCode={onApplyCode}
                      />
                    );
                  }
                  return (
                    <code className="ai-inline-code" {...rest}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {displayText || (isStreaming ? 'Thinking...' : '')}
            </ReactMarkdown>

            {isStreaming && <span className="ai-streaming-cursor" />}
          </div>
        </div>

        {onShareToRoom && !error && displayText.trim() && (
          <div className="ai-message-footer">
            <button
              type="button"
              className="ai-footer-action-btn"
              onClick={() => onShareToRoom(displayText)}
              title="Share this response to the collaborative room chat"
            >
              <Share2 size={11} />
              <span>Share to Room</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
