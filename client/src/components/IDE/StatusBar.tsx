import { Terminal, Radio, Loader2 } from 'lucide-react';
import { Button } from '../common';

interface CursorPos {
  line: number;
  col: number;
}

interface StatusBarProps {
  isOutputPanelOpen: boolean;
  onToggleOutput: () => void;
  isRunning: boolean;
  status: string;
  roomId: string;
  cursorPos: CursorPos;
  languageLabel: string;
}

export function StatusBar({
  isOutputPanelOpen,
  onToggleOutput,
  isRunning,
  status,
  roomId,
  cursorPos,
  languageLabel,
}: StatusBarProps) {
  return (
    <footer className="status-bar">
      <div className="status-bar-left">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="status-bar-btn"
          active={isOutputPanelOpen}
          onClick={onToggleOutput}
          title={isOutputPanelOpen ? 'Hide Output Panel' : 'Show Output Panel'}
          aria-label="Toggle Output Panel"
          icon={
            isRunning ? (
              <Loader2 size={12} className="spin-icon" />
            ) : (
              <Terminal size={12} />
            )
          }
        >
          <span>Output</span>
          {isRunning && <span className="status-bar-running-badge">Running...</span>}
        </Button>

        <div className="status-item">
          <Radio
            size={12}
            style={{ color: status === 'connected' ? 'var(--color-success)' : 'var(--color-warning)' }}
          />
          <span>Collabo Relay</span>
        </div>
        <div className="status-item">
          <span>Room: {roomId}</span>
        </div>
      </div>

      <div className="status-bar-right">
        <div className="status-item">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        </div>
        <div className="status-item">
          <span>Spaces: 2</span>
        </div>
        <div className="status-item">
          <span>UTF-8</span>
        </div>
        <div className="status-item highlight-item">
          <span>{languageLabel}</span>
        </div>
      </div>
    </footer>
  );
}
