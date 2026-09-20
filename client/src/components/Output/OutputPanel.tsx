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
  Send,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import type { ExecutionResult } from '../../hooks/useCodeExecution';

interface OutputPanelProps {
  isRunning: boolean;
  result: ExecutionResult | null;
  error: string | null;
  onClear: () => void;
  onClose: () => void;
  /** Called when user wants to re-run with optional stdin */
  onRunWithStdin?: (stdin: string) => void;
}

const MIN_HEIGHT = 120;
const DEFAULT_HEIGHT = 220;
const MAX_HEIGHT = 600;

export const OutputPanel: React.FC<OutputPanelProps> = ({
  isRunning,
  result,
  error,
  onClear,
  onClose,
  onRunWithStdin,
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
      // Dragging upward → increase height (delta is negative when moving up)
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

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const hasStdout = !!result?.stdout;
  const hasStderr = !!result?.stderr;
  const hasCompilerError = !!result?.compilerError;
  const exitOk = result?.exitCode === '0';
  const hasAnyOutput = hasStdout || hasStderr || hasCompilerError;

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const isEofError =
    !isRunning &&
    (result?.stderr?.includes('EOFError') ||
      result?.stderr?.includes('EOF when reading a line'));

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

  // ── Render ──────────────────────────────────────────────────────────────────
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
          {!isRunning && result && (
            <span
              className={`output-badge ${exitOk ? 'output-badge-ok' : 'output-badge-err'}`}
              title={`Exit code ${result.exitCode}`}
            >
              {exitOk ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
              Exit {result.exitCode}
            </span>
          )}
          {!isRunning && result && (
            <span className="output-meta">
              {result.entryFile} · {result.compiler} · {formatDuration(result.durationMs)}
            </span>
          )}
          {!isRunning && error && (
            <span className="output-badge output-badge-err">
              <XCircle size={11} />
              Error
            </span>
          )}
        </div>

        <div className="output-header-actions">
          {/* stdin toggle */}
          {onRunWithStdin && (
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
          {/* stdin input row */}
          {showStdin && onRunWithStdin && (
            <div className="output-stdin-row">
              <div className="output-stdin-label-col">
                <span className="output-stdin-label">stdin</span>
                <span className="output-stdin-hint">Ctrl+Enter</span>
              </div>
              <textarea
                ref={stdinInputRef}
                className="output-stdin-input"
                rows={Math.min(5, Math.max(1, stdin.split('\n').length))}
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="Enter standard input (e.g. separate multiple lines with Enter)…"
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (!isRunning) handleRunWithStdin();
                  } else if (e.key === 'Enter' && !e.shiftKey && !stdin.includes('\n') && stdin.trim().length > 0) {
                    // Quick-run on single Enter only if it's currently a single line without Shift
                    // (User can press Shift+Enter for multiple lines or Ctrl+Enter anytime)
                  }
                }}
              />
              <button
                className="output-stdin-run"
                onClick={handleRunWithStdin}
                disabled={isRunning}
                title="Run with this stdin (Ctrl+Enter)"
              >
                <Send size={12} />
              </button>
            </div>
          )}

          {/* Running state */}
          {isRunning && (
            <div className="output-loading">
              <Loader2 size={20} className="spin output-loading-icon" />
              <span className="output-loading-text">Running on Wandbox…</span>
            </div>
          )}

          {/* Error (hook-level, not compiler error) */}
          {!isRunning && error && (
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
              <pre className="output-pre output-pre-error">{result!.compilerError}</pre>
            </div>
          )}

          {/* Stdout */}
          {!isRunning && hasStdout && (
            <div className="output-section output-section-stdout">
              <div className="output-section-label">
                <Terminal size={12} />
                stdout
              </div>
              <pre className="output-pre output-pre-stdout">{result!.stdout}</pre>
            </div>
          )}

          {/* Stderr */}
          {!isRunning && hasStderr && (
            <div className="output-section output-section-stderr">
              <div className="output-section-label">
                <XCircle size={12} />
                stderr
              </div>
              <pre className="output-pre output-pre-error">{result!.stderr}</pre>
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
