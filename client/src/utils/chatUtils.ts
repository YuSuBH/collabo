import * as Y from 'yjs';

export type ChatTab = 'group' | 'ai';

export interface YChatMessage {
  id: string;
  senderId?: number;
  senderName: string;
  senderColor?: string;
  text: string;
  timestamp: string;
}

export interface AIChatMessage {
  id: string;
  senderName: string;
  isSelf: boolean;
  isAI?: boolean;
  text: string;
  timestamp: string;
  error?: boolean;
}

/**
 * Computes contrast text color (dark or white) for a given hex background.
 */
export function getContrastTextColor(hexColor?: string): string {
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
 * Formats current time into a clean 2-digit HH:MM timestamp.
 */
export function formatTimestamp(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Generates a unique message ID.
 */
export function generateMessageId(prefix: string = ''): string {
  const randomPart = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}-${Date.now()}` : `${Date.now()}-${randomPart}`;
}

/**
 * Helper to push a message into the shared Yjs 'chat-messages' Array.
 */
export function sendYChatMessage(
  doc: Y.Doc,
  message: Omit<YChatMessage, 'id' | 'timestamp'>
): YChatMessage {
  const fullMessage: YChatMessage = {
    ...message,
    id: generateMessageId(),
    timestamp: formatTimestamp(),
  };

  const chatArray = doc.getArray<YChatMessage>('chat-messages');
  doc.transact(() => {
    chatArray.push([fullMessage]);
  });

  return fullMessage;
}
