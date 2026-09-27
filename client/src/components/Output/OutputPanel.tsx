import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Terminal,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Lightbulb,
  ArrowLeft,
} from 'lucide-react';
import type { ExecutionResult, SharedExecutionRun } from '../../types/execution';
import { PeerRunsDropdown } from './PeerRunsDropdown';
import { StdinRow } from './StdinRow';

interface OutputPanelProps {
  isRunning: boolean;
  result: ExecutionResult | null;
  error: string | null;
  onClear: () => void;
  onClose: () => void;
  /** Called when user wants to re-run with optional stdin */
  onRunWithStdin?: (stdin: string) => void;
  /** Shared runs across collaborators in the room */
  sharedRuns?: SharedExecutionRun[];
  /** Currently selected run ID (null = local latest result) */
  selectedRunId?: string | null;
  /** Callback to change selected run */
  onSelectRun?: (runId: string | null) => void;
  /** Displayed run if a shared run is selected */
  displayedRun?: SharedExecutionRun | null;
  /** Notification for latest peer run */
  latestPeerRun?: SharedExecutionRun | null;
  /** Clear notification */
  onClearPeerNotification?: () => void;
  /** Current user's name to filter out own runs */
  currentUserName?: string;
  /** Current client ID to filter out own runs */
  currentClientId?: number;
}

const MIN_HEIGHT = 120;
const DEFAULT_HEIGHT = 240;
const MAX_HEIGHT = 600;

