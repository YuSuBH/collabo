import { useState, useRef, useEffect } from 'react';
import * as Y from 'yjs';
import type { UserPresence } from '../utils/collaborators';
import {
  type AIChatMessage,
  formatTimestamp,
  generateMessageId,
} from '../utils/chatUtils';

interface UseAIStreamOptions {
  doc: Y.Doc | null;
  activeFile: string;
  currentUser: UserPresence;
  includeProjectContext: boolean;
}

export interface UseAIStreamReturn {
  aiMessages: AIChatMessage[];
  isStreaming: boolean;
  /** Send a prompt to the streaming endpoint and fill the AI placeholder incrementally. */
  sendMessage: (promptText: string) => Promise<void>;
  /** Abort the in-flight SSE request. */
  stopStreaming: () => void;
  /** Reset the conversation to the welcome message. */
  clearHistory: () => void;
}

/**
 * Manages AI streaming state and the SSE fetch/parse loop so that
 * ChatPanel stays focused on layout and user interaction only.
 */
export function useAIStream({
  doc,
  activeFile,
  currentUser,
  includeProjectContext,
}: UseAIStreamOptions): UseAIStreamReturn {
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([
    {
      id: 'ai-init',
      senderName: 'Collabo AI',
      isSelf: false,
      isAI: true,
      text: `👋 Hello ${currentUser.name}! I am **Collabo AI**, your real-time collaborative coding companion.\n\nI can analyze **\`${activeFile}\`**, explain logic, debug syntax issues, write unit tests, and apply code directly into the editor for all collaborators to see.`,
      timestamp: formatTimestamp(),
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setAiMessages((prev) => {
      return prev.map((m) => {
        if (m.id === 'ai-init') {
          return {
            ...m,
            senderName: 'Collabo AI',
            text: `👋 Hello ${currentUser.name}! I am **Collabo AI**, your real-time collaborative coding companion.\n\nI can analyze **\`${activeFile}\`**, explain logic, debug syntax issues, write unit tests, and apply code directly into the editor for all collaborators to see.`,
          };
        }
        return {
          ...m,
          senderName: m.senderName === 'CodeSync AI' ? 'Collabo AI' : m.senderName,
          text: (m.text || '').replace(/CodeSync/g, 'Collabo'),
        };
      });
    });
  }, [currentUser.name, activeFile]);

  /** Read the current text of the active file from the shared Yjs doc. */
  const getActiveFileContent = (): string => {
    if (!doc || !activeFile) return '';
    const filesMap = doc.getMap('files');
    const yText = filesMap.get(activeFile) as Y.Text | undefined;
    return yText ? yText.toString() : '';
  };

  /** Read all project files from the shared Yjs doc. */
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

  /** Patch a single AI message's text and optional error flag in-place. */
  const updateAiMessage = (id: string, text: string, isError = false) => {
    setAiMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, text, error: isError } : m))
    );
  };

  /**
   * Send a prompt to /api/ai/stream.
   * Optimistically pushes a user bubble and an empty AI placeholder,
   * then fills the placeholder incrementally as SSE chunks arrive.
   */
  const sendMessage = async (promptText: string): Promise<void> => {
    if (!promptText || isStreaming) return;

    const userMessageId = generateMessageId('user');
    const aiMessageId = generateMessageId('ai');

    const userMsg: AIChatMessage = {
      id: userMessageId,
      senderName: currentUser.name,
      isSelf: true,
      text: promptText,
      timestamp: formatTimestamp(),
    };

    const initialAiMsg: AIChatMessage = {
      id: aiMessageId,
      senderName: 'Collabo AI',
      isSelf: false,
      isAI: true,
      text: '',
      timestamp: formatTimestamp(),
    };

    setAiMessages((prev) => [...prev, userMsg, initialAiMsg]);
    setIsStreaming(true);

    const activeContent = getActiveFileContent();
    const allFilesList = includeProjectContext ? getAllProjectFiles() : undefined;

    // Capture current history (excludes welcome message, errors, and empty messages)
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
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/ai/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          activeFile: { name: activeFile, content: activeContent },
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

      // SSE parse loop — line-by-line, tolerates partial chunks
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
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              accumulatedText += parsed.text;
              updateAiMessage(aiMessageId, accumulatedText);
            }
          } catch (jsonErr: any) {
            // Re-throw non-JSON errors; swallow partial-chunk parse failures
            if (jsonErr.message && !jsonErr.message.includes('JSON')) {
              throw jsonErr;
            }
          }
        }
      }

      if (!accumulatedText) {
        updateAiMessage(
          aiMessageId,
          'No response received. Make sure GEMINI_API_KEY is configured in server/.env.',
          true
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
        updateAiMessage(
          aiMessageId,
          `⚠️ **Error**: ${err.message || 'Could not connect to AI service.'}\n\n*Tip: Check that \`GEMINI_API_KEY\` is set in \`server/.env\` and the server is running.*`,
          true
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
  };

  const clearHistory = () => {
    setAiMessages([
      {
        id: 'ai-init',
        senderName: 'Collabo AI',
        isSelf: false,
        isAI: true,
        text: `Conversation cleared. Ready for your questions about **\`${activeFile}\`**!`,
        timestamp: formatTimestamp(),
      },
    ]);
  };

  return { aiMessages, isStreaming, sendMessage, stopStreaming, clearHistory };
}
