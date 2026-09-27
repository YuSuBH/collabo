import React, { useRef, useEffect } from 'react';
import { FileCode, Check, X } from 'lucide-react';

interface NewFileInputProps {
  fileName: string;
  createError: string;
  onChange: (value: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}

export const NewFileInput: React.FC<NewFileInputProps> = ({
  fileName,
  createError,
  onChange,
  onCreate,
  onCancel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onCreate();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="fe-new-file">
      <div className="fe-new-input-row">
        <FileCode size={14} className="fe-new-icon" />
        <input
          ref={inputRef}
          type="text"
          className={`fe-new-input ${createError ? 'fe-new-input-error' : ''}`}
          value={fileName}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="filename.ext"
          spellCheck={false}
        />
        <button className="fe-btn-create" onClick={onCreate} title="Create">
          <Check size={13} />
        </button>
        <button className="fe-btn-cancel" onClick={onCancel} title="Cancel">
          <X size={13} />
        </button>
      </div>
      {createError && <span className="fe-create-error">{createError}</span>}
    </div>
  );
};
