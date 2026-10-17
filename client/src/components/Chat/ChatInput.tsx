import React, { useRef, useEffect } from 'react';
import { Button } from '../common';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  disabled?: boolean;
  panelWidth?: number;
  sendButtonTitle?: string;
  sendButtonIcon: React.ReactNode;
  sendButtonClassName?: string;
  isStreaming?: boolean;
  onStop?: () => void;
  stopButtonTitle?: string;
  stopButtonIcon?: React.ReactNode;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled = false,
  panelWidth,
  sendButtonTitle = 'Send message (Enter)',
  sendButtonIcon,
  sendButtonClassName = '',
  isStreaming = false,
  onStop,
  stopButtonTitle = 'Stop generation',
  stopButtonIcon,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 130;
    const nextHeight = Math.min(el.scrollHeight + 2, maxHeight);
    el.style.height = `${nextHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [value, panelWidth]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !value.trim()) return;
    onSubmit();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="chat-input-form">
      <textarea
        ref={textareaRef}
        className="chat-input"
        rows={1}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          adjustHeight();
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled || isStreaming}
      />
      {isStreaming && onStop ? (
        <Button
          type="button"
          variant="danger"
          size="sm"
          iconOnly
          className="chat-send-btn ai-stop-btn"
          onClick={onStop}
          title={stopButtonTitle}
          aria-label={stopButtonTitle}
          icon={stopButtonIcon}
        />
      ) : (
        <Button
          type="submit"
          variant="primary"
          size="sm"
          iconOnly
          className={`chat-send-btn ${sendButtonClassName}`.trim()}
          disabled={disabled || !value.trim()}
          title={sendButtonTitle}
          aria-label={sendButtonTitle}
          icon={sendButtonIcon}
        />
      )}
    </form>
  );
};
