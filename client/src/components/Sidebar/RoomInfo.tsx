import React, { useState } from 'react';
import {
  Copy,
  Check,
  Radio,
  Share2,
  Shield,
  Sparkles,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  FileCode,
  PlusSquare,
  Trash2,
  Upload,
  Play,
  Download,
  Send,
  X,
  UserX,
} from 'lucide-react';
import type { Collaborator, UserPresence } from '../../utils/collaborators';
import type {
  UserPermissions,
  UserRole,
  PermissionRequest,
} from '../../types/permissions';
import { getRoleFromPermissions, ROLE_PRESETS } from '../../types/permissions';
import { RoleBadge } from '../Permissions/PermissionBadges';
import { ManagePermissionsModal } from '../Permissions/ManagePermissionsModal';
import { KickConfirmModal } from '../Permissions/KickConfirmModal';
import { Button } from '../common';

interface RoomInfoProps {
  roomId: string;
  users: Collaborator[];
  currentUser: UserPresence;
  permissions: UserPermissions;
  role: UserRole;
  canManagePermissions: boolean;
  allUserPermissions: Map<string, UserPermissions>;
  pendingRequests: PermissionRequest[];
  userPendingRequest: PermissionRequest | null;
  onRequestPermissions: (perms: Partial<UserPermissions>, note?: string) => void;
  onCancelRequest: () => void;
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onUpdateUserPermissions: (targetUserId: string, targetUserName: string, perms: UserPermissions) => void;
  onKickUser: (targetUserId: string, targetUserName: string, reason?: string) => void;
}

