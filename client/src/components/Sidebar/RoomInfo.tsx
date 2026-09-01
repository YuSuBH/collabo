import React, { useState } from 'react';
import { Copy, Check, Radio, Share2, Shield } from 'lucide-react';
import type { Collaborator, UserPresence } from '../../utils/collaborators';

interface RoomInfoProps {
  roomId: string;
  users: Collaborator[];
  currentUser: UserPresence;
}

export const RoomInfo: React.FC<RoomInfoProps> = ({
  roomId,
  users,
  currentUser,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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

  return (
    <div className="room-info-panel">
      {/* Header */}
      <div className="fe-header">
        <span className="fe-title">ROOM INFO</span>
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
            <button
              onClick={handleCopyRoomId}
              className={`btn-room-action ${copiedId ? 'btn-room-action-success' : ''}`}
              title="Copy Room ID"
            >
              {copiedId ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedId ? 'Copied ID' : 'Copy ID'}</span>
            </button>

            <button
              onClick={handleCopyInviteLink}
              className={`btn-room-action ${copiedLink ? 'btn-room-action-success' : ''}`}
              title="Copy Invite Link"
            >
              {copiedLink ? <Check size={13} /> : <Share2 size={13} />}
              <span>{copiedLink ? 'Copied Link' : 'Share Link'}</span>
            </button>
          </div>
        </div>

        {/* Active Collaborators Section */}
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">MEMBERS ({users.length})</span>
        </div>

        <div className="collaborators-list">
          {users.map((user) => (
            <div
              key={user.clientId}
              className={`collaborator-item ${user.isCurrentUser ? 'collaborator-item-current' : ''}`}
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
                </div>
                <span className="collaborator-status">
                  <span
                    className="collaborator-status-dot"
                    style={{ backgroundColor: user.color }}
                  />
                  Online
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Current User Profile Summary */}
        <div className="sidebar-section-header" style={{ marginTop: 'auto' }}>
          <span className="sidebar-section-title">YOUR PROFILE</span>
        </div>
        <div className="current-user-card">
          <div
            className="collaborator-avatar"
            style={{ backgroundColor: currentUser.color }}
          >
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="current-user-info">
            <span className="current-user-name">{currentUser.name}</span>
            <span className="current-user-role">
              <Shield size={11} />
              Editor
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
