import React, { useState, useEffect, useRef } from 'react';
import { UserX, AlertTriangle, X } from 'lucide-react';
import { RoleBadge } from './PermissionBadges';
import type { UserRole } from '../../types/permissions';

interface KickConfirmModalProps {
  isOpen: boolean;
  targetUser: {
    id: string;
    name: string;
    color: string;
    role?: UserRole;
  } | null;
  onConfirm: (targetUserId: string, targetUserName: string, reason?: string) => void;
  onClose: () => void;
}

export const KickConfirmModal: React.FC<KickConfirmModalProps> = ({
  isOpen,
  targetUser,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !targetUser) return null;

  const handleKick = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onConfirm(targetUser.id, targetUser.name, reason.trim() || undefined);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container kick-confirm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-icon-badge modal-icon-badge-danger">
              <UserX size={18} />
            </div>
            <div>
              <h3>Kick Member</h3>
              <p className="modal-subtitle">
                Remove collaborator from the current session
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleKick} className="modal-body">
          {/* Target User Info Card */}
          <div className="perm-selected-user-card" style={{ padding: '10px 14px' }}>
            <div
              className="collaborator-avatar"
              style={{ backgroundColor: targetUser.color }}
            >
              {targetUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="perm-selected-info">
              <div className="perm-selected-name-row">
                <span className="perm-selected-name" style={{ fontSize: '13.5px' }}>
                  {targetUser.name}
                </span>
                {targetUser.role && <RoleBadge role={targetUser.role} size="sm" />}
              </div>
            </div>
          </div>

          {/* Warning Notice Banner */}
          <div className="modal-notice-banner modal-notice-danger">
            <AlertTriangle size={15} className="notice-icon" />
            <span>
              <strong>{targetUser.name}</strong> will be disconnected and removed from this room immediately.
            </span>
          </div>

          {/* Reason Input */}
          <div className="perm-field-group">
            <label htmlFor="kick-reason-input" className="perm-field-label">
              Reason (optional)
            </label>
            <input
              ref={inputRef}
              id="kick-reason-input"
              type="text"
              className="perm-input-text"
              placeholder="e.g. Inactivity, disruption"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ margin: '0 -20px -18px -20px' }}>
            <button
              type="button"
              className="btn-modal-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-modal-danger"
            >
              <UserX size={14} />
              <span>Kick Member</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
