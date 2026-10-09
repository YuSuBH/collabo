import React, { useState } from 'react';
import { Code2, Users, Shuffle, ArrowRight, Radio } from 'lucide-react';
import { Button } from '../common';
import { CURSOR_COLORS, getAvailableColor } from '../../utils/collaborators';

const getRandomColor = (): string =>
  CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]!;

interface LobbyPageProps {
  onJoin: (roomId: string, username: string, color: string) => void;
}

const generateRoomId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
};

export const LobbyPage: React.FC<LobbyPageProps> = ({ onJoin }) => {
  const [roomId, setRoomId] = useState<string>(() => {
    // Pre-fill room ID only when arriving via a shared ?room= link
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || '';
  });
  const [username, setUsername] = useState('');
  const [roomError, setRoomError] = useState('');
  const [nameError, setNameError] = useState('');

  const handleGenerateRoom = () => {
    setRoomId(generateRoomId());
    setRoomError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoom = roomId.trim();
    const cleanName = username.trim();

    let valid = true;
    if (!cleanRoom) { setRoomError('Room ID cannot be empty.'); valid = false; }
    else setRoomError('');
    if (!cleanName) { setNameError('Username cannot be empty.'); valid = false; }
    else setNameError('');

    if (!valid) return;

    // Determine an unused color in this room
    let assignedColor = getRandomColor();
    try {
      const serverUrl =
        import.meta.env.VITE_API_URL ||
        (import.meta.env.VITE_WS_URL
          ? import.meta.env.VITE_WS_URL.replace(/^ws/, 'http')
          : 'http://localhost:5000');
      const res = await fetch(`${serverUrl}/api/rooms/${encodeURIComponent(cleanRoom)}/colors`, {
        signal: AbortSignal.timeout(1200),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.colors)) {
          assignedColor = getAvailableColor(data.colors);
        }
      }
    } catch {
      // Fall back to random if server query fails or times out
    }

    onJoin(cleanRoom, cleanName, assignedColor);
  };

  return (
    <div className="lobby-root">
      <div className="lobby-blob lobby-blob-1" />
      <div className="lobby-blob lobby-blob-2" />
      <div className="lobby-blob lobby-blob-3" />

      <div className="lobby-card">
        <div className="lobby-brand">
          <div className="lobby-brand-icon-wrap">
            <Code2 size={28} />
          </div>
          <div>
            <h1 className="lobby-brand-title">Collabo</h1>
            <p className="lobby-brand-sub">Real-time collaborative code editor</p>
          </div>
        </div>

        <div className="lobby-divider" />

        <form onSubmit={handleSubmit} className="lobby-form" noValidate>
          <div className="lobby-field">
            <label className="lobby-label" htmlFor="room-id-input">
              <Radio size={13} />
              Room ID
            </label>
            <div className="lobby-input-row">
              <input
                id="room-id-input"
                type="text"
                className={`lobby-input ${roomError ? 'lobby-input-error' : ''}`}
                value={roomId}
                onChange={(e) => { setRoomId(e.target.value); if (roomError) setRoomError(''); }}
                placeholder="Enter or generate a room ID"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleGenerateRoom}
                title="Generate random room ID"
                icon={<Shuffle size={14} />}
              >
                Generate
              </Button>
            </div>
            {roomError && <span className="lobby-error">{roomError}</span>}
            <p className="lobby-hint">Enter an existing room ID to join, or use a new one to create a room.</p>
          </div>

          <div className="lobby-field">
            <label className="lobby-label" htmlFor="username-input">
              <Users size={13} />
              Your Name
            </label>
            <input
              id="username-input"
              type="text"
              className={`lobby-input ${nameError ? 'lobby-input-error' : ''}`}
              value={username}
              onChange={(e) => { setUsername(e.target.value); if (nameError) setNameError(''); }}
              placeholder="Enter your display name"
              maxLength={32}
              autoComplete="off"
            />
            {nameError && <span className="lobby-error">{nameError}</span>}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            id="lobby-join-btn"
            fullWidth
            iconRight={<ArrowRight size={17} />}
          >
            Join Room
          </Button>
        </form>
      </div>
    </div>
  );
};