import React, { useState } from 'react';
import {
  X,
  Send,
  Shield,
  FileCode,
  PlusSquare,
  Trash2,
  Upload,
  Play,
  Download,
  Users,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import type {
  UserPermissions,
  PermissionRequest,
} from '../../types/permissions';
import { PERMISSION_LABELS } from '../../types/permissions';

interface PermissionRequestModalProps {
  currentPermissions: UserPermissions;
  userPendingRequest: PermissionRequest | null;
  onRequestSubmit: (permissions: Partial<UserPermissions>, note?: string) => void;
  onCancelRequest: () => void;
  onClose: () => void;
}

export const PermissionRequestModal: React.FC<PermissionRequestModalProps> = ({
  currentPermissions,
  userPendingRequest,
  onRequestSubmit,
  onCancelRequest,
  onClose,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'editor' | 'admin' | 'custom'>(
    'editor'
  );
  const [requestedPerms, setRequestedPerms] = useState<Record<keyof UserPermissions, boolean>>({
    edit: true,
    create: true,
    delete: true,
    import: true,
    execute: currentPermissions.execute,
    export: currentPermissions.export,
    managePermissions: false,
  });
  const [note, setNote] = useState(userPendingRequest?.note || '');

  const handlePresetSelect = (preset: 'editor' | 'admin' | 'custom') => {
    setSelectedPreset(preset);
    if (preset === 'editor') {
      setRequestedPerms({
        edit: true,
        create: true,
        delete: true,
        import: true,
        execute: true,
        export: true,
        managePermissions: false,
      });
    } else if (preset === 'admin') {
      setRequestedPerms({
        edit: true,
        create: true,
        delete: true,
        import: true,
        execute: true,
        export: true,
        managePermissions: true,
      });
    }
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setSelectedPreset('custom');
    setRequestedPerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestSubmit(requestedPerms, note);
    onClose();
  };

  const getPermissionIcon = (key: keyof UserPermissions) => {
    switch (key) {
      case 'edit':
        return <FileCode size={15} />;
      case 'create':
        return <PlusSquare size={15} />;
      case 'delete':
        return <Trash2 size={15} />;
      case 'import':
        return <Upload size={15} />;
      case 'execute':
        return <Play size={15} />;
      case 'export':
        return <Download size={15} />;
      case 'managePermissions':
        return <Users size={15} />;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container perm-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="modal-title">Request Permissions</h2>
              <p className="modal-subtitle">
                Ask the room administrator to grant you additional workspace access.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Existing Pending Request Notice */}
        {userPendingRequest && (
          <div className="perm-pending-banner">
            <Clock size={16} className="text-amber-400" />
            <div className="perm-pending-info">
              <span className="perm-pending-title">You have a pending request</span>
              <span className="perm-pending-sub">
                Submitted {new Date(userPendingRequest.timestamp).toLocaleTimeString()} — you can update or withdraw it below.
              </span>
            </div>
            <button
              type="button"
              className="btn-text-danger"
              onClick={() => {
                onCancelRequest();
                onClose();
              }}
            >
              Withdraw Request
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Preset Buttons */}
          <div className="perm-presets-row">
            <button
              type="button"
              className={`perm-preset-card ${selectedPreset === 'editor' ? 'perm-preset-active' : ''}`}
              onClick={() => handlePresetSelect('editor')}
            >
              <div className="perm-preset-header">
                <Sparkles size={16} />
                <span className="perm-preset-name">Editor Access</span>
              </div>
              <span className="perm-preset-desc">
                Full edit, create, delete, and import permissions.
              </span>
            </button>

            <button
              type="button"
              className={`perm-preset-card ${selectedPreset === 'admin' ? 'perm-preset-active' : ''}`}
              onClick={() => handlePresetSelect('admin')}
            >
              <div className="perm-preset-header">
                <Shield size={16} />
                <span className="perm-preset-name">Admin Access</span>
              </div>
              <span className="perm-preset-desc">
                Full access + ability to manage and grant permissions to others.
              </span>
            </button>
          </div>

          {/* Granular Permission Toggles */}
          <div className="perm-section-label">Permissions to Request</div>
          <div className="perm-grid">
            {(Object.keys(PERMISSION_LABELS) as Array<keyof UserPermissions>).map((key) => {
              const isAlreadyGranted = currentPermissions[key];
              const isChecked = requestedPerms[key];
              const info = PERMISSION_LABELS[key];

              return (
                <div
                  key={key}
                  className={`perm-toggle-item ${isChecked ? 'perm-toggle-checked' : ''} ${
                    isAlreadyGranted ? 'perm-toggle-granted' : ''
                  }`}
                  onClick={() => handleTogglePermission(key)}
                >
                  <div className="perm-item-left">
                    <div className="perm-item-icon">{getPermissionIcon(key)}</div>
                    <div>
                      <div className="perm-item-title-row">
                        <span className="perm-item-title">{info.label}</span>
                        {isAlreadyGranted && (
                          <span className="perm-tag-granted">Already Active</span>
                        )}
                      </div>
                      <span className="perm-item-desc">{info.description}</span>
                    </div>
                  </div>

                  <div className={`perm-checkbox ${isChecked ? 'perm-checkbox-active' : ''}`}>
                    {isChecked && <Check size={12} />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optional Message / Reason */}
          <div className="perm-field-group">
            <label className="perm-field-label" htmlFor="perm-note-input">
              Note for Administrator (Optional)
            </label>
            <input
              id="perm-note-input"
              type="text"
              className="perm-input-text"
              placeholder="e.g., Working on the authentication module..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Send size={14} />
              <span>{userPendingRequest ? 'Update Request' : 'Send Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
