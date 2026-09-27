import React from 'react';
import { Terminal, XCircle, Loader2, Lightbulb } from 'lucide-react';
import type { ExecutionResult, SharedExecutionRun } from '../../types/execution';
import { StdinRow } from './StdinRow';
import { PeerRunToast } from './PeerRunToast';
import { PeerRunBanner } from './PeerRunBanner';

interface OutputContentProps {
  isRunning: boolean;
  isViewingPeerRun: boolean;
  activeResult: (ExecutionResult & Partial<SharedExecutionRun>) | null;
  error: string | null;
  isEofError: boolean;
  showStdin: boolean;
  stdin: string;
  stdinInputRef: React.RefObject<HTMLTextAreaElement>;
  displayedRun: SharedExecutionRun | null;
  latestPeerRun: SharedExecutionRun | null;
  onRunWithStdin?: (stdin: string) => void;
  onSelectRun?: (id: string | null) => void;
  onClearPeerNotification?: () => void;
  onStdinChange: (value: string) => void;
}

export const OutputContent: React.FC<OutputContentProps> = ({
  isRunning,
  isViewingPeerRun,
  activeResult,
  error,
  isEofError,
  showStdin,
  stdin,
  stdinInputRef,
  displayedRun,
  latestPeerRun,
  onRunWithStdin,
  onSelectRun,
  onClearPeerNotification,
  onStdinChange,
}) => {
  const hasStdout = !!activeResult?.stdout;
  const hasStderr = !!activeResult?.stderr;
  const hasCompilerError = !!activeResult?.compilerError;
  const hasAnyOutput = hasStdout || hasStderr || hasCompilerError;

  const handleRun = () => onRunWithStdin?.(stdin);

  return (
    <div className="output-body">
      {latestPeerRun && (
        <PeerRunToast
          latestPeerRun={latestPeerRun}
          displayedRunId={displayedRun?.id}
          onView={(id) => {
            onSelectRun?.(id);
            onClearPeerNotification?.();
          }}
          onDismiss={() => onClearPeerNotification?.()}
        />
      )}

      {isViewingPeerRun && displayedRun && (
        <PeerRunBanner
          displayedRun={displayedRun}
          onBackToMyOutput={() => onSelectRun?.(null)}
        />
      )}

      {showStdin && onRunWithStdin && !isViewingPeerRun && (
        <StdinRow
          stdin={stdin}
          isRunning={isRunning}
          stdinInputRef={stdinInputRef}
          onChange={onStdinChange}
          onRun={handleRun}
        />
      )}

      {isRunning && (
        <div className="output-loading">
          <Loader2 size={20} className="spin output-loading-icon" />
          <span className="output-loading-text">Running on Wandbox…</span>
        </div>
      )}

      {!isRunning && error && !isViewingPeerRun && (
        <div className="output-section output-section-error">
          <div className="output-section-label">
            <XCircle size={12} />
            Execution Error
          </div>
          <pre className="output-pre output-pre-error">{error}</pre>
        </div>
      )}

      {!isRunning && hasCompilerError && (
        <div className="output-section output-section-compiler-error">
          <div className="output-section-label">
            <XCircle size={12} />
            Compiler Error
          </div>
          <pre className="output-pre output-pre-error">{activeResult!.compilerError}</pre>
        </div>
      )}

      {!isRunning && hasStdout && (
        <div className="output-section output-section-stdout">
          <div className="output-section-label">
            <Terminal size={12} />
            stdout
          </div>
          <pre className="output-pre output-pre-stdout">{activeResult!.stdout}</pre>
        </div>
      )}

      {!isRunning && hasStderr && (
        <div className="output-section output-section-stderr">
          <div className="output-section-label">
            <XCircle size={12} />
            stderr
          </div>
          <pre className="output-pre output-pre-error">{activeResult!.stderr}</pre>
        </div>
      )}

      {isEofError && (
        <div className="output-eof-hint">
          <Lightbulb size={14} className="output-eof-hint-icon" />
          <div className="output-eof-hint-text">
            <strong>Input Required:</strong> Your program requested input via{' '}
            <code>input()</code>. Provide input in the <strong>stdin</strong> bar above and
            press <strong>Enter</strong> to run.
          </div>
        </div>
      )}

      {!isRunning && !error && !hasAnyOutput && (
        <div className="output-empty">
          <Terminal size={22} className="output-empty-icon" />
          <p className="output-empty-text">
            Run your code with the <strong>▶ Run</strong> button
          </p>
          <p className="output-empty-sub">JavaScript, TypeScript, and Python are supported</p>
        </div>
      )}
    </div>
  );
};
