import React, { useState } from 'react';
import {
  Code2,
  Users,
  Copy,
  Check,
  Circle,
  Settings,
  Globe,
  Radio,
} from 'lucide-react';
import type { ConnectionStatus } from '../../hooks/useYjs';
import {
  CURSOR_COLORS,
  type Collaborator,
  type UserPresence,
} from '../../utils/collaborators';

interface HeaderProps {
  roomId: string;
  onRoomChange: (newRoom: string) => void;
  status: ConnectionStatus;
  isSynced: boolean;
  users: Collaborator[];
  currentUser: UserPresence;
  onUpdateUser: (user: Partial<UserPresence>) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
}

const LANGUAGES = [
  { id: 'typescript', name: 'TypeScript', ext: '.ts' },
  { id: 'javascript', name: 'JavaScript', ext: '.js' },
  { id: 'python', name: 'Python', ext: '.py' },
  { id: 'cpp', name: 'C++', ext: '.cpp' },
  { id: 'html', name: 'HTML', ext: '.html' },
  { id: 'css', name: 'CSS', ext: '.css' },
  { id: 'json', name: 'JSON', ext: '.json' },
  { id: 'markdown', name: 'Markdown', ext: '.md' },
];

export const Header: React.FC<HeaderProps> = ({
  roomId,
  onRoomChange,
  status,
  isSynced,
  users,
  currentUser,
  onUpdateUser,
  language,
  onLanguageChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [roomInput, setRoomInput] = useState(roomId);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomInput.trim()) {
      onRoomChange(roomInput.trim());
      setIsEditingRoom(false);
    }
  };

  const handleNameSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onUpdateUser({ name: nameInput.trim() });
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

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return isSynced ? 'Connected' : 'Syncing...';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  return (
    <header className="app-header">
      {/* Left: Brand & Room */}
      <div className="header-left">
        <div className="brand">
          <Code2 size={22} className="brand-icon" />
          <span className="brand-title">CodeSync</span>
          <span className="brand-tag">v0.2</span>
        </div>

        <div className="divider"></div>

        <div className="room-section">
          {isEditingRoom ? (
            <form onSubmit={handleRoomSubmit} className="room-edit-form">
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                autoFocus
                onBlur={() => setIsEditingRoom(false)}
                className="room-input"
                placeholder="Enter room name"
              />
              <button type="submit" className="btn-small">
                Save
              </button>
            </form>
          ) : (
            <div
              className="room-badge"
              onClick={() => {
                setRoomInput(roomId);
                setIsEditingRoom(true);
              }}
              title="Click to rename room"
            >
              <Radio size={14} className="room-icon" />
              <span className="room-label">Room:</span>
              <span className="room-name">{roomId}</span>
            </div>
          )}

          <button
            onClick={handleCopyLink}
            className={`btn-icon ${copied ? 'btn-copied' : ''}`}
            title="Copy shareable link"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span className="btn-text">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Center: Language selector */}
      <div className="header-center">
        <div className="lang-select-wrapper">
          <Globe size={15} className="lang-icon" />
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="lang-select"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.name} ({lang.ext})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Presence, Profile & Connection */}
      <div className="header-right">
        {/* Active Collaborators */}
        <div className="collaborators-group" title={`${users.length} active user(s)`}>
          <div className="avatar-stack">
            {users.map((u) => (
              <div
                key={u.clientId}
                className={`avatar-badge ${u.isCurrentUser ? 'avatar-current' : ''}`}
                style={{ backgroundColor: u.color }}
                title={`${u.name}${u.isCurrentUser ? ' (You)' : ''}`}
              >
                {u.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <span className="collab-count">
            <Users size={14} />
            {users.length}
          </span>
        </div>

        <div className="divider"></div>

        {/* User Profile / Settings Trigger */}
        <div className="profile-wrapper">
          <button
            className="profile-btn"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            title="Customize your name and cursor color"
          >
            <div
              className="user-color-dot"
              style={{ backgroundColor: currentUser.color }}
            />
            <span className="user-name">{currentUser.name}</span>
            <Settings size={14} className="settings-icon" />
          </button>

          {isProfileOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-title">Your Profile & Cursor</div>

              <form onSubmit={handleNameSave} className="profile-form">
                <label className="input-label">Display Name</label>
                <div className="input-row">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="profile-input"
                    maxLength={24}
                  />
                  <button type="submit" className="btn-small">
                    Update
                  </button>
                </div>
              </form>

              <div className="color-section">
                <label className="input-label">Cursor Color</label>
                <div className="color-grid">
                  {CURSOR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`color-swatch ${
                        currentUser.color === c ? 'color-swatch-active' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => onUpdateUser({ color: c })}
                    />
                  ))}
                </div>
              </div>

              <button
                className="btn-dropdown-close"
                onClick={() => setIsProfileOpen(false)}
              >
                Done
              </button>
            </div>
          )}
        </div>

        <div className="divider"></div>

        {/* Connection Status Pill */}
        <div className="status-pill" title={`Connection status: ${status}`}>
          <Circle
            size={9}
            fill={getStatusColor()}
            stroke="none"
            className={status === 'connecting' ? 'pulse-anim' : ''}
          />
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>
    </header>
  );
};
