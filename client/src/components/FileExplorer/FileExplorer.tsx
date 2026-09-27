import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import {
  FileCode,
  X,
  Check,
  FolderArchive,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  getFileIconColor,
  FILE_ICON_CSS_COLORS,
} from '../../utils/languageDetection';
import type { Collaborator } from '../../utils/collaborators';
import {
  exportProjectToZip,
  parseZipFile,
  importFilesToYjs,
  readLocalTextFile,
  importDirectFiles,
  type ZipParseResult,
  type ExtractedFile,
} from '../../utils/zipUtils';
import { ImportZipModal } from './ImportZipModal';
import { FileItem } from './FileItem';
import { FileExplorerToolbar } from './FileExplorerToolbar';

interface FileExplorerProps {
  doc: Y.Doc;
  awareness: Awareness;
  activeFile: string;
  onFileSelect: (fileName: string) => void;
  users: Collaborator[];
  canCreate?: boolean;
  canDelete?: boolean;
  canImport?: boolean;
  canExport?: boolean;
  onRequestPermission?: () => void;
}

interface ToastNotification {
  type: 'success' | 'error' | 'info';
  text: string;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  doc,
  awareness,
  activeFile,
  onFileSelect,
  users,
  canCreate = true,
  canDelete = true,
  canImport = true,
  canExport = true,
  onRequestPermission,
}) => {
  const [files, setFiles] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [createError, setCreateError] = useState('');
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [peerActiveFiles, setPeerActiveFiles] = useState<Map<number, string>>(new Map());

  // File I/O States
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [pendingZipResult, setPendingZipResult] = useState<ZipParseResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<any>(null);

  const filesMap = doc.getMap('files') as Y.Map<Y.Text>;

  const showToast = useCallback((type: 'success' | 'error' | 'info', text: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ type, text });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

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
    if (!canCreate) {
      showToast('error', 'You do not have permission to create files.');
      return;
    }

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
  }, [newFileName, filesMap, doc, onFileSelect, canCreate, showToast]);

  const handleDelete = useCallback(
    (fileName: string) => {
      if (!canDelete) {
        showToast('error', 'You do not have permission to delete files.');
        return;
      }

      if (filesMap.size <= 1) return; // Cannot delete last file

      doc.transact(() => {
        filesMap.delete(fileName);
      });

      setDeletingFile(null);

      // If we deleted the active file, switch to first remaining
      if (fileName === activeFile) {
        const remaining = Array.from(filesMap.keys()).filter((k) => k !== fileName);
        if (remaining.length > 0) {
          onFileSelect(remaining.sort()[0]);
        }
      }
    },
    [filesMap, doc, activeFile, onFileSelect, canDelete, showToast]
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

  /** Trigger ZIP Export */
  const handleExportZip = async () => {
    if (!canExport) {
      showToast('error', 'You do not have permission to export project files.');
      return;
    }

    if (filesMap.size === 0) {
      showToast('error', 'No files to export.');
      return;
    }

    try {
      setIsExporting(true);
      const res = await exportProjectToZip(filesMap, 'project');
      showToast('success', `Exported ${res.fileCount} files as ${res.fileName}`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to export ZIP.');
    } finally {
      setIsExporting(false);
    }
  };

  /** Process incoming uploaded or dropped files (single, multi-file, or ZIP) */
  const processIncomingFiles = async (fileList: FileList | File[]) => {
    if (!canImport) {
      showToast('error', 'You do not have permission to import files.');
      return;
    }

    const rawFiles = Array.from(fileList);
    if (rawFiles.length === 0) return;

    // Case 1: Single .zip archive -> open detailed preview modal
    if (rawFiles.length === 1 && (rawFiles[0].name.toLowerCase().endsWith('.zip') || rawFiles[0].type === 'application/zip')) {
      try {
        setIsProcessingFiles(true);
        const result = await parseZipFile(rawFiles[0]);
        setPendingZipResult(result);
      } catch (err: any) {
        showToast('error', err?.message || 'Could not extract ZIP file.');
      } finally {
        setIsProcessingFiles(false);
      }
      return;
    }

    // Case 2: One or more direct files (or mixed files + zips)
    try {
      setIsProcessingFiles(true);
      const extractedFiles: ExtractedFile[] = [];

      for (const file of rawFiles) {
        if (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip') {
          const zipResult = await parseZipFile(file);
          extractedFiles.push(...zipResult.files);
        } else {
          const directFile = await readLocalTextFile(file);
          extractedFiles.push(directFile);
        }
      }

      if (extractedFiles.length === 0) {
        showToast('error', 'No valid text files found.');
        return;
      }

      // Import files directly into Yjs map
      const res = importDirectFiles(doc, extractedFiles, 'merge');
      if (res.firstFileName) {
        onFileSelect(res.firstFileName);
      }

      if (extractedFiles.length === 1) {
        showToast('success', `Imported file "${extractedFiles[0].name}"`);
      } else {
        showToast('success', `Successfully imported ${extractedFiles.length} files!`);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to import files.');
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processIncomingFiles(e.target.files);
    }
    e.target.value = '';
  };

  /** Confirm and apply imported ZIP files from modal */
  const handleConfirmImport = (mode: 'replace' | 'merge') => {
    if (!pendingZipResult) return;
    if (!canImport) {
      showToast('error', 'Import permission required.');
      return;
    }

    try {
      const res = importFilesToYjs(doc, pendingZipResult.files, mode);
      setPendingZipResult(null);
      if (res.firstFileName) {
        onFileSelect(res.firstFileName);
      }
      showToast('success', `Successfully imported ${res.importedCount} files!`);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to populate files from ZIP.');
    }
  };

  /** Drag & Drop Handlers */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!canImport) {
      showToast('error', 'You do not have permission to import or drop files.');
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(e.dataTransfer.files);
    }
  };

  /** Toolbar callback: new file button */
  const handleNewFile = () => {
    if (!canCreate) {
      showToast('error', 'You need file creation permission to add files.');
      onRequestPermission?.();
      return;
    }
    setIsCreating(true);
    setCreateError('');
  };

  /** Toolbar callback: import button */
  const handleImportClick = () => {
    if (!canImport) {
      showToast('error', 'Import permission required to upload files.');
      onRequestPermission?.();
      return;
    }
    fileInputRef.current?.click();
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
    <div
      className={`file-explorer ${isDragOver ? 'fe-drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File Input for Direct Single/Multi-file & ZIP Upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Explorer Header */}
      <div className="fe-header">
        <span className="fe-title">EXPLORER</span>
        <FileExplorerToolbar
          canCreate={canCreate}
          canImport={canImport}
          canExport={canExport}
          isProcessingFiles={isProcessingFiles}
          isExporting={isExporting}
          hasFiles={files.length > 0}
          onNewFile={handleNewFile}
          onImport={handleImportClick}
          onExport={handleExportZip}
        />
      </div>

      {/* Toast Notification Alert */}
      {toast && (
        <div className={`fe-toast fe-toast-${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={13} />}
          {toast.type === 'error' && <AlertCircle size={13} />}
          {toast.type === 'info' && <FolderArchive size={13} />}
          <span className="fe-toast-text">{toast.text}</span>
          <button className="fe-toast-close" onClick={() => setToast(null)}>
            <X size={11} />
          </button>
        </div>
      )}

      {/* File List */}
      <div className="fe-file-list">
        {files.map((fileName) => {
          const iconColor = FILE_ICON_CSS_COLORS[getFileIconColor(fileName)];
          const peersOnFile = getPeersOnFile(fileName);
          return (
            <FileItem
              key={fileName}
              fileName={fileName}
              isActive={fileName === activeFile}
              isDeleting={deletingFile === fileName}
              iconColor={iconColor}
              peersOnFile={peersOnFile}
              canDelete={canDelete && filesMap.size > 1}
              onSelect={() => onFileSelect(fileName)}
              onDeleteStart={() => setDeletingFile(fileName)}
              onDeleteConfirm={() => handleDelete(fileName)}
              onDeleteCancel={() => setDeletingFile(null)}
            />
          );
        })}
      </div>

      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="fe-drop-overlay">
          <FolderArchive size={28} className="fe-drop-icon" />
          <span className="fe-drop-title">
            {canImport ? 'Drop Files or ZIP to Import' : 'Import Permission Required'}
          </span>
          <span className="fe-drop-hint">
            {canImport ? 'Adds & syncs files in real-time' : 'Ask room admin for import access'}
          </span>
        </div>
      )}

      {/* New file input */}
      {isCreating && canCreate && (
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

      {/* ZIP Import Preview & Strategy Modal */}
      {pendingZipResult && (
        <ImportZipModal
          parseResult={pendingZipResult}
          onConfirm={handleConfirmImport}
          onCancel={() => setPendingZipResult(null)}
        />
      )}
    </div>
  );
};
