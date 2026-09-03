import * as Y from 'yjs';
import * as monaco from 'monaco-editor';
import { createMutex } from 'lib0/mutex';
import type { Awareness } from 'y-protocols/awareness';

class RelativeSelection {
  start: Y.RelativePosition;
  end: Y.RelativePosition;
  direction: any;

  constructor(start: Y.RelativePosition, end: Y.RelativePosition, direction: any) {
    this.start = start;
    this.end = end;
    this.direction = direction;
  }
}

/**
 * Creates relative selection from Monaco editor selection.
 * Uses assoc = -1 when offset is 0 so that an empty file anchors to position 0
 * rather than resolving to type._length (the end of the text).
 */
const createRelativeSelection = (
  editor: any,
  monacoModel: any,
  type: Y.Text
): RelativeSelection | null => {
  const sel = editor.getSelection();
  if (sel !== null) {
    const startPos = sel.getStartPosition();
    const endPos = sel.getEndPosition();
    const startOffset = monacoModel.getOffsetAt(startPos);
    const endOffset = monacoModel.getOffsetAt(endPos);

    const start = Y.createRelativePositionFromTypeIndex(
      type,
      startOffset,
      startOffset === 0 ? -1 : 0
    );
    const end = Y.createRelativePositionFromTypeIndex(
      type,
      endOffset,
      endOffset === 0 ? -1 : 0
    );
    return new RelativeSelection(start, end, sel.getDirection());
  }
  return null;
};

const createMonacoSelectionFromRelativeSelection = (
  editor: any,
  type: Y.Text,
  relSel: RelativeSelection,
  doc: Y.Doc
) => {
  const start = Y.createAbsolutePositionFromRelativePosition(relSel.start, doc);
  const end = Y.createAbsolutePositionFromRelativePosition(relSel.end, doc);
  if (start !== null && end !== null && start.type === type && end.type === type) {
    const model = editor.getModel();
    if (!model) return null;
    const startPos = model.getPositionAt(start.index);
    const endPos = model.getPositionAt(end.index);
    return monaco.Selection.createWithDirection(
      startPos.lineNumber,
      startPos.column,
      endPos.lineNumber,
      endPos.column,
      relSel.direction
    );
  }
  return null;
};

/**
 * Enhanced MonacoBinding for Yjs with proper empty-file cursor anchoring,
 * activeFile scoping, and blur/focus cursor cleanup.
 */
export class MonacoBinding {
  doc: Y.Doc;
  ytext: Y.Text;
  monacoModel: any;
  editors: Set<any>;
  awareness: Awareness | null;
  activeFileName?: string;

  private mux: ReturnType<typeof createMutex>;
  private _savedSelections: Map<any, RelativeSelection>;
  private _decorations: Map<any, string[]>;
  private _beforeTransaction: () => void;
  private _rerenderDecorations: () => void;
  private _ytextObserver: (event: Y.YTextEvent) => void;
  private _monacoChangeHandler: any;
  private _monacoDisposeHandler: any;
  private _cursorListeners: Array<{ dispose: () => void }> = [];

