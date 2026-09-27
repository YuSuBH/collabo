import React from 'react';
import { X, CheckCircle2, AlertCircle, FolderArchive } from 'lucide-react';

export interface ToastNotification {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface FileExplorerToastProps {
  toast: ToastNotification;
  onClose: () => void;
}

export const FileExplorerToast: React.FC<FileExplorerToastProps> = ({ toast, onClose }) => {
  return (
    <div className={`fe-toast fe-toast-${toast.type}`}>
      {toast.type === 'success' && <CheckCircle2 size={13} />}
      {toast.type === 'error' && <AlertCircle size={13} />}
      {toast.type === 'info' && <FolderArchive size={13} />}
      <span className="fe-toast-text">{toast.text}</span>
      <button className="fe-toast-close" onClick={onClose} title="Dismiss notification">
        <X size={11} />
      </button>
    </div>
  );
};
