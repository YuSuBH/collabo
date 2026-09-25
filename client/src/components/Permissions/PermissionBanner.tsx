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
            <Clock size={15} className="banner-icon-pulse text-amber-400" />
            <span className="banner-text">
              <strong>Permission Request Pending:</strong> Awaiting room administrator approval.
            </span>
          </>
        ) : (
          <>
            <Lock size={15} className="banner-icon text-indigo-400" />
            <span className="banner-text">
              <strong>Read-Only Mode:</strong> You currently have view, execute, and export permissions.
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
            <X size={13} />
            <span>Cancel Request</span>
          </button>
        ) : (
          <button
            className="banner-btn banner-btn-request"
            onClick={onRequestClick}
            title="Request Edit & Management Permissions"
          >
            <Sparkles size={13} />
            <span>Request Edit Access</span>
          </button>
        )}
      </div>
    </div>
  );
};
