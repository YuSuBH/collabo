import React from 'react';
import { X } from 'lucide-react';
import type { SharedExecutionRun } from '../../types/execution';

interface PeerRunToastProps {
  latestPeerRun: SharedExecutionRun;
  displayedRunId?: string;
  onView: (id: string) => void;
  onDismiss: () => void;
}

export const PeerRunToast: React.FC<PeerRunToastProps> = ({
  latestPeerRun,
  displayedRunId,
  onView,
  onDismiss,
}) => {
  if (latestPeerRun.id === displayedRunId) return null;

  const exitLabel =
    latestPeerRun.exitCode === '0'
      ? ' (Exit 0)'
      : ` (Exit ${latestPeerRun.exitCode})`;

  return (
    <div className="output-live-peer-toast">
      <div
        className="output-live-peer-dot"
        style={{ backgroundColor: latestPeerRun.executorColor }}
      />
      <span className="output-toast-msg">
        <strong>{latestPeerRun.executorName}</strong> executed{' '}
        <code>{latestPeerRun.entryFile}</code>
        {exitLabel}
      </span>
      <button
        className="output-toast-view-btn"
        onClick={() => onView(latestPeerRun.id)}
      >
        View Output
      </button>
      <button
        className="output-toast-dismiss-btn"
        onClick={onDismiss}
        title="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  );
};
