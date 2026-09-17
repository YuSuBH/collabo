import React, { useEffect, useState, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import * as Y from 'yjs';
import { MonacoBinding } from '../../utils/yMonacoBinding';
import type { Awareness } from 'y-protocols/awareness';
import { injectCursorStyles, startCursorColorObserver } from '../../utils/cursorStyles';
import { getLanguageFromFileName } from '../../utils/languageDetection';

interface CodeEditorProps {
  doc: Y.Doc | null;
  awareness: Awareness | null;
  activeFile: string;
  onCursorChange?: (line: number, col: number) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  doc,
  awareness,
  activeFile,
  onCursorChange,
}) => {
  const [editor, setEditor] = useState<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const observerCleanupRef = useRef<(() => void) | null>(null);

  const handleEditorMount: OnMount = (editorInstance, monacoInstance) => {
    (window as any).monaco = monacoInstance || monaco;
    setEditor(editorInstance);

    editorInstance.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });
  };

  // Re-bind whenever activeFile, editor, doc, or awareness change
  useEffect(() => {
    if (!editor || !doc || !awareness || !activeFile) return;

    injectCursorStyles();

    // Get the Y.Text for the active file from the files map
    const filesMap = doc.getMap('files');
    let yText = filesMap.get(activeFile) as Y.Text | undefined;

    // If the file doesn't exist in the map yet (shouldn't happen, but be safe)
    if (!yText) {
      doc.transact(() => {
        yText = new Y.Text();
        filesMap.set(activeFile, yText);
      });
      yText = filesMap.get(activeFile) as Y.Text;
    }

    if (!yText) return;

    const language = getLanguageFromFileName(activeFile);

    // Get the Monaco instance and create a fresh model for this file
    const monacoApi = (window as any).monaco || monaco;
    if (!monacoApi) return;

    // Dispose the old model if there is one
    const oldModel = editor.getModel();

    // Create a new model with the correct language
    // Use a unique URI so Monaco doesn't complain about duplicates
    const uri = monacoApi.Uri.parse(`file:///${activeFile}`);
    let model = monacoApi.editor.getModel(uri);
    if (!model) {
      // Create with empty string — MonacoBinding will sync the content from Y.Text
      model = monacoApi.editor.createModel('', language, uri);
    } else {
      // Model exists, just update language
      monacoApi.editor.setModelLanguage(model, language);
    }

    editor.setModel(model);

    // Dispose old model if it's a different one and not used elsewhere
    if (oldModel && oldModel !== model && oldModel.uri.toString() !== model.uri.toString()) {
      // Don't dispose — other editors might reference it. Monaco GCs unused models.
    }

    // Create the MonacoBinding between Y.Text and the new model with activeFile passed
    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      awareness,
      activeFile
    );
    bindingRef.current = binding;

    // Start the cursor color observer
    const editorDom = editor.getDomNode();
    let stopObserver: (() => void) | undefined;
    if (editorDom) {
      stopObserver = startCursorColorObserver(editorDom, awareness);
      observerCleanupRef.current = stopObserver;
    }

    return () => {
      stopObserver?.();
      observerCleanupRef.current = null;
      binding.destroy();
      bindingRef.current = null;
      if (awareness) {
        awareness.setLocalStateField('selection', null);
      }
    };
  }, [editor, doc, awareness, activeFile]);

  return (
    <div className="editor-container">
      <Editor
        height="100%"
        language={getLanguageFromFileName(activeFile)}
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
