import React from 'react';
import {
  Code2,
  FolderTree,
  Users,
  Play,
  MessageSquare,
  Sparkles,
  LogOut,
  Radio,
} from 'lucide-react';
import type { ConnectionStatus } from '../../hooks/useYjs';
import type { Collaborator } from '../../utils/collaborators';

interface HeaderProps {
  roomId: string;
  status: ConnectionStatus;
  isSynced: boolean;
  users: Collaborator[];
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
  // Leave
  onLeaveRoom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  status,
  isSynced,
  users,
  isLeftSidebarOpen,
  leftSidebarTab,
  onToggleLeftSidebar,
  isRightSidebarOpen,
  rightSidebarTab,
  onToggleRightSidebar,
  onExecute,
  onLeaveRoom,
}) => {
  const handleLeave = () => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      onLeaveRoom?.();
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#10b981'; // Green
      case 'connecting':
        return '#f59e0b'; // Amber
      case 'disconnected':
      default:
        return '#ef4444'; // Red
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

      {/* Center: Execute / Run Button */}
      <div className="header-group-center">
        <button
          className="header-execute-btn"
          onClick={onExecute}
          title="Execute Code (Run)"
          aria-label="Execute Code"
        >
          <Play size={14} fill="currentColor" />
          <span className="execute-btn-text">Run</span>
        </button>
      </div>

      {/* Right: Chat Toggles, Status, Leave */}
      <div className="header-group-right">
        <div className="header-nav-buttons">
          <button
            className={`header-icon-btn ${isRightSidebarOpen && rightSidebarTab === 'group' ? 'header-icon-btn-active' : ''}`}
            onClick={() => onToggleRightSidebar('group')}
            title="Group Chat"
            aria-label="Group Chat"
          >
            <MessageSquare size={17} />
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
