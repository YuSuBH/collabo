import React from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import type { KickedUserInfo } from '../../types/permissions';

interface KickedNotificationModalProps {
  kickedInfo: KickedUserInfo | null;
  roomId: string;
  onLeave: () => void;
}

export const KickedNotificationModal: React.FC<KickedNotificationModalProps> = ({
  kickedInfo,
  roomId,
  onLeave,
}) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-container kicked-modal-container" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-icon-badge modal-icon-badge-danger">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3>Session Terminated</h3>
              <p className="modal-subtitle">You have been removed from this room</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="modal-notice-banner modal-notice-danger">
            <ShieldAlert size={15} className="notice-icon" />
            <span>
              An administrator has removed you from room <strong>{roomId}</strong>.
            </span>
          </div>

          {kickedInfo && (
            <div className="kicked-meta-box">
              <div className="kicked-meta-row">
                <span className="kicked-meta-label">Removed By</span>
                <span className="kicked-meta-val">{kickedInfo.kickedBy}</span>
              </div>
              {kickedInfo.reason && (
                <div className="kicked-meta-row">
                  <span className="kicked-meta-label">Reason</span>
                  <span className="kicked-meta-val">"{kickedInfo.reason}"</span>
                </div>
              )}
              <div className="kicked-meta-row">
                <span className="kicked-meta-label">Time</span>
                <span className="kicked-meta-val">
                  {new Date(kickedInfo.kickedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn-modal-primary"
            onClick={onLeave}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <LogOut size={14} />
            <span>Return to Lobby</span>
          </button>
        </div>
      </div>
    </div>
  );
};
