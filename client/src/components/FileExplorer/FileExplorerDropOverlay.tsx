import React from 'react';
import { FolderArchive } from 'lucide-react';

interface FileExplorerDropOverlayProps {
  canImport: boolean;
}

export const FileExplorerDropOverlay: React.FC<FileExplorerDropOverlayProps> = ({ canImport }) => {
  return (
    <div className="fe-drop-overlay">
      <FolderArchive size={28} className="fe-drop-icon" />
      <span className="fe-drop-title">
        {canImport ? 'Drop Files or ZIP to Import' : 'Import Permission Required'}
      </span>
      <span className="fe-drop-hint">
        {canImport ? 'Adds & syncs files in real-time' : 'Ask room admin for import access'}
      </span>
    </div>
  );
};
