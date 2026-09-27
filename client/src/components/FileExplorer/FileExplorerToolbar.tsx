import React from 'react';
import { Plus, Upload, Download, Lock, Loader2 } from 'lucide-react';

interface FileExplorerToolbarProps {
  canCreate: boolean;
  canImport: boolean;
  canExport: boolean;
  isProcessingFiles: boolean;
  isExporting: boolean;
  hasFiles: boolean;
  /** Called when the New File button is clicked (caller handles permission toasting). */
  onNewFile: () => void;
  /** Called when the Import button is clicked (caller handles permission toasting). */
  onImport: () => void;
  onExport: () => void;
}

export const FileExplorerToolbar: React.FC<FileExplorerToolbarProps> = ({
  canCreate,
  canImport,
  canExport,
  isProcessingFiles,
  isExporting,
  hasFiles,
  onNewFile,
  onImport,
  onExport,
}) => {
  return (
    <div className="fe-header-actions">
      {/* New File */}
      <button
        className={`fe-btn-icon ${!canCreate ? 'fe-btn-icon-disabled' : ''}`}
        onClick={onNewFile}
        title={canCreate ? 'New File' : 'File creation permission required'}
      >
        {canCreate ? <Plus size={14} /> : <Lock size={12} />}
      </button>

      {/* Import Single/Multi Files or ZIP */}
      <button
        className={`fe-btn-icon ${!canImport ? 'fe-btn-icon-disabled' : ''}`}
        onClick={onImport}
        title={canImport ? 'Import File(s) or ZIP Archive' : 'Import permission required'}
        disabled={isProcessingFiles}
      >
        {isProcessingFiles ? (
          <Loader2 size={13} className="spin" />
        ) : canImport ? (
          <Upload size={13} />
        ) : (
          <Lock size={12} />
        )}
      </button>

      {/* Export ZIP */}
      <button
        className={`fe-btn-icon ${!canExport ? 'fe-btn-icon-disabled' : ''}`}
        onClick={onExport}
        title={canExport ? 'Export Project as ZIP' : 'Export permission required'}
        disabled={isExporting || !hasFiles}
      >
        {isExporting ? (
          <Loader2 size={13} className="spin" />
        ) : canExport ? (
          <Download size={13} />
        ) : (
          <Lock size={12} />
        )}
      </button>
    </div>
  );
};
