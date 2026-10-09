import React from 'react';
import { Send } from 'lucide-react';
import { Button } from '../common';

interface StdinRowProps {
  stdin: string;
  isRunning: boolean;
  stdinInputRef: React.RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onRun: () => void;
}

export const StdinRow: React.FC<StdinRowProps> = ({
  stdin,
  isRunning,
  stdinInputRef,
  onChange,
  onRun,
}) => {
  return (
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
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter standard input (e.g. separate multiple lines with Enter)…"
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!isRunning) onRun();
          }
        }}
      />
      <Button
        variant="primary"
        size="xs"
        iconOnly
        className="output-stdin-run"
        onClick={onRun}
        disabled={isRunning}
        title="Run with this stdin (Ctrl+Enter)"
        aria-label="Run with stdin"
        icon={<Send size={12} />}
      />
    </div>
  );
};
