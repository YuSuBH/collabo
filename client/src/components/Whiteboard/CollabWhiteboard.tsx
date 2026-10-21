import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import {
  Tldraw,
  createTLStore,
  defaultShapeUtils,
  getSvgAsImage,
  type Editor,
  type TLRecord,
} from 'tldraw';
import type { UserPresence } from '../../utils/collaborators';
import { Button } from '../common';
import { Download } from 'lucide-react';
import 'tldraw/tldraw.css';

interface CollabWhiteboardProps {
  doc: Y.Doc | null;
  awareness: Awareness | null;
  currentUser?: UserPresence;
  isReadOnly?: boolean;
}

const isDocumentRecord = (record: TLRecord): boolean =>
  record.typeName === 'document' ||
  record.typeName === 'page' ||
  record.typeName === 'shape' ||
  record.typeName === 'binding' ||
  record.typeName === 'asset';

export function CollabWhiteboard({
  doc,
  awareness,
  currentUser,
  isReadOnly = false,
}: CollabWhiteboardProps) {
  // The store must be replaced when the room's root document changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => createTLStore({ shapeUtils: defaultShapeUtils }), [doc]);
  const isRemoteUpdateRef = useRef(false);
  const editorRef = useRef<Editor | null>(null);
  const whiteboardRef = useRef<HTMLDivElement | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<
    Array<{ clientId: number; name: string; color: string; x: number; y: number }>
  >([]);

  const syncRemoteCursors = useCallback(() => {
    const editor = editorRef.current;
    const container = whiteboardRef.current;
    if (!editor || !container || !awareness) return;

    const canvas = container.querySelector('.tl-canvas');
    if (!(canvas instanceof HTMLElement)) return;
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const cursors: Array<{ clientId: number; name: string; color: string; x: number; y: number }> = [];

    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID || !state.whiteboardCursor || !state.user) return;
      const screenPoint = editor.pageToScreen(state.whiteboardCursor);
      cursors.push({
        clientId,
        name: state.user.name,
        color: state.user.color,
        x: canvasRect.left - containerRect.left + screenPoint.x,
        y: canvasRect.top - containerRect.top + screenPoint.y,
      });
    });
    setRemoteCursors(cursors);
  }, [awareness]);

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const editor = editorRef.current;
      const container = whiteboardRef.current;
      if (!editor || !container || !awareness) return;

      const canvas = container.querySelector('.tl-canvas');
      if (!(canvas instanceof HTMLElement)) return;
      const rect = canvas.getBoundingClientRect();
      const pagePoint = editor.screenToPage({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      awareness.setLocalStateField('whiteboardCursor', pagePoint);
    },
    [awareness]
  );

  useEffect(() => {
    if (!doc) return;

    const yShapes = doc.getMap<TLRecord>('whiteboard-shapes');
    let hasInitialized = false;

    const applyRecords = () => {
      const records = Array.from(yShapes.values()).filter(isDocumentRecord);
      isRemoteUpdateRef.current = true;
      store.mergeRemoteChanges(() => {
        const currentIds = new Set(
          store.allRecords().filter(isDocumentRecord).map((record) => record.id)
        );
        const incomingIds = new Set(records.map((record) => record.id));
        const removedIds = [...currentIds].filter((id) => !incomingIds.has(id));

        if (removedIds.length > 0) {
          store.remove(removedIds);
        }
        if (records.length > 0) {
          store.put(records);
        }
      });
      isRemoteUpdateRef.current = false;
    };

    if (yShapes.size === 0) {
      doc.transact(() => {
        store.allRecords().filter(isDocumentRecord).forEach((record) => {
          yShapes.set(record.id, record);
        });
      });
    } else {
      applyRecords();
    }
    hasInitialized = true;

    const handleYjsChange = (event: Y.YMapEvent<TLRecord>) => {
      if (event.transaction.local) return;
      applyRecords();
    };

    yShapes.observe(handleYjsChange);

    const removeStoreListener = store.listen(
      (entry) => {
        if (isRemoteUpdateRef.current) return;
        if (!hasInitialized) return;

        const records = [
          ...Object.values(entry.changes.added),
          ...Object.values(entry.changes.updated).map(([, to]) => to),
        ].filter(isDocumentRecord);
        const removedIds = Object.values(entry.changes.removed)
          .filter(isDocumentRecord)
          .map((record) => record.id);

        doc.transact(() => {
          records.forEach((record) => yShapes.set(record.id, record));
          removedIds.forEach((id) => yShapes.delete(id));
        });
      },
      { source: 'user', scope: 'document' }
    );

    return () => {
      yShapes.unobserve(handleYjsChange);
      removeStoreListener();
    };
  }, [doc, store]);

  useEffect(() => {
    if (!awareness) return;
    const handleAwarenessChange = () => syncRemoteCursors();
    awareness.on('change', handleAwarenessChange);
    syncRemoteCursors();
    return () => {
      awareness.off('change', handleAwarenessChange);
      awareness.setLocalStateField('whiteboardCursor', null);
    };
  }, [awareness, syncRemoteCursors]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateInstanceState({ isReadonly: isReadOnly });
    }
  }, [isReadOnly]);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      syncRemoteCursors();
      editor.updateInstanceState({ isReadonly: isReadOnly });
      if (currentUser) {
        editor.user.updateUserPreferences({
          name: currentUser.name,
          color: currentUser.color,
        });
      }
    },
    [currentUser, isReadOnly, syncRemoteCursors]
  );

  const handleExport = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const shapes = editor.getCurrentPageShapes();
    const svgExport = await editor.getSvgString(shapes);
    if (!svgExport) return;

    const svgBlob = new Blob([svgExport.svg], { type: 'image/svg+xml' });
    const pngBlob = await getSvgAsImage(svgExport.svg, {
      type: 'png',
      width: svgExport.width,
      height: svgExport.height,
    });

    const download = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    };

    download(svgBlob, 'collabo-whiteboard.svg');
    if (pngBlob) {
      download(pngBlob, 'collabo-whiteboard.png');
    }
  }, []);

  if (!doc) {
    return <div className="whiteboard-container whiteboard-loading">Connecting to whiteboard...</div>;
  }

  return (
    <div
      ref={whiteboardRef}
      className="whiteboard-container"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => awareness?.setLocalStateField('whiteboardCursor', null)}
    >
      <div className="whiteboard-controls">
        <Button
          variant="ghost"
          size="sm"
          icon={<Download size={14} />}
          onClick={() => void handleExport()}
          title="Export whiteboard as PNG and SVG"
          aria-label="Export whiteboard as PNG and SVG"
        >
          Export PNG/SVG
        </Button>
      </div>
      <Tldraw key={doc.clientID} store={store} onMount={handleMount} />
      <div className="whiteboard-remote-cursors" aria-hidden="true">
        {remoteCursors.map((cursor) => (
          <div
            key={cursor.clientId}
            className="whiteboard-remote-cursor"
            style={{ left: cursor.x, top: cursor.y, color: cursor.color }}
          >
            <span className="whiteboard-remote-cursor-pointer" />
            <span className="whiteboard-remote-cursor-label" style={{ backgroundColor: cursor.color }}>
              {cursor.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
