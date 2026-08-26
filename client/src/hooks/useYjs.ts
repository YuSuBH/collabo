import { useEffect, useState, useCallback } from 'react';
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
  const [roomId, setRoomIdState] = useState<string>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('room') || initialRoomId;
  });

  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [users, setUsers] = useState<Collaborator[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserPresence>(getInitialUser);

  // Synchronize URL search params with roomId
  const setRoomId = useCallback((newRoomId: string) => {
    const trimmed = newRoomId.trim();
    if (!trimmed) return;
    setRoomIdState(trimmed);
    const url = new URL(window.location.href);
    url.searchParams.set('room', trimmed);
    window.history.pushState({}, '', url.toString());
  }, []);

  // Update user profile in awareness and localStorage
  const updateUser = useCallback(
    (updated: Partial<UserPresence>) => {
      setCurrentUserState((prev) => {
        const newUser = { ...prev, ...updated };
        try {
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
        } catch {
          // Ignore
        }
        if (awareness) {
          awareness.setLocalStateField('user', newUser);
        }
        return newUser;
      });
    },
    [awareness]
  );

  useEffect(() => {
    const ydoc = new Y.Doc();
    const wsProvider = new WebsocketProvider(serverUrl, roomId, ydoc, {
      connect: true,
      params: { room: roomId },
    });
    const wsAwareness = wsProvider.awareness;

    setDoc(ydoc);
    setProvider(wsProvider);
    setAwareness(wsAwareness);

    // Register initial user awareness state
    wsAwareness.setLocalStateField('user', currentUser);

    const handleStatus = (event: { status: ConnectionStatus }) => {
      setStatus(event.status);
    };

    const handleSync = (synced: boolean) => {
      setIsSynced(synced);
    };

    const handleAwarenessChange = () => {
      const states = wsAwareness.getStates();
      const collaborators: Collaborator[] = [];

      states.forEach((state, clientId) => {
        if (state.user && state.user.name && state.user.color) {
          collaborators.push({
            clientId,
            name: state.user.name,
            color: state.user.color,
            isCurrentUser: clientId === ydoc.clientID,
          });
        }
      });

      setUsers(collaborators);
    };

    wsProvider.on('status', handleStatus);
    wsProvider.on('sync', handleSync);
    wsAwareness.on('change', handleAwarenessChange);

    handleAwarenessChange();

    return () => {
      wsProvider.off('status', handleStatus);
      wsProvider.off('sync', handleSync);
      wsAwareness.off('change', handleAwarenessChange);
      wsProvider.destroy();
      ydoc.destroy();
      setDoc(null);
      setProvider(null);
      setAwareness(null);
    };
  }, [roomId, serverUrl]);

  return {
    doc,
    provider,
    awareness,
    status,
    isSynced,
    users,
    currentUser,
    updateUser,
    roomId,
    setRoomId,
  };
};