  constructor(
    ytext: Y.Text,
    monacoModel: any,
    editors: Set<any> = new Set(),
    awareness: Awareness | null = null,
    activeFileName?: string
  ) {
    this.doc = ytext.doc as Y.Doc;
    this.ytext = ytext;
    this.monacoModel = monacoModel;
    this.editors = editors;
    this.awareness = awareness;
    this.activeFileName = activeFileName;
    this.mux = createMutex();
    this._savedSelections = new Map();
    this._decorations = new Map();

    this._beforeTransaction = () => {
      this.mux(() => {
        this._savedSelections = new Map();
        editors.forEach((editor) => {
          if (editor.getModel() === monacoModel) {
            const rsel = createRelativeSelection(editor, monacoModel, ytext);
            if (rsel !== null) {
              this._savedSelections.set(editor, rsel);
            }
          }
        });
      });
    };
    this.doc.on('beforeAllTransactions', this._beforeTransaction);

    this._rerenderDecorations = () => {
      editors.forEach((editor) => {
        if (this.awareness && editor.getModel() === monacoModel) {
          const currentDecorations = this._decorations.get(editor) || [];
          const newDecorations: any[] = [];
          if (!monaco?.Range) return;

          this.awareness.getStates().forEach((state: any, clientID: number) => {
            // Guard: ONLY render cursors from peers who are currently on the exact same activeFile
            if (this.activeFileName && state.activeFile !== this.activeFileName) {
              return;
            }

            if (
              clientID !== this.doc.clientID &&
              state.selection != null &&
              state.selection.anchor != null &&
              state.selection.head != null
            ) {
              const anchorAbs = Y.createAbsolutePositionFromRelativePosition(
                state.selection.anchor,
                this.doc
              );
              const headAbs = Y.createAbsolutePositionFromRelativePosition(
                state.selection.head,
                this.doc
              );

              if (
                anchorAbs !== null &&
                headAbs !== null &&
                anchorAbs.type === ytext &&
                headAbs.type === ytext
              ) {
                let start: any;
                let end: any;
                let afterContentClassName: string | null = null;
                let beforeContentClassName: string | null = null;

                if (anchorAbs.index < headAbs.index) {
                  start = monacoModel.getPositionAt(anchorAbs.index);
                  end = monacoModel.getPositionAt(headAbs.index);
                  afterContentClassName =
                    'yRemoteSelectionHead yRemoteSelectionHead-' + clientID;
                } else {
                  start = monacoModel.getPositionAt(headAbs.index);
                  end = monacoModel.getPositionAt(anchorAbs.index);
                  beforeContentClassName =
                    'yRemoteSelectionHead yRemoteSelectionHead-' + clientID;
                }

                newDecorations.push({
                  range: new monaco.Range(
                    start.lineNumber,
                    start.column,
                    end.lineNumber,
                    end.column
                  ),
                  options: {
                    className: 'yRemoteSelection yRemoteSelection-' + clientID,
                    afterContentClassName,
                    beforeContentClassName,
                  },
                });
              }
            }
          });

          this._decorations.set(
            editor,
            editor.deltaDecorations(currentDecorations, newDecorations)
          );
        } else {
          this._decorations.delete(editor);
        }
      });
    };

    this._ytextObserver = (event: Y.YTextEvent) => {
      this.mux(() => {
        let index = 0;
        event.delta.forEach((op: any) => {
          if (op.retain !== undefined) {
            index += op.retain;
          } else if (op.insert !== undefined) {
            const pos = monacoModel.getPositionAt(index);
            const range = new monaco.Selection(
              pos.lineNumber,
              pos.column,
              pos.lineNumber,
              pos.column
            );
            const insert = op.insert as string;
            monacoModel.applyEdits([{ range, text: insert }]);
            index += insert.length;
          } else if (op.delete !== undefined) {
            const pos = monacoModel.getPositionAt(index);
            const endPos = monacoModel.getPositionAt(index + op.delete);
            const range = new monaco.Selection(
              pos.lineNumber,
              pos.column,
              endPos.lineNumber,
              endPos.column
            );
            monacoModel.applyEdits([{ range, text: '' }]);
          }
        });

        this._savedSelections.forEach((rsel, editor) => {
          const sel = createMonacoSelectionFromRelativeSelection(
            editor,
            ytext,
            rsel,
            this.doc
          );
          if (sel !== null) {
            editor.setSelection(sel);
          }
        });
      });
      this._rerenderDecorations();
    };

    ytext.observe(this._ytextObserver);

    const ytextValue = ytext.toString();
    if (monacoModel.getValue() !== ytextValue) {
      monacoModel.setValue(ytextValue);
    }

    this._monacoChangeHandler = monacoModel.onDidChangeContent((event: any) => {
      this.mux(() => {
        this.doc.transact(() => {
          const changes = [...event.changes].sort(
            (a, b) => b.rangeOffset - a.rangeOffset
          );
          changes.forEach((change) => {
            ytext.delete(change.rangeOffset, change.rangeLength);
            ytext.insert(change.rangeOffset, change.text);
          });
        }, this);
      });
    });

    this._monacoDisposeHandler = monacoModel.onWillDispose(() => {
      this.destroy();
    });

    if (awareness) {
      editors.forEach((editor) => {
        const updateSelection = () => {
          if (editor.getModel() !== monacoModel) return;

          // Only broadcast selection if editor actually has active text focus
          if (!editor.hasTextFocus()) {
            awareness.setLocalStateField('selection', null);
            return;
          }

          const sel = editor.getSelection();
          if (sel === null) {
            awareness.setLocalStateField('selection', null);
            return;
          }

          let anchor = monacoModel.getOffsetAt(sel.getStartPosition());
          let head = monacoModel.getOffsetAt(sel.getEndPosition());
          if (sel.getDirection() === 1 /* SelectionDirection.RTL */) {
            const tmp = anchor;
            anchor = head;
            head = tmp;
          }

          // Key fix: use assoc = -1 when offset is 0 so position 0 stays pinned to index 0 on empty files
          awareness.setLocalStateField('selection', {
            anchor: Y.createRelativePositionFromTypeIndex(
              ytext,
              anchor,
              anchor === 0 ? -1 : 0
            ),
            head: Y.createRelativePositionFromTypeIndex(
              ytext,
              head,
              head === 0 ? -1 : 0
            ),
          });
        };

        const cursorSub = editor.onDidChangeCursorSelection(() => {
          updateSelection();
        });
        this._cursorListeners.push(cursorSub);

        const focusSub = editor.onDidFocusEditorText(() => {
          updateSelection();
        });
        this._cursorListeners.push(focusSub);

        // Clear selection when editor loses focus so idle users don't leave phantom cursors
        const blurSub = editor.onDidBlurEditorText(() => {
          awareness.setLocalStateField('selection', null);
        });
        this._cursorListeners.push(blurSub);

        const blurWidgetSub = editor.onDidBlurEditorWidget(() => {
          awareness.setLocalStateField('selection', null);
        });
        this._cursorListeners.push(blurWidgetSub);

        awareness.on('change', this._rerenderDecorations);
      });
    }
  }

  destroy() {
    this._monacoChangeHandler?.dispose?.();
    this._monacoDisposeHandler?.dispose?.();
    this._cursorListeners.forEach((l) => l.dispose?.());
    this._cursorListeners = [];
    this.ytext.unobserve(this._ytextObserver);
    this.doc.off('beforeAllTransactions', this._beforeTransaction);
    if (this.awareness) {
      this.awareness.off('change', this._rerenderDecorations);
      this.awareness.setLocalStateField('selection', null);
    }
  }
}
