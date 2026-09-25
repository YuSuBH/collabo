import React, { useState } from 'react';
import {
  X,
  Shield,
  Crown,
  FileCode,
  PlusSquare,
  Trash2,
  Upload,
  Play,
  Download,
  Users,
  Check,
  Sparkles,
  ArrowRightLeft,
} from 'lucide-react';
import type { Collaborator } from '../../utils/collaborators';
import type {
  UserPermissions,
  UserRole,
} from '../../types/permissions';
import {
  PERMISSION_LABELS,
  ROLE_PRESETS,
  getRoleFromPermissions,
} from '../../types/permissions';
import { RoleBadge } from './PermissionBadges';

interface ManagePermissionsModalProps {
  users: Collaborator[];
  allUserPermissions: Map<string, UserPermissions>;
  currentUserId: string;
  isOwner: boolean;
  onUpdatePermissions: (targetUserId: string, targetUserName: string, permissions: UserPermissions) => void;
  onTransferOwnership: (targetUserId: string, targetUserName: string) => void;
  onClose: () => void;
  initialSelectedUserId?: string;
}

export const ManagePermissionsModal: React.FC<ManagePermissionsModalProps> = ({
  users,
  allUserPermissions,
  currentUserId,
  isOwner,
  onUpdatePermissions,
  onTransferOwnership,
  onClose,
  initialSelectedUserId,
}) => {
  // Pick default user to edit (exclude current user if others exist, or pick initial)
  const defaultUser =
    users.find((u) => u.id === initialSelectedUserId) ||
    users.find((u) => u.id !== currentUserId) ||
    users[0];

  const [selectedUserId, setSelectedUserId] = useState<string>(defaultUser?.id || '');
  const selectedCollaborator = users.find((u) => u.id === selectedUserId);

  const currentPermsForUser: UserPermissions =
    allUserPermissions.get(selectedUserId) || ROLE_PRESETS.viewer;

  const [editedPerms, setEditedPerms] = useState<UserPermissions>(currentPermsForUser);
  const [hasChanges, setHasChanges] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);

  // When user selection changes, reset draft permissions
  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    const perms = allUserPermissions.get(userId) || ROLE_PRESETS.viewer;
    setEditedPerms(perms);
    setHasChanges(false);
    setShowTransferConfirm(false);
  };

  const handlePresetSelect = (preset: Exclude<UserRole, 'custom' | 'owner'>) => {
    setEditedPerms(ROLE_PRESETS[preset]);
    setHasChanges(true);
  };

  const handleToggle = (key: keyof UserPermissions) => {
    setEditedPerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!selectedCollaborator) return;
    onUpdatePermissions(selectedCollaborator.id, selectedCollaborator.name, editedPerms);
    setHasChanges(false);
  };

  const handleConfirmTransfer = () => {
    if (!selectedCollaborator) return;
    onTransferOwnership(selectedCollaborator.id, selectedCollaborator.name);
    setShowTransferConfirm(false);
    onClose();
  };

  const currentRole = getRoleFromPermissions(editedPerms);

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
        className="modal-container perm-manage-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="modal-title">Manage Permissions & Roles</h2>
              <p className="modal-subtitle">
                Configure access levels for room members in real-time.
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="perm-manage-layout">
          {/* Left Column: Members List */}
          <div className="perm-members-sidebar">
            <div className="perm-members-header">ROOM MEMBERS ({users.length})</div>
            <div className="perm-members-list">
              {users.map((user) => {
                const isSelected = user.id === selectedUserId;
                const userPerms = allUserPermissions.get(user.id) || ROLE_PRESETS.viewer;
                const userRole = getRoleFromPermissions(userPerms);

                return (
                  <button
                    key={user.clientId}
                    type="button"
                    className={`perm-member-item ${isSelected ? 'perm-member-item-active' : ''}`}
                    onClick={() => handleSelectUser(user.id)}
                  >
                    <div
                      className="collaborator-avatar"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="perm-member-info">
                      <div className="perm-member-name-row">
                        <span className="perm-member-name">{user.name}</span>
                        {user.id === currentUserId && (
                          <span className="collaborator-tag">You</span>
                        )}
                      </div>
                      <RoleBadge role={userRole} size="sm" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Permission Details & Editor */}
          <div className="perm-details-panel">
            {selectedCollaborator ? (
              <>
                <div className="perm-selected-user-card">
                  <div
                    className="collaborator-avatar perm-avatar-lg"
                    style={{ backgroundColor: selectedCollaborator.color }}
                  >
                    {selectedCollaborator.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="perm-selected-info">
                    <div className="perm-selected-name-row">
                      <h3 className="perm-selected-name">{selectedCollaborator.name}</h3>
                      <RoleBadge role={currentRole} size="md" />
                    </div>
                    <span className="perm-selected-client-id">
                      User ID: {selectedCollaborator.id}
                    </span>
                  </div>
                </div>

                {/* Preset Roles Row */}
                <div className="perm-section-label">Quick Role Preset</div>
                <div className="perm-role-presets">
                  <button
                    type="button"
                    className={`perm-role-btn ${currentRole === 'admin' ? 'perm-role-btn-active' : ''}`}
                    onClick={() => handlePresetSelect('admin')}
                  >
                    <Shield size={14} />
                    <span>Admin</span>
                  </button>
                  <button
                    type="button"
                    className={`perm-role-btn ${currentRole === 'editor' ? 'perm-role-btn-active' : ''}`}
                    onClick={() => handlePresetSelect('editor')}
                  >
                    <Sparkles size={14} />
                    <span>Editor</span>
                  </button>
                  <button
                    type="button"
                    className={`perm-role-btn ${currentRole === 'viewer' ? 'perm-role-btn-active' : ''}`}
                    onClick={() => handlePresetSelect('viewer')}
                  >
                    <Users size={14} />
                    <span>Viewer</span>
                  </button>
                </div>

                {/* Granular Permission Toggles */}
                <div className="perm-section-label">Granular Access Permissions</div>
                <div className="perm-grid perm-grid-compact">
                  {(Object.keys(PERMISSION_LABELS) as Array<keyof UserPermissions>).map(
                    (key) => {
                      const isChecked = editedPerms[key];
                      const info = PERMISSION_LABELS[key];

                      return (
                        <div
                          key={key}
                          className={`perm-toggle-item ${isChecked ? 'perm-toggle-checked' : ''}`}
                          onClick={() => handleToggle(key)}
                        >
                          <div className="perm-item-left">
                            <div className="perm-item-icon">{getPermissionIcon(key)}</div>
                            <div>
                              <span className="perm-item-title">{info.label}</span>
                              <span className="perm-item-desc">{info.description}</span>
                            </div>
                          </div>

                          <div
                            className={`perm-checkbox ${isChecked ? 'perm-checkbox-active' : ''}`}
                          >
                            {isChecked && <Check size={12} />}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Transfer Ownership Section (Host Only) */}
                {isOwner && selectedCollaborator.id !== currentUserId && (
                  <div className="perm-transfer-section">
                    {showTransferConfirm ? (
                      <div className="perm-transfer-confirm-box">
                        <span className="perm-transfer-warn-text">
                          Transfer Room Host role to <strong>{selectedCollaborator.name}</strong>? They will have full administrative control.
                        </span>
                        <div className="perm-transfer-actions">
                          <button
                            type="button"
                            className="btn-danger-sm"
                            onClick={handleConfirmTransfer}
                          >
                            Yes, Transfer Ownership
                          </button>
                          <button
                            type="button"
                            className="btn-secondary-sm"
                            onClick={() => setShowTransferConfirm(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="btn-transfer-ownership"
                        onClick={() => setShowTransferConfirm(true)}
                      >
                        <Crown size={14} className="text-amber-400" />
                        <ArrowRightLeft size={14} />
                        <span>Transfer Room Ownership to {selectedCollaborator.name}</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="perm-no-selection">
                <Users size={32} />
                <span>Select a collaborator to configure permissions.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Check size={14} />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
