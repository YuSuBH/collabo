import { useEffect, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Awareness } from 'y-protocols/awareness';
import {
  getRandomCollaborator,
  getAvailableColor,
  generateUserId,
  type UserPresence,
  type Collaborator,
} from '../utils/collaborators';

const SESSION_STORAGE_USER_KEY = 'collab_ide_tab_session_user';
const LOCAL_STORAGE_PREF_KEY = 'collab_ide_user_pref_name';

const getInitialUser = (): UserPresence => {
  try {
    const saved = sessionStorage.getItem(SESSION_STORAGE_USER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.id && parsed.name && parsed.color) {
        return parsed;
      }
    }
  } catch {
    // Ignore error and generate random user
  }
  const user = getRandomCollaborator();
  try {
    sessionStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage write error
  }
  return user;
};

interface UseYjsOptions {
  initialRoomId?: string;
  serverUrl?: string;
  initialName?: string;
  initialColor?: string;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export const useYjs = ({
  initialRoomId = 'demo-room',
  serverUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000',
  initialName,
  initialColor,
}: UseYjsOptions = {}) => {
  const [roomId, setRoomIdState] = useState<string>(initialRoomId);

  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [awareness, setAwareness] = useState<Awareness | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [isSynced, setIsSynced] = useState<boolean>(false);
  const [users, setUsers] = useState<Collaborator[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserPresence>(() => {
    // If the lobby provided explicit credentials, use them with a tab-unique ID
    if (initialName && initialColor) {
      let id = generateUserId();
      try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_USER_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.id) id = parsed.id;
        }
      } catch {
        // ignore
      }
      const user: UserPresence = { id, name: initialName, color: initialColor };
      try {
        sessionStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(user));
        localStorage.setItem(LOCAL_STORAGE_PREF_KEY, initialName);
      } catch {
        // ignore
      }
      return user;
    }
    return getInitialUser();
  });

  // Synchronize URL search params with roomId
  const setRoomId = useCallback((newRoomId: string) => {
    const trimmed = newRoomId.trim();
    if (!trimmed) return;
    setRoomIdState(trimmed);
    const url = new URL(window.location.href);
    url.searchParams.set('room', trimmed);
    window.history.pushState({}, '', url.toString());
  }, []);

  // Update user profile in awareness and sessionStorage
  const updateUser = useCallback(
    (updated: Partial<UserPresence>) => {
      setCurrentUserState((prev) => {
        const newUser = { ...prev, ...updated };
        try {
          sessionStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(newUser));
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

  // Alert user before closing tab / reloading and immediately remove awareness state if leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };

    const handlePageHide = () => {
      if (awareness) {
        awareness.setLocalState(null);
      }
      if (provider) {
        provider.disconnect();
        provider.destroy();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [awareness, provider]);

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
      const otherColors: string[] = [];

      states.forEach((state, clientId) => {
        if (state.user && state.user.name && state.user.color) {
          const isMe = clientId === ydoc.clientID;
          collaborators.push({
            id: state.user.id || `usr_${clientId}`,
            clientId,
            name: state.user.name,
            color: state.user.color,
            isCurrentUser: isMe,
          });
          if (!isMe) {
            otherColors.push(state.user.color);
          }
        }
      });

      setUsers(collaborators);

      // Prevent duplicate colors: if another user in the room has our color, pick an unused one
      const myState = wsAwareness.getLocalState();
      const myColor = myState?.user?.color;
      if (myColor) {
        const duplicatePeer = collaborators.find(
          (c) => !c.isCurrentUser && c.color.toLowerCase() === myColor.toLowerCase()
        );

        // Deterministic collision resolution (tie-breaker by clientID)
        if (duplicatePeer && ydoc.clientID > duplicatePeer.clientId) {
          const newColor = getAvailableColor(otherColors);
          const updatedUser = {
            ...(myState.user || currentUser),
            color: newColor,
          };
          wsAwareness.setLocalStateField('user', updatedUser);
          setCurrentUserState(updatedUser);
          try {
            sessionStorage.setItem(SESSION_STORAGE_USER_KEY, JSON.stringify(updatedUser));
          } catch {
            // Ignore
          }
        }
      }
    };

    wsProvider.on('status', handleStatus);
    wsProvider.on('sync', handleSync);
    wsAwareness.on('change', handleAwarenessChange);

    handleAwarenessChange();

    return () => {
      wsProvider.off('status', handleStatus);
      wsProvider.off('sync', handleSync);
      wsAwareness.off('change', handleAwarenessChange);
      wsAwareness.setLocalState(null);
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
