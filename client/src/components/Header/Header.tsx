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
} from 'lucide-react';
import type { ConnectionStatus } from '../../hooks/useYjs';
import type { Collaborator } from '../../utils/collaborators';
import { RunConfigPopover } from './RunConfigPopover';
import { ExecutionInfoModal } from './ExecutionInfoModal';

interface HeaderProps {
  roomId: string;
  status: ConnectionStatus;
  isSynced: boolean;
  users: Collaborator[];
  unreadChatCount?: number;
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
      {/* Left: Logo & Left Sidebar Toggles */}
      <div className="header-group-left">
        <div className="brand-logo-only" title="CodeSync Collaborative IDE">
          <Code2 size={20} className="brand-icon" />
        </div>

        <div className="header-divider" />

        <div className="header-nav-buttons">
          <button
            className={`header-icon-btn ${isLeftSidebarOpen && leftSidebarTab === 'files' ? 'header-icon-btn-active' : ''}`}
            onClick={() => onToggleLeftSidebar('files')}
            title="File Explorer"
            aria-label="File Explorer"
          >
            <FolderTree size={17} />
          </button>

          <button
            className={`header-icon-btn ${isLeftSidebarOpen && leftSidebarTab === 'room' ? 'header-icon-btn-active' : ''}`}
            onClick={() => onToggleLeftSidebar('room')}
            title={`Room & Collaborators (${users.length} active)`}
            aria-label="Room & Collaborators"
          >
            <Users size={17} />
            {users.length > 0 && (
              <span className="header-badge-count">{users.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Center: Execute / Run Button Group */}
      <div className="header-group-center">
        <div className="header-run-group">
          {/* Main Run button */}
          <button
            className={`header-execute-btn ${isRunning ? 'header-execute-btn-running' : ''}`}
            onClick={onExecute}
            title={isRunning ? 'Executing…' : 'Execute Code (Run)'}
            aria-label="Execute Code"
            disabled={isRunning}
          >
            {isRunning
              ? <Loader2 size={14} className="spin" />
              : <Play size={14} fill="currentColor" />
            }
            <span className="execute-btn-text">{isRunning ? 'Running…' : 'Run'}</span>
          </button>

          {/* Chevron — opens Run Config Popover */}
          <div className="header-run-chevron-wrapper">
            <button
              className={`header-run-chevron ${isPopoverOpen ? 'header-run-chevron-active' : ''}`}
              onClick={() => setIsPopoverOpen((v) => !v)}
              title="Run configuration"
              aria-label="Run configuration"
              disabled={isRunning}
            >
              <ChevronDown size={12} />
            </button>

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
          <button
            className={`header-run-info-btn ${isInfoModalOpen ? 'header-run-info-btn-active' : ''}`}
            onClick={() => setIsInfoModalOpen((v) => !v)}
            title="How code execution works (Guide & multi-file setup)"
            aria-label="How code execution works"
          >
            <HelpCircle size={15} />
          </button>

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
          <button
            className={`header-icon-btn ${isRightSidebarOpen && rightSidebarTab === 'group' ? 'header-icon-btn-active' : ''}`}
            onClick={() => onToggleRightSidebar('group')}
            title={`Group Chat${unreadChatCount > 0 ? ` (${unreadChatCount} unread)` : ''}`}
            aria-label="Group Chat"
          >
            <MessageSquare size={17} />
            {unreadChatCount > 0 && (
              <span className="header-badge-count chat-badge-count">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </button>

          <button
            className={`header-icon-btn ai-toggle-btn ${isRightSidebarOpen && rightSidebarTab === 'ai' ? 'header-icon-btn-active' : ''}`}
            onClick={() => onToggleRightSidebar('ai')}
            title="AI Assistant"
            aria-label="AI Assistant"
          >
            <Sparkles size={17} />
          </button>
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
          <button
            onClick={handleLeave}
            className="header-icon-btn header-btn-leave"
            title="Leave room"
            aria-label="Leave room"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
};
