import React from 'react';
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
} from 'lucide-react';
import type { ExecutionResult, SharedExecutionRun } from '../../types/execution';
import { PeerRunsDropdown } from './PeerRunsDropdown';
import { formatDuration } from '../../utils/outputUtils';

interface OutputHeaderProps {
  isRunning: boolean;
  isCollapsed: boolean;
  isViewingPeerRun: boolean;
  activeResult: (ExecutionResult & Partial<SharedExecutionRun>) | null;
  error: string | null;
  showStdin: boolean;
  peerRuns: SharedExecutionRun[];
  displayedRun: SharedExecutionRun | null;
  selectedRunId: string | null;
  onRunWithStdin?: (stdin: string) => void;
  onSelectRun?: (id: string | null) => void;
  onToggleStdin: () => void;
  onClear: () => void;
  onToggleCollapse: () => void;
  onClose: () => void;
}

export const OutputHeader: React.FC<OutputHeaderProps> = ({
  isRunning,
  isCollapsed,
  isViewingPeerRun,
  activeResult,
  error,
  showStdin,
  peerRuns,
  displayedRun,
  selectedRunId,
  onRunWithStdin,
  onSelectRun,
  onToggleStdin,
  onClear,
  onToggleCollapse,
  onClose,
}) => {
  const exitOk = activeResult?.exitCode === '0';

  return (
    <div className="output-header">
      <div className="output-header-left">
        <Terminal size={13} className="output-header-icon" />
        <span className="output-header-title">Output</span>

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
            {activeResult.entryFile} · {activeResult.compiler} ·{' '}
            {formatDuration(activeResult.durationMs)}
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
        {(peerRuns.length > 0 || isViewingPeerRun) && (
          <PeerRunsDropdown
            peerRuns={peerRuns}
            isViewingPeerRun={isViewingPeerRun}
            displayedRun={displayedRun}
            selectedRunId={selectedRunId}
            onSelectRun={(id) => onSelectRun?.(id)}
          />
        )}

        {onRunWithStdin && !isViewingPeerRun && (
          <button
            className={`output-action-btn ${showStdin ? 'output-action-btn-active' : ''}`}
            onClick={onToggleStdin}
            title="Toggle stdin input"
          >
            <ChevronRight size={13} />
            <span>stdin</span>
          </button>
        )}

        <button
          className="output-action-btn"
          onClick={onClear}
          title="Clear output"
          disabled={isRunning}
        >
          <Trash2 size={13} />
        </button>

        <button
          className="output-action-btn"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {isCollapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        <button className="output-action-btn" onClick={onClose} title="Close output panel">
          <X size={13} />
        </button>
      </div>
    </div>
  );
};
