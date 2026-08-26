import React, { useEffect, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import type { Awareness } from 'y-protocols/awareness';
import { injectCursorStyles } from '../../utils/cursorStyles';

interface CodeEditorProps {
  doc: Y.Doc | null;
  awareness: Awareness | null;
  language: string;
  onCursorChange?: (line: number, col: number) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  doc,
  awareness,
  language,
  onCursorChange,
}) => {
  const [editor, setEditor] = useState<any>(null);

  const handleEditorMount: OnMount = (editorInstance) => {
    setEditor(editorInstance);
    injectCursorStyles();

    editorInstance.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });
  };

  useEffect(() => {
    if (!editor || !doc || !awareness) return;

    injectCursorStyles();
    const yText = doc.getText('monaco');
    const model = editor.getModel();

    if (!model) return;

    // Initialize MonacoBinding between Y.Text, Monaco Model, and Awareness
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      awareness
    );

    return () => {
      binding.destroy();
    };
  }, [editor, doc, awareness]);

  return (
    <div className="editor-container">
      <Editor
        height="100%"
        language={language}
        theme="vs-dark"
        onMount={handleEditorMount}
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
          fontLigatures: true,
          minimap: { enabled: true, side: 'right' },
          automaticLayout: true,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          renderLineHighlight: 'all',
          tabSize: 2,
          scrollBeyondLastLine: false,
          bracketPairColorization: { enabled: true },
          padding: { top: 12, bottom: 12 },
          wordWrap: 'on',
        }}
        loading={
          <div className="editor-loading">
            <div className="spinner"></div>
            <span>Loading Monaco Editor...</span>
          </div>
        }
      />
    </div>
  );
};
