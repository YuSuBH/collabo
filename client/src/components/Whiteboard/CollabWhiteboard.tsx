import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as Y from 'yjs';
import {
  Tldraw,
  createTLStore,
  defaultShapeUtils,
  getSvgAsImage,
  type Editor,
  type TLRecord,
  type TLShape,
} from 'tldraw';
import type { UserPresence } from '../../utils/collaborators';
import { Button } from '../common';
import { Download } from 'lucide-react';
import 'tldraw/tldraw.css';

interface CollabWhiteboardProps {
  doc: Y.Doc | null;
  currentUser?: UserPresence;
  isReadOnly?: boolean;
}

const isShapeRecord = (record: TLRecord): record is TLShape => record.typeName === 'shape';

export function CollabWhiteboard({
  doc,
  currentUser,
  isReadOnly = false,
}: CollabWhiteboardProps) {
  // The store must be replaced when the room's root document changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => createTLStore({ shapeUtils: defaultShapeUtils }), [doc]);
  const isRemoteUpdateRef = useRef(false);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    if (!doc) return;

    const yShapes = doc.getMap<TLRecord>('whiteboard-shapes');

    const applyRecords = () => {
      const records = Array.from(yShapes.values()).filter(isShapeRecord);
      isRemoteUpdateRef.current = true;
      store.mergeRemoteChanges(() => {
        const currentIds = new Set(store.query.records('shape').get().map((record) => record.id));
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

    applyRecords();

    const handleYjsChange = (event: Y.YMapEvent<TLRecord>) => {
      if (event.transaction.local) return;
      applyRecords();
    };

    yShapes.observe(handleYjsChange);

    const removeStoreListener = store.listen(
      (entry) => {
        if (isRemoteUpdateRef.current) return;

        const records = [
          ...Object.values(entry.changes.added),
          ...Object.values(entry.changes.updated).map(([, to]) => to),
        ].filter(isShapeRecord);
        const removedIds = Object.keys(entry.changes.removed);

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
    if (editorRef.current) {
      editorRef.current.updateInstanceState({ isReadonly: isReadOnly });
    }
  }, [isReadOnly]);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      editor.updateInstanceState({ isReadonly: isReadOnly });
      if (currentUser) {
        editor.user.updateUserPreferences({
          name: currentUser.name,
          color: currentUser.color,
        });
      }
    },
    [currentUser, isReadOnly]
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
    <div className="whiteboard-container">
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
    </div>
  );
}
