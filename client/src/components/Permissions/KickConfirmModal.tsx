import React, { useState, useEffect, useRef } from 'react';
import { UserX, AlertTriangle, X, ShieldAlert } from 'lucide-react';
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
    <div className="modal-backdrop kick-modal-backdrop" onClick={onClose}>
      <div
        className="modal-container kick-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kick-modal-title"
      >
        {/* Header */}
        <div className="kick-modal-header">
          <div className="kick-icon-badge">
            <UserX size={20} />
          </div>
          <div className="kick-modal-title-group">
            <h2 id="kick-modal-title" className="kick-modal-title">
              Kick Member
            </h2>
            <p className="kick-modal-subtitle">
              Remove collaborator from this room
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleKick} className="kick-modal-body">
          {/* Target User Info Card */}
          <div className="kick-target-card">
            <div
              className="collaborator-avatar kick-target-avatar"
              style={{ backgroundColor: targetUser.color }}
            >
              {targetUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="kick-target-details">
              <span className="kick-target-name">{targetUser.name}</span>
              {targetUser.role && <RoleBadge role={targetUser.role} size="sm" />}
            </div>
          </div>

          {/* Warning Banner */}
          <div className="kick-warning-banner">
            <AlertTriangle size={16} className="kick-warning-icon" />
            <div className="kick-warning-text">
              <strong>{targetUser.name}</strong> will be disconnected and removed from the active session immediately.
            </div>
          </div>

          {/* Reason Input */}
          <div className="kick-input-group">
            <label htmlFor="kick-reason-input" className="kick-input-label">
              Reason (optional)
            </label>
            <input
              ref={inputRef}
              id="kick-reason-input"
              type="text"
              className="kick-reason-input"
              placeholder="e.g. Inactivity, spamming edits, disruption"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Footer Actions */}
          <div className="kick-modal-footer">
            <button
              type="button"
              className="btn-secondary kick-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-kick-danger"
            >
              <UserX size={15} />
              <span>Kick {targetUser.name}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
