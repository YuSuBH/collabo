import React, { useState } from 'react';
import { Copy, Check, ArrowRightCircle } from 'lucide-react';

export interface CodeBlockProps {
  language?: string;
  code: string;
  activeFile: string;
  onApplyCode: (code: string) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  code,
  activeFile,
  onApplyCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApplyCode(code);
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  return (
    <div className="ai-code-block-container">
      <div className="ai-code-block-header">
        <span className="ai-code-lang">{language || 'code'}</span>
        <div className="ai-code-actions">
          <button
            type="button"
            className="ai-code-btn"
            onClick={handleCopy}
            title="Copy code snippet"
          >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            className={`ai-code-btn ai-code-apply-btn ${applied ? 'ai-code-applied' : ''}`}
            onClick={handleApply}
            title={`Apply snippet directly to ${activeFile}`}
          >
            {applied ? <Check size={12} className="text-success" /> : <ArrowRightCircle size={12} />}
            <span>{applied ? `Applied to ${activeFile}` : `Apply to ${activeFile}`}</span>
          </button>
        </div>
      </div>
      <pre className="ai-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};
