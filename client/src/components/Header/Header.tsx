import React, { useState } from 'react';
import {
  Code2,
  FolderTree,
  Users,
  Play,
  MessageSquare,
  Sparkles,
  LogOut,
  Radio,
  ChevronDown,
  Loader2,
  HelpCircle,
  Lock,
} from 'lucide-react';
import type { ConnectionStatus } from '../../hooks/useYjs';
import type { Collaborator } from '../../utils/collaborators';
import type { UserRole } from '../../types/permissions';
import { RoleBadge } from '../Permissions/PermissionBadges';
import { Button } from '../common';
import { RunConfigPopover } from './RunConfigPopover';
import { ExecutionInfoModal } from './ExecutionInfoModal';

interface HeaderProps {
  roomId: string;
  status: ConnectionStatus;
  isSynced: boolean;
  users: Collaborator[];
  unreadChatCount?: number;
  pendingRequestsCount?: number;
  role?: UserRole;
  canExecute?: boolean;
  // Left sidebar toggles
  isLeftSidebarOpen: boolean;
  leftSidebarTab: 'files' | 'room';
  onToggleLeftSidebar: (tab: 'files' | 'room') => void;
  // Right sidebar toggles
  isRightSidebarOpen: boolean;
  rightSidebarTab: 'group' | 'ai';
  onToggleRightSidebar: (tab: 'group' | 'ai') => void;
  // Execute
  onExecute?: () => void;
  isRunning?: boolean;
  projectFiles?: string[];
  entryFile?: string;
  onEntryFileChange?: (file: string) => void;
  // Leave
  onLeaveRoom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  status,
  isSynced,
  users,
  unreadChatCount = 0,
  pendingRequestsCount = 0,
  role = 'editor',
  canExecute = true,
  isLeftSidebarOpen,
  leftSidebarTab,
  onToggleLeftSidebar,
  isRightSidebarOpen,
  rightSidebarTab,
  onToggleRightSidebar,
  onExecute,
  isRunning = false,
  projectFiles = [],
  entryFile = '',
  onEntryFileChange,
  onLeaveRoom,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      onLeaveRoom?.();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#10b981';
      case 'connecting':
        return '#f59e0b';
      case 'disconnected':
      default:
        return '#ef4444';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'connected':
        return isSynced
          ? `Connected to room "${roomId}" (${users.length} collaborator${users.length !== 1 ? 's' : ''})`
          : `Connected to room "${roomId}" (Syncing data...)`;
      case 'connecting':
        return `Connecting to room "${roomId}"...`;
      case 'disconnected':
      default:
        return 'Disconnected from server';
    }
  };

  return (
    <header className="app-header-clean">
      {/* Left: Logo, Role Badge & Left Sidebar Toggles */}
      <div className="header-group-left">
        <div className="brand-logo-only" title="Collabo Collaborative IDE">
          <Code2 size={20} className="brand-icon" />
        </div>

        <div className="header-role-container">
          <RoleBadge role={role} size="sm" />
        </div>

        <div className="header-divider" />

        <div className="header-nav-buttons">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            active={isLeftSidebarOpen && leftSidebarTab === 'files'}
            onClick={() => onToggleLeftSidebar('files')}
            title="File Explorer"
            aria-label="File Explorer"
            icon={<FolderTree size={16} />}
          />

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            active={isLeftSidebarOpen && leftSidebarTab === 'room'}
            onClick={() => onToggleLeftSidebar('room')}
            title={`Room & Collaborators (${users.length} active)${pendingRequestsCount > 0 ? ` — ${pendingRequestsCount} pending request(s)` : ''}`}
            aria-label="Room & Collaborators"
            icon={<Users size={16} />}
          >
            {users.length > 0 && (
              <span className="header-badge-count">{users.length}</span>
            )}
            {pendingRequestsCount > 0 && (
              <span className="header-badge-requests" title={`${pendingRequestsCount} pending permission request(s)`}>
                {pendingRequestsCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Center: Execute / Run Button Group */}
      <div className="header-group-center">
        <div className="header-run-group">
          {/* Main Run button */}
          <Button
            variant="primary"
            size="sm"
            className={`header-execute-btn ${isRunning ? 'header-execute-btn-running' : ''}`}
            onClick={() => {
              if (!canExecute) return;
              onExecute?.();
            }}
            title={!canExecute ? 'Execution permission required' : isRunning ? 'Executing…' : 'Execute Code (Run)'}
            aria-label="Execute Code"
            disabled={isRunning || !canExecute}
            icon={
              !canExecute ? (
                <Lock size={13} />
              ) : isRunning ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <Play size={14} fill="currentColor" />
              )
            }
          >
            <span className="execute-btn-text">
              {!canExecute ? 'No Exec Perm' : isRunning ? 'Running…' : 'Run'}
            </span>
          </Button>

          {/* Chevron — opens Run Config Popover */}
          <div className="header-run-chevron-wrapper">
            <Button
              variant="ghost"
              size="xs"
              iconOnly
              className="header-run-chevron"
              active={isPopoverOpen}
              onClick={() => setIsPopoverOpen((v) => !v)}
              title="Run configuration"
              aria-label="Run configuration"
              disabled={isRunning || !canExecute}
              icon={<ChevronDown size={12} />}
            />

            {isPopoverOpen && (
              <RunConfigPopover
                files={projectFiles}
                activeFile={entryFile}
                entryFile={entryFile}
                onEntryFileChange={(file) => onEntryFileChange?.(file)}
                onRun={() => onExecute?.()}
                onClose={() => setIsPopoverOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Info / Guide button (?) with dropdown popover */}
        <div className="header-run-info-wrapper">
          <Button
            variant="ghost"
            size="xs"
            iconOnly
            className="header-run-info-btn"
            active={isInfoModalOpen}
            onClick={() => setIsInfoModalOpen((v) => !v)}
            title="How code execution works (Guide & multi-file setup)"
            aria-label="How code execution works"
            icon={<HelpCircle size={15} />}
          />

          {isInfoModalOpen && (
            <ExecutionInfoModal
              onClose={() => setIsInfoModalOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Right: Chat Toggles, Status, Leave */}
      <div className="header-group-right">
        <div className="header-nav-buttons">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            active={isRightSidebarOpen && rightSidebarTab === 'group'}
            onClick={() => onToggleRightSidebar('group')}
            title={`Group Chat${unreadChatCount > 0 ? ` (${unreadChatCount} unread)` : ''}`}
            aria-label="Group Chat"
            icon={<MessageSquare size={16} />}
          >
            {unreadChatCount > 0 && (
              <span className="header-badge-count chat-badge-count">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            iconOnly
            active={isRightSidebarOpen && rightSidebarTab === 'ai'}
            onClick={() => onToggleRightSidebar('ai')}
            title="AI Assistant"
            aria-label="AI Assistant"
            icon={<Sparkles size={16} />}
          />
        </div>

        <div className="header-divider" />

        {/* Connection Status Icon Indicator */}
        <div
          className="header-status-indicator"
          title={getStatusDescription()}
          style={{ borderColor: getStatusColor() }}
        >
          <Radio
            size={15}
            style={{ color: getStatusColor() }}
            className={status === 'connecting' ? 'pulse-anim' : ''}
          />
          <span
            className="status-dot-mini"
            style={{ backgroundColor: getStatusColor() }}
          />
        </div>

        {/* Leave Room Button */}
        {onLeaveRoom && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className="header-btn-leave"
            onClick={handleLeave}
            title="Leave room"
            aria-label="Leave room"
            icon={<LogOut size={16} />}
          />
        )}
      </div>
    </header>
  );
};