export const RoomInfo: React.FC<RoomInfoProps> = ({
  roomId,
  users,
  currentUser,
  permissions,
  role,
  canManagePermissions,
  allUserPermissions,
  pendingRequests,
  userPendingRequest,
  onRequestPermissions,
  onCancelRequest,
  onApproveRequest,
  onRejectRequest,
  onUpdateUserPermissions,
  onKickUser,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [targetUserIdToEdit, setTargetUserIdToEdit] = useState<string | undefined>(undefined);
  const [userToKick, setUserToKick] = useState<{
    id: string;
    name: string;
    color: string;
    role?: UserRole;
  } | null>(null);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyInviteLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openManageForUser = (userId: string) => {
    if (!canManagePermissions) return;
    setTargetUserIdToEdit(userId);
    setIsManageModalOpen(true);
  };

  return (
    <div className="room-info-panel">
      {/* Header */}
      <div className="fe-header">
        <span className="fe-title">ROOM INFO</span>
        {canManagePermissions && (
          <Button
            variant="ghost"
            size="xs"
            iconOnly
            className="fe-btn-icon"
            onClick={() => {
              setTargetUserIdToEdit(undefined);
              setIsManageModalOpen(true);
            }}
            title="Manage Permissions & Roles"
            aria-label="Manage Permissions & Roles"
            icon={<SlidersHorizontal size={13} />}
          />
        )}
      </div>

      <div className="room-info-body">
        {/* Room Card */}
        <div className="room-card">
          <div className="room-card-row">
            <div className="room-card-label">
              <Radio size={14} className="room-card-icon" />
              <span>Room ID</span>
            </div>
            <span className="room-card-id">{roomId}</span>
          </div>

          <div className="room-card-actions">
            <Button
              variant={copiedId ? 'success' : 'secondary'}
              size="sm"
              className="btn-room-action"
              onClick={handleCopyRoomId}
              title="Copy Room ID"
              icon={copiedId ? <Check size={13} /> : <Copy size={13} />}
            >
              {copiedId ? 'Copied ID' : 'Copy ID'}
            </Button>

            <Button
              variant={copiedLink ? 'success' : 'secondary'}
              size="sm"
              className="btn-room-action"
              onClick={handleCopyInviteLink}
              title="Copy Invite Link"
              icon={copiedLink ? <Check size={13} /> : <Share2 size={13} />}
            >
              {copiedLink ? 'Copied Link' : 'Share Link'}
            </Button>
          </div>
        </div>

        {/* Pending Requests Section (For Admins) */}
        {canManagePermissions && pendingRequests.length > 0 && (
          <div className="perm-requests-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-title text-amber-400">
                PENDING REQUESTS ({pendingRequests.length})
              </span>
            </div>

            <div className="perm-requests-list">
              {pendingRequests.map((req) => (
                <div key={req.id} className="perm-request-card">
                  <div className="perm-request-header">
                    <div className="perm-request-user">
                      <div
                        className="collaborator-avatar perm-avatar-xs"
                        style={{ backgroundColor: req.userColor }}
                      >
                        {req.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="perm-request-name">{req.userName}</span>
                    </div>
                    <span className="perm-request-time">
                      <Clock size={11} />
                      {new Date(req.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {req.note && (
                    <p className="perm-request-note">"{req.note}"</p>
                  )}

                  <div className="perm-request-badges">
                    {req.permissions.edit && <span className="perm-chip">Edit Code</span>}
                    {req.permissions.create && <span className="perm-chip">Create Files</span>}
                    {req.permissions.delete && <span className="perm-chip">Delete Files</span>}
                    {req.permissions.import && <span className="perm-chip">Import Files</span>}
                    {req.permissions.managePermissions && (
                      <span className="perm-chip perm-chip-admin">Manage Permissions</span>
                    )}
                  </div>

                  <div className="perm-request-actions">
                    <Button
                      variant="success"
                      size="xs"
                      onClick={() => onApproveRequest(req.id)}
                      title="Approve permissions"
                      icon={<CheckCircle2 size={13} />}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => onRejectRequest(req.id)}
                      title="Decline request"
                      icon={<XCircle size={13} />}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Collaborators Section */}
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">MEMBERS ({users.length})</span>
          {canManagePermissions && (
            <Button
              variant="ghost"
              size="xs"
              className="sidebar-link-btn"
              onClick={() => setIsManageModalOpen(true)}
            >
              Manage
            </Button>
          )}
        </div>

        <div className="collaborators-list">
          {users.map((user) => {
            const userPerms = allUserPermissions.get(user.id) || ROLE_PRESETS.viewer;
            const userRole = getRoleFromPermissions(userPerms);
            const canBeKicked = canManagePermissions && !user.isCurrentUser && !userPerms.managePermissions;

            return (
              <div
                key={user.clientId}
                className={`collaborator-item ${
                  user.isCurrentUser ? 'collaborator-item-current' : ''
                } ${canManagePermissions ? 'collaborator-item-clickable' : ''}`}
                onClick={() => canManagePermissions && openManageForUser(user.id)}
                title={canManagePermissions ? `Click to configure permissions for ${user.name}` : undefined}
              >
                <div
                  className="collaborator-avatar"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <div className="collaborator-details">
                  <div className="collaborator-name-row">
                    <span className="collaborator-name">{user.name}</span>
                    {user.isCurrentUser && (
                      <span className="collaborator-tag">You</span>
                    )}
                    <RoleBadge role={userRole} size="sm" />
                  </div>
                  <span className="collaborator-status">
                    <span
                      className="collaborator-status-dot"
                      style={{ backgroundColor: user.color }}
                    />
                    Online
                  </span>
                </div>

                {/* Quick Kick Action Button for Admins on Non-Admin Members */}
                {canBeKicked && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    iconOnly
                    className="btn-member-kick"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserToKick({
                        id: user.id,
                        name: user.name,
                        color: user.color,
                        role: userRole,
                      });
                    }}
                    title={`Kick ${user.name} from room`}
                    aria-label={`Kick ${user.name}`}
                    icon={<UserX size={13} />}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Current User Profile Summary & Permissions Breakdown */}
        <div className="sidebar-section-header" style={{ marginTop: 'auto' }}>
          <span className="sidebar-section-title">YOUR ACCESS LEVEL</span>
        </div>

        <div className="current-user-card">
          <div className="current-user-header-row">
            <div
              className="collaborator-avatar"
              style={{ backgroundColor: currentUser.color }}
            >
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="current-user-info">
              <span className="current-user-name">{currentUser.name}</span>
              <RoleBadge role={role} size="sm" />
            </div>
          </div>

          {/* Granular Permission Checklist */}
          <div className="current-user-perms-grid">
            <span className={`perm-mini-pill ${permissions.edit ? 'perm-mini-pill-active' : ''}`}>
              <FileCode size={10} />
              <span>Edit</span>
            </span>
            <span className={`perm-mini-pill ${permissions.create ? 'perm-mini-pill-active' : ''}`}>
              <PlusSquare size={10} />
              <span>Create</span>
            </span>
            <span className={`perm-mini-pill ${permissions.delete ? 'perm-mini-pill-active' : ''}`}>
              <Trash2 size={10} />
              <span>Delete</span>
            </span>
            <span className={`perm-mini-pill ${permissions.import ? 'perm-mini-pill-active' : ''}`}>
              <Upload size={10} />
              <span>Import</span>
            </span>
            <span className={`perm-mini-pill ${permissions.execute ? 'perm-mini-pill-active' : ''}`}>
              <Play size={10} />
              <span>Run</span>
            </span>
            <span className={`perm-mini-pill ${permissions.export ? 'perm-mini-pill-active' : ''}`}>
              <Download size={10} />
              <span>Export</span>
            </span>
            <span className={`perm-mini-pill ${permissions.managePermissions ? 'perm-mini-pill-active' : ''}`}>
              <Shield size={10} />
              <span>Admin</span>
            </span>
          </div>

          {/* Request Button or Pending Indicator */}
          {!canManagePermissions && (
            <div className="current-user-actions">
              {userPendingRequest ? (
                <div className="perm-pending-box">
                  <Clock size={12} className="text-amber-400" />
                  <span>Request Pending...</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="btn-link-cancel"
                    onClick={() => onCancelRequest()}
                    title="Cancel request"
                  >
                    Cancel
                  </Button>
                </div>
              ) : isRequesting ? (
                <div className="perm-sidebar-inline-form">
                  <input
                    type="text"
                    className="perm-sidebar-input"
                    placeholder="Add a note (optional)..."
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    maxLength={100}
                    autoFocus
                  />
                  <div className="perm-sidebar-actions">
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        setIsRequesting(false);
                        setRequestNote('');
                      }}
                      icon={<X size={11} />}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="xs"
                      onClick={() => {
                        onRequestPermissions(ROLE_PRESETS.editor, requestNote.trim() || undefined);
                        setIsRequesting(false);
                        setRequestNote('');
                      }}
                      icon={<Send size={11} />}
                    >
                      Send Request
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => setIsRequesting(true)}
                  icon={<Sparkles size={13} />}
                >
                  Request Edit Access
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manage Permissions Modal */}
      {isManageModalOpen && (
        <ManagePermissionsModal
          users={users}
          allUserPermissions={allUserPermissions}
          currentUserId={currentUser.id}
          onUpdatePermissions={onUpdateUserPermissions}
          onKickUser={onKickUser}
          onClose={() => setIsManageModalOpen(false)}
          initialSelectedUserId={targetUserIdToEdit}
        />
      )}

      {/* Direct Member Kick Confirm Modal */}
      {userToKick && (
        <KickConfirmModal
          isOpen={Boolean(userToKick)}
          targetUser={userToKick}
          onConfirm={(targetId, targetName, reason) => {
            onKickUser(targetId, targetName, reason);
            setUserToKick(null);
          }}
          onClose={() => setUserToKick(null)}
        />
      )}
    </div>
  );
};
