import React from 'react';
import { Plus, Upload, Download, Lock, Loader2 } from 'lucide-react';
import { Button } from '../common';

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
      <Button
        variant="ghost"
        size="xs"
        iconOnly
        className="fe-btn-icon"
        onClick={onNewFile}
        title={canCreate ? 'New File' : 'File creation permission required'}
        aria-label="New File"
        icon={canCreate ? <Plus size={14} /> : <Lock size={12} />}
      />

      {/* Import Single/Multi Files or ZIP */}
      <Button
        variant="ghost"
        size="xs"
        iconOnly
        className="fe-btn-icon"
        onClick={onImport}
        title={canImport ? 'Import File(s) or ZIP Archive' : 'Import permission required'}
        aria-label="Import Files"
        disabled={isProcessingFiles}
        icon={
          isProcessingFiles ? (
            <Loader2 size={13} className="spin" />
          ) : canImport ? (
            <Upload size={13} />
          ) : (
            <Lock size={12} />
          )
        }
      />

      {/* Export ZIP */}
      <Button
        variant="ghost"
        size="xs"
        iconOnly
        className="fe-btn-icon"
        onClick={onExport}
        title={canExport ? 'Export Project as ZIP' : 'Export permission required'}
        aria-label="Export Project"
        disabled={isExporting || !hasFiles}
        icon={
          isExporting ? (
            <Loader2 size={13} className="spin" />
          ) : canExport ? (
            <Download size={13} />
          ) : (
            <Lock size={12} />
          )
        }
      />
    </div>
  );
};

