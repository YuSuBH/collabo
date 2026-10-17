import { useState, useRef, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { applyCodeSnippet } from '../utils/applyCodeSnippet';

interface UseApplyCodeOptions {
  doc: Y.Doc | null;
  activeFile: string;
  /** Duration in ms to show the notification toast. Default: 3000 */
  notificationDuration?: number;
}

interface UseApplyCodeReturn {
  /** Call this from any CodeBlock "Apply" button. */
  applyCode: (snippet: string, targetFile: string) => void;
  /** Non-null while the toast is visible. */
  notification: string | null;
  /** Show any arbitrary toast message. */
  showNotification: (msg: string) => void;
}

/**
 * Encapsulates the AI code-apply flow:
 *  - Fuzzy-merges the snippet into the target Yjs file using applyCodeSnippet
 *  - Uses a minimal prefix/suffix diff to avoid editor flash
 *  - Manages the ephemeral notification toast lifecycle
 */
export function useApplyCode({
  doc,
  activeFile,
  notificationDuration = 3000,
}: UseApplyCodeOptions): UseApplyCodeReturn {
  const [notification, setNotification] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up any pending timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const showNotification = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setNotification(msg);
    timerRef.current = setTimeout(() => {
      setNotification(null);
      timerRef.current = null;
    }, notificationDuration);
  }, [notificationDuration]);

  const applyCode = useCallback((snippet: string, targetFile: string) => {
    const file = targetFile || activeFile;
    if (!doc || !file) return;

    try {
      const filesMap = doc.getMap('files');
      let yText = filesMap.get(file) as Y.Text | undefined;
      const existingContent = yText ? yText.toString() : '';

      // Deterministic client-side merge — no LLM call needed
      const { newContent, action, startLine } = applyCodeSnippet(snippet, existingContent);

      if (!yText) {
        yText = new Y.Text();
        filesMap.set(file, yText);
      }

      const finalYText = yText;
      doc.transact(() => {
        const oldStr = finalYText.toString();
        const newStr = newContent;
        if (oldStr === newStr) return;

        // Find common prefix
        let prefixLen = 0;
        const minLen = Math.min(oldStr.length, newStr.length);
        while (prefixLen < minLen && oldStr[prefixLen] === newStr[prefixLen]) prefixLen++;

        // Find common suffix (bounded so it doesn't overlap the prefix)
        let suffixLen = 0;
        const maxSuffix = minLen - prefixLen;
        while (
          suffixLen < maxSuffix &&
          oldStr[oldStr.length - 1 - suffixLen] === newStr[newStr.length - 1 - suffixLen]
        ) suffixLen++;

        // Only touch the differing middle
        const deleteCount = oldStr.length - prefixLen - suffixLen;
        if (deleteCount > 0) finalYText.delete(prefixLen, deleteCount);

        const insertStr = newStr.slice(prefixLen, newStr.length - suffixLen || undefined);
        if (insertStr.length > 0) finalYText.insert(prefixLen, insertStr);
      });

      const label = action === 'replaced' ? `updated at line ${startLine}` : action;
      showNotification(`✓ Code ${label} in ${file}`);
    } catch (err) {
      console.error('Failed to apply code to editor:', err);
      showNotification('⚠ Failed to apply code — check console for details');
    }
  }, [doc, activeFile, showNotification]);

  return { applyCode, notification, showNotification };
}
