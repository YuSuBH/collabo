import React, { useState, useRef, useEffect } from 'react';
import { Lock, Clock, Sparkles, X, Send } from 'lucide-react';
import { Button } from '../common';
import type { PermissionRequest, UserPermissions } from '../../types/permissions';
import { ROLE_PRESETS } from '../../types/permissions';

interface PermissionBannerProps {
  canEdit: boolean;
  userPendingRequest: PermissionRequest | null;
  onRequestPermissions: (permissions: Partial<UserPermissions>, note?: string) => void;
  onCancelRequest: () => void;
}

export const PermissionBanner: React.FC<PermissionBannerProps> = ({
  canEdit,
  userPendingRequest,
  onRequestPermissions,
  onCancelRequest,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [note, setNote] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  if (canEdit) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onRequestPermissions(ROLE_PRESETS.editor, note.trim() || undefined);
    setIsDropdownOpen(false);
    setNote('');
  };

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

      <div className="banner-actions-wrapper">
        {userPendingRequest ? (
          <Button
            variant="secondary"
            size="xs"
            icon={<X size={12} />}
            onClick={() => onCancelRequest()}
            title="Withdraw request"
          >
            Cancel
          </Button>
        ) : (
          <div className="banner-btn-dropdown-anchor">
            <Button
              ref={buttonRef}
              variant="primary"
              size="xs"
              active={isDropdownOpen}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDropdownOpen((prev) => !prev);
              }}
              title="Request Editor Access"
              icon={<Sparkles size={12} />}
            >
              Request Edit
            </Button>

            {/* Small Dropdown Popover */}
            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                className="perm-request-dropdown"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="perm-dropdown-header">
                  <span className="perm-dropdown-title">Request Editor Access</span>
                  <Button
                    variant="ghost"
                    size="xs"
                    iconOnly
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDropdownOpen(false);
                    }}
                    icon={<X size={12} />}
                  />
                </div>

                <form onSubmit={handleSend} className="perm-dropdown-body">
                  <input
                    type="text"
                    className="perm-dropdown-input"
                    placeholder="Add a note (optional)..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={100}
                    autoFocus
                  />

                  <div className="perm-dropdown-actions">
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDropdownOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="xs"
                      icon={<Send size={11} />}
                    >
                      Send Request
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
