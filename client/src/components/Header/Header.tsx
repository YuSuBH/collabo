import React, { useState } from "react";
import { Code2, Users, Copy, Check, Circle, Globe, Radio } from "lucide-react";
import type { ConnectionStatus } from "../../hooks/useYjs";
import {
  type Collaborator,
  type UserPresence,
} from "../../utils/collaborators";

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

const LANGUAGES = [{ id: "javascript", name: "JavaScript", ext: ".js" }];

export const Header: React.FC<HeaderProps> = ({
  roomId,
  onRoomChange: _onRoomChange,
  status,
  isSynced,
  users,
  currentUser,
  onUpdateUser: _onUpdateUser,
  language,
  onLanguageChange,
}) => {
  const [copied, setCopied] = useState(false);

  // Copy only the room ID (not the full URL)
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "#10b981"; // Green
      case "connecting":
        return "#f59e0b"; // Amber
      case "disconnected":
      default:
        return "#ef4444"; // Red
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "connected":
        return isSynced ? "Connected" : "Syncing...";
      case "connecting":
        return "Connecting...";
      case "disconnected":
      default:
        return "Disconnected";
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
          {/* Static room display — not editable after joining */}
          <div
            className="room-badge"
            title={`Room: ${roomId}`}
            style={{ cursor: "default" }}
          >
            <Radio size={14} className="room-icon" />
            <span className="room-label">Room:</span>
            <span className="room-name">{roomId}</span>
          </div>

          <button
            onClick={handleCopyRoomId}
            className={`btn-icon ${copied ? "btn-copied" : ""}`}
            title="Copy room ID"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span className="btn-text">{copied ? "Copied!" : "Copy ID"}</span>
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
        <div
          className="collaborators-group"
          title={`${users.length} active user(s)`}
        >
          <div className="avatar-stack">
            {users.map((u) => (
              <div
                key={u.clientId}
                className={`avatar-badge ${u.isCurrentUser ? "avatar-current" : ""}`}
                style={{ backgroundColor: u.color }}
                title={`${u.name}${u.isCurrentUser ? " (You)" : ""}`}
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

        {/* Static user badge — name & color are locked after joining */}
        <div
          className="profile-btn"
          style={{ cursor: "default" }}
          title={`Signed in as ${currentUser.name}`}
        >
          <div
            className="user-color-dot"
            style={{ backgroundColor: currentUser.color }}
          />
          <span className="user-name">{currentUser.name}</span>
        </div>

        <div className="divider"></div>

        {/* Connection Status Pill */}
        <div className="status-pill" title={`Connection status: ${status}`}>
          <Circle
            size={9}
            fill={getStatusColor()}
            stroke="none"
            className={status === "connecting" ? "pulse-anim" : ""}
          />
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>
    </header>
  );
};
