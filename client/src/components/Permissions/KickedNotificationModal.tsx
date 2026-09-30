import React from 'react';
import { UserX, LogOut, ShieldAlert, Clock } from 'lucide-react';
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
    <div className="modal-backdrop kicked-overlay-backdrop">
      <div className="modal-container kicked-overlay-card">
        <div className="kicked-overlay-icon-wrap">
          <ShieldAlert size={36} />
        </div>

        <h2 className="kicked-overlay-title">You Have Been Removed</h2>

        <p className="kicked-overlay-message">
          An administrator has removed you from room <strong>{roomId}</strong>.
        </p>

        {kickedInfo && (
          <div className="kicked-details-box">
            <div className="kicked-detail-row">
              <span className="kicked-detail-label">Removed By:</span>
              <span className="kicked-detail-val font-semibold">{kickedInfo.kickedBy}</span>
            </div>
            {kickedInfo.reason && (
              <div className="kicked-detail-row">
                <span className="kicked-detail-label">Reason:</span>
                <span className="kicked-detail-val font-italic">"{kickedInfo.reason}"</span>
              </div>
            )}
            <div className="kicked-detail-row">
              <span className="kicked-detail-label">Time:</span>
              <span className="kicked-detail-val">
                {new Date(kickedInfo.kickedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          className="btn-primary kicked-leave-btn"
          onClick={onLeave}
        >
          <LogOut size={16} />
          <span>Return to Lobby</span>
        </button>
      </div>
    </div>
  );
};
