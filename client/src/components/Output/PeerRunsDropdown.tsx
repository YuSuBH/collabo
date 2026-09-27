import React, { useState, useRef, useEffect } from 'react';
import { Users, History, ChevronDown, ArrowLeft } from 'lucide-react';
import type { SharedExecutionRun } from '../../types/execution';

interface PeerRunsDropdownProps {
  peerRuns: SharedExecutionRun[];
  isViewingPeerRun: boolean;
  displayedRun: SharedExecutionRun | null;
  selectedRunId: string | null;
  onSelectRun: (id: string | null) => void;
}

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export const PeerRunsDropdown: React.FC<PeerRunsDropdownProps> = ({
  peerRuns,
  isViewingPeerRun,
  displayedRun,
  selectedRunId,
  onSelectRun,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  return (
    <div className="output-runs-dropdown-container" ref={dropdownRef}>
      <button
        className={`output-action-btn output-runs-dropdown-btn ${
          isViewingPeerRun ? 'output-action-btn-active' : ''
        }`}
        onClick={() => setShowDropdown((v) => !v)}
        title="View executions by collaborators"
      >
        <Users size={12} />
        <span>{isViewingPeerRun ? displayedRun!.executorName : 'Peer Outputs'}</span>
        {peerRuns.length > 0 && (
          <span className="output-runs-count-badge">{peerRuns.length}</span>
        )}
        <ChevronDown size={11} />
      </button>

      {showDropdown && (
        <div className="output-runs-dropdown-menu">
          <div className="output-runs-menu-header">
            <History size={12} />
            <span>Collaborator Runs</span>
          </div>

          {/* Back to My Output when viewing a peer's run */}
          {isViewingPeerRun && (
            <>
              <div
                className="output-runs-menu-item"
                onClick={() => { onSelectRun(null); setShowDropdown(false); }}
              >
                <ArrowLeft size={12} className="output-runs-item-icon" />
                <div className="output-runs-item-details">
                  <div className="output-runs-item-title">Back to My Output</div>
                  <div className="output-runs-item-sub">Return to your local execution</div>
                </div>
              </div>
              <div className="output-runs-menu-divider" />
            </>
          )}

          {/* Peer run list */}
          <div className="output-runs-menu-list">
            {peerRuns.length === 0 && (
              <div className="output-runs-menu-empty">No other collaborator runs yet</div>
            )}
            {peerRuns.map((runItem) => {
              const isItemExitOk = runItem.exitCode === '0';
              const isSelected = selectedRunId === runItem.id;
              return (
                <div
                  key={runItem.id}
                  className={`output-runs-menu-item ${isSelected ? 'output-runs-menu-item-active' : ''}`}
                  onClick={() => { onSelectRun(runItem.id); setShowDropdown(false); }}
                >
                  <div
                    className="output-runs-item-avatar"
                    style={{ backgroundColor: runItem.executorColor }}
                  >
                    {runItem.executorName.charAt(0).toUpperCase()}
                  </div>
                  <div className="output-runs-item-details">
                    <div className="output-runs-item-title">
                      <span>{runItem.executorName}</span>
                      <span className="output-runs-item-file">{runItem.entryFile}</span>
                    </div>
                    <div className="output-runs-item-sub">
                      <span
                        className={`output-runs-status-dot ${
                          isItemExitOk ? 'status-dot-ok' : 'status-dot-err'
                        }`}
                      />
                      <span>Exit {runItem.exitCode}</span>
                      <span>•</span>
                      <span>{formatTime(runItem.timestamp)}</span>
                      {runItem.stdin && (
                        <>
                          <span>•</span>
                          <span className="output-runs-stdin-tag">stdin</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
