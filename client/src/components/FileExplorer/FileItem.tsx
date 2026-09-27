import React from 'react';
import { FileCode, Check, X, Trash2 } from 'lucide-react';
import type { Collaborator } from '../../utils/collaborators';

interface FileItemProps {
  fileName: string;
  isActive: boolean;
  isDeleting: boolean;
  iconColor: string;
  /** Peer collaborators currently viewing/editing this file. */
  peersOnFile: Collaborator[];
  /**
   * Combined flag: true when the user has delete permission
   * AND this is not the last remaining file.
   */
  canDelete: boolean;
  onSelect: () => void;
  onDeleteStart: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  fileName,
  isActive,
  isDeleting,
  iconColor,
  peersOnFile,
  canDelete,
  onSelect,
  onDeleteStart,
  onDeleteConfirm,
  onDeleteCancel,
}) => {
  return (
    <div
      className={`fe-file-item ${isActive ? 'fe-file-active' : ''}`}
      onClick={onSelect}
      title={fileName}
    >
      <div className="fe-file-info">
        <FileCode size={14} className="fe-file-icon" style={{ color: iconColor }} />
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
              <span className="fe-peer-overflow">+{peersOnFile.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Delete controls */}
      {isDeleting ? (
        <div className="fe-delete-confirm" onClick={(e) => e.stopPropagation()}>
          <button
            className="fe-btn-confirm-yes"
            onClick={(e) => { e.stopPropagation(); onDeleteConfirm(); }}
            title="Confirm delete"
          >
            <Check size={12} />
          </button>
          <button
            className="fe-btn-confirm-no"
            onClick={(e) => { e.stopPropagation(); onDeleteCancel(); }}
            title="Cancel"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        canDelete && (
          <button
            className="fe-btn-delete"
            onClick={(e) => { e.stopPropagation(); onDeleteStart(); }}
            title="Delete file"
          >
            <Trash2 size={12} />
          </button>
        )
      )}
    </div>
  );
};
