import React from 'react';
import type { ExecutionResult, SharedExecutionRun } from '../../types/execution';
import { useResizable } from '../../hooks/useResizable';
import { useEofDetection } from '../../hooks/useEofDetection';
import { OutputHeader } from './OutputHeader';
import { OutputContent } from './OutputContent';

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
  const { height, isCollapsed, setIsCollapsed, panelRef, handleResizeMouseDown } =
    useResizable();

  const isViewingPeerRun = !!displayedRun;

  const { isEofError, showStdin, setShowStdin, stdin, setStdin, stdinInputRef } =
    useEofDetection({ isRunning, isViewingPeerRun, result });

  // Active result: prefer a selected peer run, fall back to local result
  const activeResult: (ExecutionResult & Partial<SharedExecutionRun>) | null =
    displayedRun ?? result;

  // Only show other collaborators' runs
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

      <OutputHeader
        isRunning={isRunning}
        isCollapsed={isCollapsed}
        isViewingPeerRun={isViewingPeerRun}
        activeResult={activeResult}
        error={error}
        showStdin={showStdin}
        peerRuns={peerRuns}
        displayedRun={displayedRun}
        selectedRunId={selectedRunId}
        onRunWithStdin={onRunWithStdin}
        onSelectRun={onSelectRun}
        onToggleStdin={() => setShowStdin((v) => !v)}
        onClear={onClear}
        onToggleCollapse={() => setIsCollapsed((v) => !v)}
        onClose={onClose}
      />

      {!isCollapsed && (
        <OutputContent
          isRunning={isRunning}
          isViewingPeerRun={isViewingPeerRun}
          activeResult={activeResult}
          error={error}
          isEofError={isEofError}
          showStdin={showStdin}
          stdin={stdin}
          stdinInputRef={stdinInputRef}
          displayedRun={displayedRun}
          latestPeerRun={latestPeerRun}
          onRunWithStdin={onRunWithStdin}
          onSelectRun={onSelectRun}
          onClearPeerNotification={onClearPeerNotification}
          onStdinChange={setStdin}
        />
      )}
    </div>
  );
};
