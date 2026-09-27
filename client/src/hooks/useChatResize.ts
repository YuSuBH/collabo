import { useState, useRef, useEffect } from 'react';

const DEFAULT_CHAT_WIDTH = 340;
const MIN_CHAT_WIDTH = 260;
const MAX_CHAT_WIDTH = 800;
const STORAGE_KEY = 'codesync_chat_width';

function saveWidthToStorage(width: number) {
  try {
    localStorage.setItem(STORAGE_KEY, width.toString());
  } catch {
    // Ignore localStorage errors
  }
}

export function useChatResize() {
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_CHAT_WIDTH && parsed <= MAX_CHAT_WIDTH) {
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
    return DEFAULT_CHAT_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const panelWidthRef = useRef(panelWidth);
  panelWidthRef.current = panelWidth;

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startWidth = panelWidthRef.current;

    const handlePointerMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX =
        'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const deltaX = startX - currentX;
      const maxAvailableWidth = Math.min(MAX_CHAT_WIDTH, window.innerWidth - 220);
      const newWidth = Math.max(
        MIN_CHAT_WIDTH,
        Math.min(maxAvailableWidth, startWidth + deltaX)
      );
      setPanelWidth(newWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      saveWidthToStorage(panelWidthRef.current);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResetWidth = () => {
    setPanelWidth(DEFAULT_CHAT_WIDTH);
    saveWidthToStorage(DEFAULT_CHAT_WIDTH);
  };

  // Ensure cursor/userSelect is restored if unmounted while resizing
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  return {
    panelWidth,
    isResizing,
    handleResizeStart,
    handleResetWidth,
  };
}
