import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { MessageSquare, Send } from 'lucide-react';
import type { UserPresence } from '../../utils/collaborators';
import { type YChatMessage, sendYChatMessage } from '../../utils/chatUtils';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';

export interface GroupChatTabProps {
  doc: Y.Doc | null;
  currentUser: UserPresence;
  activeFile: string;
  panelWidth: number;
  onApplyCode: (code: string, targetFile: string) => void;
}

export const GroupChatTab: React.FC<GroupChatTabProps> = ({
  doc,
  currentUser,
  activeFile,
  panelWidth,
  onApplyCode,
}) => {
  const [groupInput, setGroupInput] = useState('');
  const [groupMessages, setGroupMessages] = useState<YChatMessage[]>([]);
  const groupEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doc) return;
    const chatArray = doc.getArray<YChatMessage>('chat-messages');
    const updateMessages = () => setGroupMessages(chatArray.toArray());
    updateMessages();
    chatArray.observe(updateMessages);
    return () => chatArray.unobserve(updateMessages);
  }, [doc]);

  useEffect(() => {
    groupEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  const handleSendGroup = () => {
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

  return (
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
            const senderColor = msg.senderColor || (isSelf ? currentUser.color : undefined);
            const isAI =
              msg.senderName === 'Collabo AI' ||
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
                onApplyCode={onApplyCode}
                showApply={false}
              />
            );
          })
        )}
        <div ref={groupEndRef} />
      </div>

      <ChatInput
        value={groupInput}
        onChange={setGroupInput}
        onSubmit={handleSendGroup}
        placeholder="Send message to room..."
        disabled={!doc}
        panelWidth={panelWidth}
        sendButtonTitle="Send message (Enter)"
        sendButtonIcon={<Send size={14} />}
      />
    </div>
  );
};
