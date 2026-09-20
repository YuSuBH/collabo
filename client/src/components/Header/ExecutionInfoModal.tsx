import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ExecutionInfoModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export const ExecutionInfoModal: React.FC<ExecutionInfoModalProps> = ({ onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="exec-info-dropdown" ref={popoverRef} role="dialog" aria-label="How execution works">
      {/* Header */}
      <div className="exec-info-header">
        <h3 className="exec-info-plain-title">How Execution Works</h3>
        <button className="exec-info-close-btn" onClick={onClose} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="exec-info-body">
        <p className="exec-info-plain-text">
          Code execution starts from the entry file. The entry file is automatically selected based on standard file names or your currently active file, and you can change it using the dropdown arrow next to the Run button.
        </p>
        <p className="exec-info-plain-text">
          To use multiple files in your project, import companion files using standard syntax like require or import in JavaScript and TypeScript, or import and from in Python.
        </p>
      </div>
    </div>
  );
};
