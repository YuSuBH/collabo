import React, { useEffect, useState, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import * as Y from 'yjs';
import { MonacoBinding } from '../../utils/yMonacoBinding';
import type { Awareness } from 'y-protocols/awareness';
import { injectCursorStyles, startCursorColorObserver } from '../../utils/cursorStyles';
import { getLanguageFromFileName } from '../../utils/languageDetection';
import { PermissionBanner } from '../Permissions/PermissionBanner';
import type { PermissionRequest, UserPermissions } from '../../types/permissions';

interface CodeEditorProps {
  doc: Y.Doc | null;
  awareness: Awareness | null;
  activeFile: string;
  isSynced?: boolean;
  roomId?: string;
  canEdit?: boolean;
  userPendingRequest?: PermissionRequest | null;
  onRequestPermissions?: (permissions: Partial<UserPermissions>, note?: string) => void;
  onCancelRequest?: () => void;
  onCursorChange?: (line: number, col: number) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  doc,
  awareness,
  activeFile,
  isSynced = false,
  roomId = 'default',
  canEdit = true,
  userPendingRequest = null,
  onRequestPermissions,
  onCancelRequest,
  onCursorChange,
}) => {
  const [editor, setEditor] = useState<any>(null);
  const [currentYText, setCurrentYText] = useState<Y.Text | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const observerCleanupRef = useRef<(() => void) | null>(null);

  const handleEditorMount: OnMount = (editorInstance, monacoInstance) => {
    (window as any).monaco = monacoInstance || monaco;
    setEditor(editorInstance);

    editorInstance.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });
  };

  // 1. Observe filesMap for activeFile to ensure currentYText is always valid and up-to-date
  useEffect(() => {
    if (!doc || !activeFile) {
      setCurrentYText(null);
      return;
    }

    const filesMap = doc.getMap('files');

    const updateYText = () => {
      const text = filesMap.get(activeFile) as Y.Text | undefined;
      setCurrentYText(text || null);
    };

    updateYText();
    filesMap.observe(updateYText);
    return () => {
      filesMap.unobserve(updateYText);
    };
  }, [doc, activeFile]);

  // 2. Re-bind whenever activeFile, editor, doc, awareness, currentYText, or roomId change
  useEffect(() => {
    if (!editor || !doc || !awareness || !activeFile || !currentYText) return;

    injectCursorStyles();

    const language = getLanguageFromFileName(activeFile);
    const monacoApi = (window as any).monaco || monaco;
    if (!monacoApi) return;

    // Use a unique URI scoped by roomId and activeFile
    const uri = monacoApi.Uri.parse(`inmemory://room/${roomId}/${activeFile}`);
    let model = monacoApi.editor.getModel(uri);
    if (!model) {
      model = monacoApi.editor.createModel(currentYText.toString(), language, uri);
    } else {
      monacoApi.editor.setModelLanguage(model, language);
    }

    editor.setModel(model);

    // Create the MonacoBinding between Y.Text and the model
    const binding = new MonacoBinding(
      currentYText,
      model,
      new Set([editor]),
      awareness,
      activeFile
    );
    bindingRef.current = binding;

    // Start cursor color observer
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
  }, [editor, doc, awareness, activeFile, currentYText, roomId]);

  // Dynamically toggle readOnly mode in Monaco editor instance
  useEffect(() => {
    if (editor) {
      editor.updateOptions({
        readOnly: !canEdit,
        domReadOnly: !canEdit,
      });
    }
  }, [editor, canEdit]);

  return (
    <div className="editor-container">
      {/* Read-Only Status & Request Action Banner - only show once synced */}
      {isSynced && !canEdit && (
        <PermissionBanner
          canEdit={canEdit}
          userPendingRequest={userPendingRequest}
          onRequestPermissions={(perms, note) => onRequestPermissions?.(perms, note)}
          onCancelRequest={() => onCancelRequest?.()}
        />
      )}

      <div className="monaco-editor-wrapper">
        {(!isSynced || !currentYText) && (
          <div className="editor-loading-overlay">
            <div className="spinner"></div>
            <span>{!isSynced ? 'Connecting to room...' : 'Loading file...'}</span>
          </div>
        )}

        <Editor
          height="100%"
          language={getLanguageFromFileName(activeFile)}
          theme="vs-dark"
          onMount={handleEditorMount}
          options={{
            readOnly: !canEdit,
            domReadOnly: !canEdit,
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
    </div>
  );
};
