import React from 'react';
import { Lock, Clock, Sparkles, X } from 'lucide-react';
import type { PermissionRequest } from '../../types/permissions';

interface PermissionBannerProps {
  canEdit: boolean;
  userPendingRequest: PermissionRequest | null;
  onRequestClick: () => void;
  onCancelRequest: () => void;
}

export const PermissionBanner: React.FC<PermissionBannerProps> = ({
  canEdit,
  userPendingRequest,
  onRequestClick,
  onCancelRequest,
}) => {
  if (canEdit) return null;

  return (
    <div className="permission-read-only-banner">
      <div className="banner-left-content">
        {userPendingRequest ? (
          <>
            <Clock size={14} className="banner-icon-pulse text-amber-400" />
            <span className="banner-text">
              <strong>Request Pending</strong> — awaiting host approval
            </span>
          </>
        ) : (
          <>
            <Lock size={14} className="banner-icon text-indigo-400" />
            <span className="banner-text">
              <strong>Read-Only Mode</strong>
            </span>
          </>
        )}
      </div>

      <div className="banner-actions">
        {userPendingRequest ? (
          <button
            className="banner-btn banner-btn-cancel"
            onClick={onCancelRequest}
            title="Withdraw request"
          >
            <X size={12} />
            <span>Cancel</span>
          </button>
        ) : (
          <button
            className="banner-btn banner-btn-request"
            onClick={onRequestClick}
            title="Request Edit Access"
          >
            <Sparkles size={12} />
            <span>Request Edit</span>
          </button>
        )}
      </div>
    </div>
  );
};
