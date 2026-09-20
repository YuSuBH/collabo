import React, { useEffect, useRef } from 'react';
import { FileCode, Play, X } from 'lucide-react';
import {
  getExecutableLanguage,
  getLanguageLabel,
  FILE_ICON_CSS_COLORS,
  getFileIconColor,
} from '../../utils/languageDetection';

interface RunConfigPopoverProps {
  files: string[];
  activeFile: string;
  entryFile: string;
  onEntryFileChange: (file: string) => void;
  onRun: () => void;
  onClose: () => void;
}

export const RunConfigPopover: React.FC<RunConfigPopoverProps> = ({
  files,
  activeFile,
  entryFile,
  onEntryFileChange,
  onRun,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Group files: executable ones first, then unsupported
  const executableFiles = files.filter((f) => getExecutableLanguage(f) !== null);
  const nonExecutableFiles = files.filter((f) => getExecutableLanguage(f) === null);

  const activeFileLang = getExecutableLanguage(activeFile);

  return (
    <div className="run-config-popover" ref={popoverRef} role="dialog" aria-label="Run configuration">
      <div className="rcp-header">
        <span className="rcp-title">Run Configuration</span>
        <button className="rcp-close" onClick={onClose} aria-label="Close">
          <X size={13} />
        </button>
      </div>

      <div className="rcp-section">
        <label className="rcp-label">Entry File</label>
        <p className="rcp-hint">
          The entry file is executed as the main program. Companion files in the
          same language are automatically bundled.
        </p>

        {executableFiles.length === 0 ? (
          <p className="rcp-no-exec">
            No executable files found. Add a <code>.js</code>, <code>.ts</code>,
            or <code>.py</code> file to run code.
          </p>
        ) : (
          <div className="rcp-file-list">
            {executableFiles.map((file) => {
              const isSelected = file === entryFile;
              const isActive = file === activeFile;
              const iconColor = FILE_ICON_CSS_COLORS[getFileIconColor(file)];

              return (
                <button
                  key={file}
                  className={`rcp-file-item ${isSelected ? 'rcp-file-selected' : ''}`}
                  onClick={() => onEntryFileChange(file)}
                  title={`Use "${file}" as entry point`}
                >
                  <span className="rcp-file-radio">
                    <span className={`rcp-radio-dot ${isSelected ? 'rcp-radio-dot-on' : ''}`} />
                  </span>
                  <FileCode size={13} style={{ color: iconColor, flexShrink: 0 }} />
                  <span className="rcp-file-name">{file}</span>
                  <span className="rcp-file-badges">
                    <span className="rcp-lang-badge">{getLanguageLabel(file)}</span>
                    {isActive && (
                      <span className="rcp-active-badge" title="Currently open">
                        active
                      </span>
                    )}
                  </span>
                </button>
              );
            })}

            {nonExecutableFiles.length > 0 && (
              <>
                <div className="rcp-separator-label">Not executable</div>
                {nonExecutableFiles.map((file) => (
                  <div key={file} className="rcp-file-item rcp-file-disabled" title="Not an executable file type">
                    <span className="rcp-file-radio"><span className="rcp-radio-dot" /></span>
                    <FileCode size={13} style={{ color: FILE_ICON_CSS_COLORS.muted, flexShrink: 0 }} />
                    <span className="rcp-file-name rcp-muted">{file}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {activeFileLang === null && entryFile && (
        <p className="rcp-warn">
          Active file <strong>{activeFile}</strong> is not executable. Running
          with <strong>{entryFile}</strong> instead.
        </p>
      )}

      <div className="rcp-footer">
        <button
          className="rcp-run-btn"
          onClick={() => { onRun(); onClose(); }}
          disabled={executableFiles.length === 0}
        >
          <Play size={12} fill="currentColor" />
          Run {entryFile ? `"${entryFile}"` : ''}
        </button>
      </div>
    </div>
  );
};
