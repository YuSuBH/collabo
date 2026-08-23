import { useEffect, useState, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Awareness } from 'y-protocols/awareness';
import {
  getRandomCollaborator,
  type UserPresence,
  type Collaborator,
} from '../utils/collaborators';

const LOCAL_STORAGE_USER_KEY = 'collab_ide_user_profile';

const getInitialUser = (): UserPresence => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.name && parsed.color) return parsed;
    }
  } catch {
    // Ignore error and generate random user
  }
  const user = getRandomCollaborator();
  try {
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage write error
  }
  return user;
};

interface UseYjsOptions {
  initialRoomId?: string;
  serverUrl?: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export const useYjs = ({
  initialRoomId = 'demo-room',
  serverUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000',
}: UseYjsOptions = {}) => {
  const [roomId, setRoomId] = useState<string>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('room') || initialRoomId;
  });

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [users, setUsers] = useState<Collaborator[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserPresence>(getInitialUser);

  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);

  // Synchronize URL search params with roomId
  const changeRoom = useCallback((newRoomId: string) => {
    const trimmed = newRoomId.trim();
    if (!trimmed) return;
    setRoomId(trimmed);
    const url = new URL(window.location.href);
    url.searchParams.set('room', trimmed);
    window.history.pushState({}, '', url.toString());
  }, []);

  // Update user profile in awareness and localStorage
  const updateUser = useCallback((updated: Partial<UserPresence>) => {
    setCurrentUserState((prev) => {
      const newUser = { ...prev, ...updated };
      try {
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
      } catch {
        // Ignore
      }
      if (awarenessRef.current) {
        awarenessRef.current.setLocalStateField('user', newUser);
      }
      return newUser;
    });
  }, []);

  useEffect(() => {
    const ydoc = new Y.Doc();
    docRef.current = ydoc;

    const provider = new WebsocketProvider(serverUrl, roomId, ydoc, {
      connect: true,
      params: { room: roomId },
    });
    providerRef.current = provider;

    const awareness = provider.awareness;
    awarenessRef.current = awareness;

    // Set initial local state for presence
    awareness.setLocalStateField('user', currentUser);

    const handleStatus = (event: { status: ConnectionStatus }) => {
      setStatus(event.status);
    };

    const handleSync = (synced: boolean) => {
      setIsSynced(synced);
    };

    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const collaborators: Collaborator[] = [];

      states.forEach((state, clientId) => {
        if (state.user && state.user.name && state.user.color) {
          collaborators.push({
            clientId,
            name: state.user.name,
            color: state.user.color,
            isCurrentUser: clientId === docRef.current?.clientID,
          });
        }
      });

      setUsers(collaborators);
    };

    provider.on('status', handleStatus);
    provider.on('sync', handleSync);
    awareness.on('change', handleAwarenessChange);

    // Initial trigger
    handleAwarenessChange();

    return () => {
      provider.off('status', handleStatus);
      provider.off('sync', handleSync);
      awareness.off('change', handleAwarenessChange);
      provider.destroy();
      ydoc.destroy();
      docRef.current = null;
      providerRef.current = null;
      awarenessRef.current = null;
    };
  }, [roomId, serverUrl]);

  return {
    doc: docRef.current,
    provider: providerRef.current,
    awareness: awarenessRef.current,
    status,
    isSynced,
    users,
    currentUser,
    updateUser,
    roomId,
    setRoomId: changeRoom,
  };
};
