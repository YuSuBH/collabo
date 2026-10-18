import React, { useState } from 'react';
import { Copy, Check, ArrowRightCircle } from 'lucide-react';
import { Button } from '../common';

export interface CodeBlockProps {
  language?: string;
  code: string;
  activeFile: string;
  onApplyCode?: (code: string, targetFile: string) => void;
  showApply?: boolean;
}

const LANGUAGE_TO_EXTENSION: Record<string, string> = {
  javascript: '.js',
  js: '.js',
  typescript: '.ts',
  ts: '.ts',
  jsx: '.jsx',
  tsx: '.tsx',
  html: '.html',
  htm: '.html',
  css: '.css',
  scss: '.scss',
  sass: '.sass',
  less: '.less',
  json: '.json',
  python: '.py',
  py: '.py',
  java: '.java',
  c: '.c',
  cpp: '.cpp',
  'c++': '.cpp',
  csharp: '.cs',
  'c#': '.cs',
  cs: '.cs',
  go: '.go',
  golang: '.go',
  rust: '.rs',
  rs: '.rs',
  php: '.php',
  ruby: '.rb',
  rb: '.rb',
  sql: '.sql',
  shell: '.sh',
  bash: '.sh',
  sh: '.sh',
  zsh: '.sh',
  markdown: '.md',
  md: '.md',
  yaml: '.yaml',
  yml: '.yml',
  xml: '.xml',
  dockerfile: 'dockerfile',
  graphql: '.gql',
  gql: '.gql',
  plaintext: '.txt',
  text: '.txt',
  txt: '.txt',
};

const getExtension = (lang?: string, fallbackFile?: string): string => {
  if (lang) {
    const clean = lang.trim().toLowerCase();
    if (clean.startsWith('.')) return clean;
    if (clean in LANGUAGE_TO_EXTENSION) return LANGUAGE_TO_EXTENSION[clean];
    return `.${clean}`;
  }
  if (fallbackFile && fallbackFile.includes('.')) {
    return fallbackFile.slice(fallbackFile.lastIndexOf('.')).toLowerCase();
  }
  return '';
};

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language,
  code,
  activeFile,
  onApplyCode,
  showApply = true,
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
    if (onApplyCode) {
      onApplyCode(code, activeFile);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    }
  };

  const extension = getExtension(language, activeFile);
  const displayFileName = activeFile ? activeFile.split('/').pop() || activeFile : '';

  return (
    <div className="ai-code-block-container">
      <div className="ai-code-block-header">
        <span className="ai-code-lang">{extension}</span>
        <div className="ai-code-actions">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="ai-code-btn"
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy code snippet'}
            aria-label={copied ? 'Copied' : 'Copy code snippet'}
            icon={copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
          />
          {showApply && onApplyCode && activeFile && (
            <Button
              type="button"
              variant={applied ? 'success' : 'secondary'}
              size="xs"
              className="ai-code-btn"
              onClick={handleApply}
              title={`Apply snippet directly to ${displayFileName || activeFile}`}
              icon={applied ? <Check size={12} /> : <ArrowRightCircle size={12} />}
            >
              {applied
                ? `Applied${displayFileName ? ` to ${displayFileName}` : ''}`
                : `Apply${displayFileName ? ` to ${displayFileName}` : ''}`}
            </Button>
          )}
        </div>
      </div>
      <pre className="ai-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};
