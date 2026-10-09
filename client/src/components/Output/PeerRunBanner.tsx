import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../common';
import type { SharedExecutionRun } from '../../types/execution';
import { formatTime } from '../../utils/outputUtils';

interface PeerRunBannerProps {
  displayedRun: SharedExecutionRun;
  onBackToMyOutput: () => void;
}

export const PeerRunBanner: React.FC<PeerRunBannerProps> = ({
  displayedRun,
  onBackToMyOutput,
}) => (
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
          {formatTime(displayedRun.timestamp)} · File:{' '}
          <code>{displayedRun.entryFile}</code>
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
      <Button
        variant="secondary"
        size="xs"
        className="output-peer-back-btn"
        onClick={onBackToMyOutput}
        icon={<ArrowLeft size={12} />}
      >
        My Output
      </Button>
    </div>
  </div>
);
