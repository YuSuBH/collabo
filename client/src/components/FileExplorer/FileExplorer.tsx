import React from 'react';
import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import {
  getFileIconColor,
  FILE_ICON_CSS_COLORS,
} from '../../utils/languageDetection';
import type { Collaborator } from '../../utils/collaborators';
import { useFileExplorer } from '../../hooks/useFileExplorer';
import { ImportZipModal } from './ImportZipModal';
import { FileItem } from './FileItem';
import { FileExplorerToolbar } from './FileExplorerToolbar';
import { FileExplorerToast } from './FileExplorerToast';
import { FileExplorerDropOverlay } from './FileExplorerDropOverlay';
import { NewFileInput } from './NewFileInput';

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
  const {
    files,
    filesCount,
    isCreating,
    newFileName,
    setNewFileName,
    createError,
    setCreateError,
    deletingFile,
    setDeletingFile,
    isExporting,
    isProcessingFiles,
    pendingZipResult,
    setPendingZipResult,
    isDragOver,
    toast,
    setToast,
    fileInputRef,
    handleCreate,
    handleCancelCreate,
    handleDelete,
    handleExportZip,
    handleFileInputChange,
    handleConfirmImport,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleNewFile,
    handleImportClick,
    getPeersOnFile,
  } = useFileExplorer({
    doc,
    awareness,
    activeFile,
    onFileSelect,
    canCreate,
    canDelete,
    canImport,
    canExport,
    onRequestPermission,
  });

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
      {toast && <FileExplorerToast toast={toast} onClose={() => setToast(null)} />}

      {/* File List */}
      <div className="fe-file-list">
        {files.map((fileName) => {
          const iconColor = FILE_ICON_CSS_COLORS[getFileIconColor(fileName)];
          const peersOnFile = getPeersOnFile(fileName, users);
          return (
            <FileItem
              key={fileName}
              fileName={fileName}
              isActive={fileName === activeFile}
              isDeleting={deletingFile === fileName}
              iconColor={iconColor}
              peersOnFile={peersOnFile}
              canDelete={canDelete && filesCount > 1}
              onSelect={() => onFileSelect(fileName)}
              onDeleteStart={() => setDeletingFile(fileName)}
              onDeleteConfirm={() => handleDelete(fileName)}
              onDeleteCancel={() => setDeletingFile(null)}
            />
          );
        })}
      </div>

      {/* Drag & Drop Visual Overlay */}
      {isDragOver && <FileExplorerDropOverlay canImport={canImport} />}

      {/* New file input */}
      {isCreating && canCreate && (
        <NewFileInput
          fileName={newFileName}
          createError={createError}
          onChange={(val) => {
            setNewFileName(val);
            setCreateError('');
          }}
          onCreate={handleCreate}
          onCancel={handleCancelCreate}
        />
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
