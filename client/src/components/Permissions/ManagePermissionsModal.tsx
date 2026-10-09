import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  FileCode,
  PlusSquare,
  Trash2,
  Upload,
  Play,
  Download,
  Users,
  Check,
  Sparkles,
  CheckCircle2,
  UserX,
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
import { KickConfirmModal } from './KickConfirmModal';
import { Button } from '../common';

interface ManagePermissionsModalProps {
  users: Collaborator[];
  allUserPermissions: Map<string, UserPermissions>;
  currentUserId: string;
  onUpdatePermissions: (targetUserId: string, targetUserName: string, permissions: UserPermissions) => void;
  onKickUser?: (targetUserId: string, targetUserName: string, reason?: string) => void;
  onClose: () => void;
  initialSelectedUserId?: string;
}

export const ManagePermissionsModal: React.FC<ManagePermissionsModalProps> = ({
  users,
  allUserPermissions,
  currentUserId,
  onUpdatePermissions,
  onKickUser,
  onClose,
  initialSelectedUserId,
}) => {
  // Pick default user to edit (exclude current user if others exist, or pick initial)
  const defaultUser =
    users.find((u) => u.id === initialSelectedUserId) ||
    users.find((u) => u.id !== currentUserId) ||
    users[0];

  const [selectedUserId, setSelectedUserId] = useState<string>(
    initialSelectedUserId || defaultUser?.id || ''
  );
  const selectedCollaborator = users.find((u) => u.id === selectedUserId);

  const currentPermsForUser: UserPermissions =
    allUserPermissions.get(selectedUserId) || ROLE_PRESETS.viewer;

  const [editedPerms, setEditedPerms] = useState<UserPermissions>(currentPermsForUser);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isKickConfirmOpen, setIsKickConfirmOpen] = useState(false);

  useEffect(() => {
    if (initialSelectedUserId) {
      setSelectedUserId(initialSelectedUserId);
      const perms = allUserPermissions.get(initialSelectedUserId) || ROLE_PRESETS.viewer;
      setEditedPerms(perms);
      setHasChanges(false);
    }
  }, [initialSelectedUserId]);

  // When user selection changes, reset draft permissions
  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    const perms = allUserPermissions.get(userId) || ROLE_PRESETS.viewer;
    setEditedPerms(perms);
    setHasChanges(false);
    setSavedSuccess(false);
  };

  const handlePresetSelect = (preset: Exclude<UserRole, 'custom'>) => {
    setEditedPerms(ROLE_PRESETS[preset]);
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const handleToggle = (key: keyof UserPermissions) => {
    setEditedPerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
    setSavedSuccess(false);
  };

  const handleSave = () => {
    if (!selectedCollaborator) return;
    onUpdatePermissions(selectedCollaborator.id, selectedCollaborator.name, editedPerms);
    setHasChanges(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
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
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onClose}
            aria-label="Close"
            icon={<X size={18} />}
          />
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
                  <Button
                    key={user.clientId}
                    type="button"
                    variant="ghost"
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
                  </Button>
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
                      Member: {selectedCollaborator.name}
                    </span>
                  </div>
                </div>

                {/* Preset Roles Row */}
                <div className="perm-section-label">Quick Role Preset</div>
                <div className="perm-role-presets">
                  <Button
                    type="button"
                    variant={currentRole === 'admin' ? 'primary' : 'secondary'}
                    size="sm"
                    className="perm-role-btn"
                    active={currentRole === 'admin'}
                    onClick={() => handlePresetSelect('admin')}
                    icon={<Shield size={14} />}
                  >
                    Admin
                  </Button>
                  <Button
                    type="button"
                    variant={currentRole === 'editor' ? 'primary' : 'secondary'}
                    size="sm"
                    className="perm-role-btn"
                    active={currentRole === 'editor'}
                    onClick={() => handlePresetSelect('editor')}
                    icon={<Sparkles size={14} />}
                  >
                    Editor
                  </Button>
                  <Button
                    type="button"
                    variant={currentRole === 'viewer' ? 'primary' : 'secondary'}
                    size="sm"
                    className="perm-role-btn"
                    active={currentRole === 'viewer'}
                    onClick={() => handlePresetSelect('viewer')}
                    icon={<Users size={14} />}
                  >
                    Viewer
                  </Button>
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

                {/* Danger Zone: Kick Member (Only visible for non-admin collaborators) */}
                {selectedCollaborator.id !== currentUserId &&
                  !allUserPermissions.get(selectedCollaborator.id)?.managePermissions &&
                  !editedPerms.managePermissions &&
                  onKickUser && (
                    <div className="perm-kick-section">
                      <div className="perm-section-label">Danger Zone</div>
                      <div className="perm-kick-card">
                        <div className="perm-kick-info">
                          <span className="perm-kick-title">Kick Member</span>
                          <span className="perm-kick-desc">
                            Remove {selectedCollaborator.name} from the active room session.
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="danger"
                          size="xs"
                          onClick={() => setIsKickConfirmOpen(true)}
                          icon={<UserX size={12} />}
                        >
                          Kick Member
                        </Button>
                      </div>
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
          {savedSuccess && (
            <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1 mr-auto" style={{ color: '#34d399' }}>
              <CheckCircle2 size={14} />
              <span>Permissions applied successfully!</span>
            </span>
          )}
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={!hasChanges}
            icon={<Check size={14} />}
          >
            Apply Changes
          </Button>
        </div>
      </div>

      {/* Kick Confirmation Modal */}
      {isKickConfirmOpen && selectedCollaborator && onKickUser && (
        <KickConfirmModal
          isOpen={isKickConfirmOpen}
          targetUser={{
            id: selectedCollaborator.id,
            name: selectedCollaborator.name,
            color: selectedCollaborator.color,
            role: currentRole,
          }}
          onConfirm={(targetId, targetName, reason) => {
            onKickUser(targetId, targetName, reason);
            setIsKickConfirmOpen(false);
            onClose();
          }}
          onClose={() => setIsKickConfirmOpen(false)}
        />
      )}
    </div>
  );
};
