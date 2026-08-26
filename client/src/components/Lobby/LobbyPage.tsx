import React, { useRef, useState } from 'react';
import { Code2, Users, Shuffle, ArrowRight, Radio } from 'lucide-react';
import { CURSOR_COLORS } from '../../utils/collaborators';

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
  // Color is assigned randomly and never exposed to the user
  const colorRef = useRef<string>(getRandomColor());
  const [roomError, setRoomError] = useState('');
  const [nameError, setNameError] = useState('');

  const handleGenerateRoom = () => {
    setRoomId(generateRoomId());
    setRoomError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!roomId.trim()) { setRoomError('Room ID cannot be empty.'); valid = false; }
    else setRoomError('');
    if (!username.trim()) { setNameError('Username cannot be empty.'); valid = false; }
    else setNameError('');
    if (valid) onJoin(roomId.trim(), username.trim(), colorRef.current);
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
            <h1 className="lobby-brand-title">CodeSync</h1>
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
              <button type="button" className="lobby-btn-generate" onClick={handleGenerateRoom} title="Generate random room ID">
                <Shuffle size={15} />
                Generate
              </button>
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


          <button type="submit" className="lobby-btn-join" id="lobby-join-btn">
            <span>Join Room</span>
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </div>
  );
};