export const OutputPanel: React.FC<OutputPanelProps> = ({
  isRunning,
  result,
  error,
  onClear,
  onClose,
  onRunWithStdin,
  sharedRuns = [],
  selectedRunId = null,
  onSelectRun,
  displayedRun = null,
  latestPeerRun = null,
  onClearPeerNotification,
  currentUserName,
  currentClientId,
}) => {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);

  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const stdinInputRef = useRef<HTMLTextAreaElement>(null);

  // ── Drag-to-resize ─────────────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartH.current = height;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  }, [height]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = dragStartY.current - e.clientY;
      const newH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta));
      setHeight(newH);
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // ── Active Result to Display ────────────────────────────────────────────────
  const activeResult: (ExecutionResult & Partial<SharedExecutionRun>) | null =
    displayedRun ?? result;
  const isViewingPeerRun = !!displayedRun;

  const hasStdout = !!activeResult?.stdout;
  const hasStderr = !!activeResult?.stderr;
  const hasCompilerError = !!activeResult?.compilerError;
  const exitOk = activeResult?.exitCode === '0';
  const hasAnyOutput = hasStdout || hasStderr || hasCompilerError;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const isEofError =
    !isRunning &&
    !isViewingPeerRun &&
    (activeResult?.stderr?.includes('EOFError') ||
      activeResult?.stderr?.includes('EOF when reading a line'));

  useEffect(() => {
    if (isEofError) {
      setShowStdin(true);
      setTimeout(() => {
        stdinInputRef.current?.focus();
      }, 100);
    }
  }, [isEofError]);

  const handleRunWithStdin = () => {
    onRunWithStdin?.(stdin);
  };

  // ── Peer Runs Only (Exclude current user's runs) ───────────────────────────
  const peerRuns = sharedRuns.filter((r) => {
    if (currentClientId !== undefined && r.executorId === currentClientId) return false;
    if (currentUserName && r.executorName === currentUserName) return false;
    return true;
  });

  return (
    <div
      className="output-panel"
      ref={panelRef}
      style={{ height: isCollapsed ? 32 : height }}
    >
      {/* Drag Handle */}
      <div
        className="output-resize-handle"
        onMouseDown={handleResizeMouseDown}
        title="Drag to resize"
      />

      {/* Header Bar */}
      <div className="output-header">
        <div className="output-header-left">
          <Terminal size={13} className="output-header-icon" />
          <span className="output-header-title">Output</span>

          {/* Status badge */}
          {isRunning && (
            <span className="output-badge output-badge-running">
              <Loader2 size={11} className="spin" />
              Executing...
            </span>
          )}
          {!isRunning && activeResult && (
            <span
              className={`output-badge ${exitOk ? 'output-badge-ok' : 'output-badge-err'}`}
              title={`Exit code ${activeResult.exitCode}`}
            >
              {exitOk ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
              Exit {activeResult.exitCode}
            </span>
          )}
          {!isRunning && activeResult && (
            <span className="output-meta">
              {activeResult.entryFile} · {activeResult.compiler} · {formatDuration(activeResult.durationMs)}
            </span>
          )}
          {!isRunning && error && !isViewingPeerRun && (
            <span className="output-badge output-badge-err">
              <XCircle size={11} />
              Error
            </span>
          )}
        </div>

        <div className="output-header-actions">
          {/* Peer Runs Selector Dropdown (Collaborators Only) */}
          {(peerRuns.length > 0 || isViewingPeerRun) && (
            <PeerRunsDropdown
              peerRuns={peerRuns}
              isViewingPeerRun={isViewingPeerRun}
              displayedRun={displayedRun}
              selectedRunId={selectedRunId ?? null}
              onSelectRun={(id) => onSelectRun?.(id)}
            />
          )}

          {/* stdin toggle */}
          {onRunWithStdin && !isViewingPeerRun && (
            <button
              className={`output-action-btn ${showStdin ? 'output-action-btn-active' : ''}`}
              onClick={() => setShowStdin((v) => !v)}
              title="Toggle stdin input"
            >
              <ChevronRight size={13} />
              <span>stdin</span>
            </button>
          )}

          {/* Clear */}
          <button
            className="output-action-btn"
            onClick={onClear}
            title="Clear output"
            disabled={isRunning}
          >
            <Trash2 size={13} />
          </button>

          {/* Collapse / Expand */}
          <button
            className="output-action-btn"
            onClick={() => setIsCollapsed((v) => !v)}
            title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {/* Close */}
          <button
            className="output-action-btn"
            onClick={onClose}
            title="Close output panel"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div className="output-body">
          {/* Live Notification for another collaborator's run */}
          {latestPeerRun && latestPeerRun.id !== displayedRun?.id && (
            <div className="output-live-peer-toast">
              <div
                className="output-live-peer-dot"
                style={{ backgroundColor: latestPeerRun.executorColor }}
              />
              <span className="output-toast-msg">
                <strong>{latestPeerRun.executorName}</strong> executed{' '}
                <code>{latestPeerRun.entryFile}</code>
                {latestPeerRun.exitCode === '0' ? ' (Exit 0)' : ' (Exit ' + latestPeerRun.exitCode + ')'}
              </span>
              <button
                className="output-toast-view-btn"
                onClick={() => {
                  onSelectRun?.(latestPeerRun.id);
                  onClearPeerNotification?.();
                }}
              >
                View Output
              </button>
              <button
                className="output-toast-dismiss-btn"
                onClick={onClearPeerNotification}
                title="Dismiss"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Shared Run Banner when viewing a peer's output */}
          {isViewingPeerRun && displayedRun && (
            <div className="output-peer-banner">
              <div className="output-peer-banner-left">
                <div
                  className="output-peer-avatar"
                  style={{ backgroundColor: displayedRun.executorColor }}
                >
                  {displayedRun.executorName.charAt(0).toUpperCase()}
                </div>
                <div className="output-peer-meta">
                  <span className="output-peer-name">
                    Shared output from <strong>{displayedRun.executorName}</strong>
                  </span>
                  <span className="output-peer-time">
                    {formatTime(displayedRun.timestamp)} · File: <code>{displayedRun.entryFile}</code>
                  </span>
                </div>
              </div>

              <div className="output-peer-banner-right">
                {displayedRun.stdin && (
                  <div
                    className="output-peer-stdin-badge"
                    title={`stdin used: ${displayedRun.stdin}`}
                  >
                    stdin: <code>{displayedRun.stdin.replace(/\n/g, ' ')}</code>
                  </div>
                )}
                <button
                  className="output-peer-back-btn"
                  onClick={() => onSelectRun?.(null)}
                >
                  <ArrowLeft size={12} />
                  <span>My Output</span>
                </button>
              </div>
            </div>
          )}

          {/* stdin input row */}
          {showStdin && onRunWithStdin && !isViewingPeerRun && (
            <StdinRow
              stdin={stdin}
              isRunning={isRunning}
              stdinInputRef={stdinInputRef}
              onChange={setStdin}
              onRun={handleRunWithStdin}
            />
          )}

          {/* Running state */}
          {isRunning && (
            <div className="output-loading">
              <Loader2 size={20} className="spin output-loading-icon" />
              <span className="output-loading-text">Running on Wandbox…</span>
            </div>
          )}

          {/* Error (hook-level) */}
          {!isRunning && error && !isViewingPeerRun && (
            <div className="output-section output-section-error">
              <div className="output-section-label">
                <XCircle size={12} />
                Execution Error
              </div>
              <pre className="output-pre output-pre-error">{error}</pre>
            </div>
          )}

          {/* Compiler error */}
          {!isRunning && hasCompilerError && (
            <div className="output-section output-section-compiler-error">
              <div className="output-section-label">
                <XCircle size={12} />
                Compiler Error
              </div>
              <pre className="output-pre output-pre-error">{activeResult!.compilerError}</pre>
            </div>
          )}

          {/* Stdout */}
          {!isRunning && hasStdout && (
            <div className="output-section output-section-stdout">
              <div className="output-section-label">
                <Terminal size={12} />
                stdout
              </div>
              <pre className="output-pre output-pre-stdout">{activeResult!.stdout}</pre>
            </div>
          )}

          {/* Stderr */}
          {!isRunning && hasStderr && (
            <div className="output-section output-section-stderr">
              <div className="output-section-label">
                <XCircle size={12} />
                stderr
              </div>
              <pre className="output-pre output-pre-error">{activeResult!.stderr}</pre>
            </div>
          )}

          {/* EOF / Stdin Guidance Banner */}
          {isEofError && (
            <div className="output-eof-hint">
              <Lightbulb size={14} className="output-eof-hint-icon" />
              <div className="output-eof-hint-text">
                <strong>Input Required:</strong> Your program requested input via{' '}
                <code>input()</code>. Provide input in the <strong>stdin</strong> bar above and press <strong>Enter</strong> to run.
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isRunning && !error && !hasAnyOutput && (
            <div className="output-empty">
              <Terminal size={22} className="output-empty-icon" />
              <p className="output-empty-text">
                Run your code with the <strong>▶ Run</strong> button
              </p>
              <p className="output-empty-sub">
                JavaScript, TypeScript, and Python are supported
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
