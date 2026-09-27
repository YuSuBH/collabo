import { useState, useRef, useEffect } from 'react';
import type { ExecutionResult } from '../types/execution';

interface UseEofDetectionOptions {
  isRunning: boolean;
  isViewingPeerRun: boolean;
  result: ExecutionResult | null;
}

interface UseEofDetectionResult {
  isEofError: boolean;
  showStdin: boolean;
  setShowStdin: React.Dispatch<React.SetStateAction<boolean>>;
  stdin: string;
  setStdin: React.Dispatch<React.SetStateAction<string>>;
  stdinInputRef: React.RefObject<HTMLTextAreaElement>;
}

export function useEofDetection({
  isRunning,
  isViewingPeerRun,
  result,
}: UseEofDetectionOptions): UseEofDetectionResult {
  const [showStdin, setShowStdin] = useState(false);
  const [stdin, setStdin] = useState('');
  const stdinInputRef = useRef<HTMLTextAreaElement>(null);

  const isEofError =
    !isRunning &&
    !isViewingPeerRun &&
    (result?.stderr?.includes('EOFError') || result?.stderr?.includes('EOF when reading a line')) === true;

  useEffect(() => {
    if (isEofError) {
      setShowStdin(true);
      setTimeout(() => {
        stdinInputRef.current?.focus();
      }, 100);
    }
  }, [isEofError]);

  return { isEofError, showStdin, setShowStdin, stdin, setStdin, stdinInputRef };
}
