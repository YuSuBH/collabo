import React, { useEffect, useRef } from 'react';
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

const DEFAULT_STARTER_CODE = `// 🚀 Welcome to Collaborative CodeSync!
// Open this same URL in another browser tab to experience real-time sync & remote cursors.

interface User {
  id: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
}

function greetCollaborator(user: User): string {
  return \`👋 Hello \${user.name}, you are currently editing with live CRDT sync!\`;
}

console.log(greetCollaborator({ id: '1', name: 'Collaborator', role: 'editor' }));
`;

export const CodeEditor: React.FC<CodeEditorProps> = ({
  doc,
  awareness,
  language,
  onCursorChange,
}) => {
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const handleEditorMount: OnMount = (editor, _monaco) => {
    editorRef.current = editor;
    injectCursorStyles();

    if (doc && awareness) {
      const yText = doc.getText('monaco');

      // Populate starter template if text is completely empty
      if (yText.length === 0 && doc.getMap('meta').get('initialized') !== true) {
        doc.getMap('meta').set('initialized', true);
        yText.insert(0, DEFAULT_STARTER_CODE);
      }

      const model = editor.getModel();
      if (model) {
        bindingRef.current = new MonacoBinding(
          yText,
          model,
          new Set([editor]),
          awareness
        );
      }
    }

    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });
  };

  useEffect(() => {
    if (!editorRef.current || !doc || !awareness) return;

    // Destroy existing binding if any
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    const yText = doc.getText('monaco');
    const model = editorRef.current.getModel();
    if (model) {
      bindingRef.current = new MonacoBinding(
        yText,
        model,
        new Set([editorRef.current]),
        awareness
      );
    }

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [doc, awareness]);

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
