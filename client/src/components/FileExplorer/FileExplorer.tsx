import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { FileCode, Plus, Trash2, X, Check } from 'lucide-react';
import {
  getFileIconColor,
  FILE_ICON_CSS_COLORS,
} from '../../utils/languageDetection';
import type { Collaborator } from '../../utils/collaborators';

interface FileExplorerProps {
  doc: Y.Doc;
  awareness: Awareness;
  activeFile: string;
  onFileSelect: (fileName: string) => void;
  users: Collaborator[];
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  doc,
  awareness,
  activeFile,
  onFileSelect,
  users,
}) => {
  const [files, setFiles] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [createError, setCreateError] = useState('');
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [peerActiveFiles, setPeerActiveFiles] = useState<Map<number, string>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  const filesMap = doc.getMap('files');

  // Observe file map changes (files added / removed by any peer)
  useEffect(() => {
    const syncFiles = () => {
      const names = Array.from(filesMap.keys()).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );
      setFiles(names);
    };

    syncFiles();
    filesMap.observe(syncFiles);
    return () => filesMap.unobserve(syncFiles);
  }, [filesMap]);

  // Observe awareness for peer active files
  useEffect(() => {
    const syncPeerFiles = () => {
      const states = awareness.getStates();
      const map = new Map<number, string>();
      states.forEach((state, clientId) => {
        if (clientId !== doc.clientID && state.user && state.activeFile) {
          map.set(clientId, state.activeFile as string);
        }
      });
      setPeerActiveFiles(map);
    };

    syncPeerFiles();
    awareness.on('change', syncPeerFiles);
    return () => awareness.off('change', syncPeerFiles);
  }, [awareness, doc.clientID]);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  // If active file was deleted by another peer, switch to first available
  useEffect(() => {
    if (files.length > 0 && !files.includes(activeFile)) {
      onFileSelect(files[0]);
    }
  }, [files, activeFile, onFileSelect]);

  const handleCreate = useCallback(() => {
    const trimmed = newFileName.trim();
    if (!trimmed) {
      setCreateError('File name cannot be empty');
      return;
    }
    if (!/^[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+$/.test(trimmed)) {
      setCreateError('Use: name.ext (letters, numbers, _ , -)');
      return;
    }
    if (filesMap.has(trimmed)) {
      setCreateError('File already exists');
      return;
    }

    // Create new Y.Text within a single transaction
    doc.transact(() => {
      const newText = new Y.Text();
      filesMap.set(trimmed, newText);
    });

    setNewFileName('');
    setCreateError('');
    setIsCreating(false);
    onFileSelect(trimmed);
  }, [newFileName, filesMap, doc, onFileSelect]);

  const handleDelete = useCallback(
    (fileName: string) => {
      if (filesMap.size <= 1) return; // Cannot delete last file

      doc.transact(() => {
        filesMap.delete(fileName);
      });

      setDeletingFile(null);

      // If we deleted the active file, switch to first remaining
      if (fileName === activeFile) {
        const remaining = Array.from(filesMap.keys()).filter(
          (k) => k !== fileName
        );
        if (remaining.length > 0) {
          onFileSelect(remaining.sort()[0]);
        }
      }
    },
    [filesMap, doc, activeFile, onFileSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreate();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewFileName('');
      setCreateError('');
    }
  };

  /** Get peer avatars for a given file */
  const getPeersOnFile = (fileName: string) => {
    const peers: Collaborator[] = [];
    peerActiveFiles.forEach((file, clientId) => {
      if (file === fileName) {
        const user = users.find((u) => u.clientId === clientId && !u.isCurrentUser);
        if (user) peers.push(user);
      }
    });
    return peers;
  };

  return (
    <div className="file-explorer">
      <div className="fe-header">
        <span className="fe-title">EXPLORER</span>
        <button
          className="fe-btn-new"
          onClick={() => {
            setIsCreating(true);
            setCreateError('');
          }}
          title="New File"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="fe-file-list">
        {files.map((fileName) => {
          const isActive = fileName === activeFile;
          const isDeleting = deletingFile === fileName;
          const iconColor = FILE_ICON_CSS_COLORS[getFileIconColor(fileName)];
          const peersOnFile = getPeersOnFile(fileName);

          return (
            <div
              key={fileName}
              className={`fe-file-item ${isActive ? 'fe-file-active' : ''}`}
              onClick={() => onFileSelect(fileName)}
              title={fileName}
            >
              <div className="fe-file-info">
                <FileCode
                  size={14}
                  className="fe-file-icon"
                  style={{ color: iconColor }}
                />
                <span className="fe-file-name">{fileName}</span>
                {peersOnFile.length > 0 && (
                  <div className="fe-peer-dots">
                    {peersOnFile.slice(0, 3).map((peer) => (
                      <span
                        key={peer.clientId}
                        className="fe-peer-dot"
                        style={{ backgroundColor: peer.color }}
                        title={`${peer.name} is editing this file`}
                      />
                    ))}
                    {peersOnFile.length > 3 && (
                      <span className="fe-peer-overflow">
                        +{peersOnFile.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Delete controls */}
              {isDeleting ? (
                <div className="fe-delete-confirm" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="fe-btn-confirm-yes"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(fileName);
                    }}
                    title="Confirm delete"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    className="fe-btn-confirm-no"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingFile(null);
                    }}
                    title="Cancel"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                filesMap.size > 1 && (
                  <button
                    className="fe-btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingFile(fileName);
                    }}
                    title="Delete file"
                  >
                    <Trash2 size={12} />
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>

      {/* New file input */}
      {isCreating && (
        <div className="fe-new-file">
          <div className="fe-new-input-row">
            <FileCode size={14} className="fe-new-icon" />
            <input
              ref={inputRef}
              type="text"
              className={`fe-new-input ${createError ? 'fe-new-input-error' : ''}`}
              value={newFileName}
              onChange={(e) => {
                setNewFileName(e.target.value);
                setCreateError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="filename.ext"
              spellCheck={false}
            />
            <button className="fe-btn-create" onClick={handleCreate} title="Create">
              <Check size={13} />
            </button>
            <button
              className="fe-btn-cancel"
              onClick={() => {
                setIsCreating(false);
                setNewFileName('');
                setCreateError('');
              }}
              title="Cancel"
            >
              <X size={13} />
            </button>
          </div>
          {createError && <span className="fe-create-error">{createError}</span>}
        </div>
      )}
    </div>
  );
};
