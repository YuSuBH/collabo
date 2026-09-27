import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Y from 'yjs';
import type { Collaborator, UserPresence } from '../utils/collaborators';
import {
  type UserPermissions,
  type UserRole,
  type PermissionRequest,
  type RoomMeta,
  DEFAULT_CREATOR_PERMISSIONS,
  DEFAULT_JOINER_PERMISSIONS,
  ROLE_PRESETS,
  getRoleFromPermissions,
} from '../types/permissions';

interface UsePermissionsProps {
  doc: Y.Doc | null;
  currentUser: UserPresence;
  users: Collaborator[];
  isSynced: boolean;
}

export function usePermissions({
  doc,
  currentUser,
  users,
  isSynced,
}: UsePermissionsProps) {
  const [roomMeta, setRoomMeta] = useState<RoomMeta | null>(null);
  const [allUserPermissions, setAllUserPermissions] = useState<Map<string, UserPermissions>>(
    new Map()
  );
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // ─── 1. Synchronize Room Meta & Initial Creator ──────────────────────────────
  useEffect(() => {
    if (!doc || !isSynced) return;

    const metaMap = doc.getMap('room-meta');
    const permsMap = doc.getMap<UserPermissions>('user-permissions');

    const syncMeta = () => {
      const creatorId = metaMap.get('creatorId') as string | undefined;
      const creatorName = metaMap.get('creatorName') as string | undefined;
      const creatorColor = metaMap.get('creatorColor') as string | undefined;
      const createdAt = metaMap.get('createdAt') as number | undefined;

      if (creatorId && creatorName) {
        setRoomMeta({
          creatorId,
          creatorName,
          creatorColor: creatorColor || '#FF4B4B',
          createdAt: createdAt || Date.now(),
        });
      } else {
        // First user creates the room as the initial Admin
        doc.transact(() => {
          metaMap.set('creatorId', currentUser.id);
          metaMap.set('creatorName', currentUser.name);
          metaMap.set('creatorColor', currentUser.color);
          metaMap.set('createdAt', Date.now());

          permsMap.set(currentUser.id, { ...DEFAULT_CREATOR_PERMISSIONS });
        });
      }
    };

    syncMeta();
    metaMap.observe(syncMeta);
    return () => metaMap.unobserve(syncMeta);
  }, [doc, isSynced, currentUser.id, currentUser.name, currentUser.color]);

  // ─── 2. Synchronize User Permissions ──────────────────────────────────────────
  useEffect(() => {
    if (!doc || !isSynced) return;

    const permsMap = doc.getMap<UserPermissions>('user-permissions');
    const metaMap = doc.getMap('room-meta');

    const syncPermissions = () => {
      const map = new Map<string, UserPermissions>();
      permsMap.forEach((perm, userId) => {
        if (perm && typeof perm === 'object') {
          map.set(userId, perm);
        }
      });

      const creatorId = metaMap.get('creatorId') as string | undefined;
      const isCreator = creatorId === currentUser.id;

      // If current user is not in permissions map yet, initialize them
      if (!permsMap.has(currentUser.id)) {
        const initialPerms = isCreator
          ? { ...DEFAULT_CREATOR_PERMISSIONS }
          : { ...DEFAULT_JOINER_PERMISSIONS };

        doc.transact(() => {
          permsMap.set(currentUser.id, initialPerms);
        });
        map.set(currentUser.id, initialPerms);
      }

      setAllUserPermissions(map);
    };

    syncPermissions();
    permsMap.observe(syncPermissions);
    return () => permsMap.unobserve(syncPermissions);
  }, [doc, isSynced, currentUser.id]);

  // ─── 3. Synchronize Permission Requests ──────────────────────────────────────
  useEffect(() => {
    if (!doc || !isSynced) return;

    const requestsArray = doc.getArray<PermissionRequest>('permission-requests');

    const syncRequests = () => {
      const list = requestsArray.toArray();
      setRequests([...list]);
    };

    syncRequests();
    requestsArray.observe(syncRequests);
    return () => requestsArray.unobserve(syncRequests);
  }, [doc, isSynced]);

  // ─── 4. Current User Permissions & Role ───────────────────────────────────────
  const isCreator = useMemo(() => {
    return roomMeta?.creatorId === currentUser.id;
  }, [roomMeta, currentUser.id]);

  const permissions: UserPermissions = useMemo(() => {
    const userPerms = allUserPermissions.get(currentUser.id);
    if (userPerms) return userPerms;
    if (isCreator) return DEFAULT_CREATOR_PERMISSIONS;
    return DEFAULT_JOINER_PERMISSIONS;
  }, [allUserPermissions, currentUser.id, isCreator]);

  const role: UserRole = useMemo(() => {
    return getRoleFromPermissions(permissions);
  }, [permissions]);

  // Specific granular permission booleans
  const canEdit = permissions.edit;
  const canCreate = permissions.create;
  const canDelete = permissions.delete;
  const canImport = permissions.import;
  const canExecute = permissions.execute;
  const canExport = permissions.export;
  const canManagePermissions = permissions.managePermissions;

  // Pending requests list
  const pendingRequests = useMemo(() => {
    return requests.filter((r) => r.status === 'pending');
  }, [requests]);

  // User's own pending request (if any)
  const userPendingRequest = useMemo(() => {
    return (
      requests.find(
        (r) => r.userId === currentUser.id && r.status === 'pending'
      ) || null
    );
  }, [requests, currentUser.id]);

  // ─── 5. Admin Failover (If all Admins leave the room) ────────────────────────
  useEffect(() => {
    if (!doc || !isSynced || users.length === 0 || allUserPermissions.size === 0) return;

    // Check if any currently connected user has managePermissions === true (Admin)
    const activeAdmins = users.filter((u) => {
      const p = allUserPermissions.get(u.id);
      return p?.managePermissions === true;
    });

    // If no connected user is an Admin, auto-promote the senior connected user to Admin
    if (activeAdmins.length === 0) {
      const sortedUsers = [...users].sort((a, b) => a.clientId - b.clientId);
      const seniorUser = sortedUsers[0];

      if (seniorUser && seniorUser.id === currentUser.id) {
        console.log(
          `[Admin Failover] No active Admin present. Promoting senior user ${seniorUser.name} (${seniorUser.id}) to Admin.`
        );

        const permsMap = doc.getMap<UserPermissions>('user-permissions');

        doc.transact(() => {
          permsMap.set(seniorUser.id, {
            ...DEFAULT_CREATOR_PERMISSIONS,
          });

          // Post system notification to chat messages array
          const chatArray = doc.getArray('chat-messages');
          chatArray.push([
            {
              id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              senderId: 0,
              senderName: 'System',
              senderColor: '#6366f1',
              text: `🛡️ All administrators left the room. ${seniorUser.name} has been automatically promoted to Admin.`,
              timestamp: Date.now(),
              fileRef: null,
            },
          ]);
        });

        setStatusMessage('You have been promoted to Room Admin as all previous admins left.');
        setTimeout(() => setStatusMessage(null), 6000);
      }
    }
  }, [doc, isSynced, users, allUserPermissions, currentUser.id]);

  // ─── 6. Action Handlers ──────────────────────────────────────────────────────

  /** Request permissions (joiner workflow) */
  const requestPermissions = useCallback(
    (requestedPerms: Partial<UserPermissions>, note?: string) => {
      if (!doc) return;

      const requestsArray = doc.getArray<PermissionRequest>('permission-requests');

      // Check if user already has an active pending request and cancel/replace it
      const existing = requestsArray.toArray();
      const pendingIdx = existing.findIndex(
        (r) => r.userId === currentUser.id && r.status === 'pending'
      );

      const newRequest: PermissionRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userColor: currentUser.color,
        permissions: requestedPerms,
        note: note?.trim() || undefined,
        timestamp: Date.now(),
        status: 'pending',
      };

      doc.transact(() => {
        if (pendingIdx !== -1) {
          requestsArray.delete(pendingIdx, 1);
        }
        requestsArray.push([newRequest]);
      });

      setStatusMessage('Permission request submitted to room administrator.');
      setTimeout(() => setStatusMessage(null), 4000);
    },
    [doc, currentUser.id, currentUser.name, currentUser.color]
  );

  /** Cancel active permission request */
  const cancelRequest = useCallback(
    (requestId?: string) => {
      if (!doc) return;
      const targetId = requestId || userPendingRequest?.id;
      if (!targetId) return;

      const requestsArray = doc.getArray<PermissionRequest>('permission-requests');
      const list = requestsArray.toArray();
      const idx = list.findIndex((r) => r.id === targetId);

      if (idx !== -1) {
        doc.transact(() => {
          requestsArray.delete(idx, 1);
        });
      }
    },
    [doc, userPendingRequest]
  );

  /** Approve permission request (admin workflow) */
  const approveRequest = useCallback(
    (requestId: string, customGrant?: UserPermissions) => {
      if (!doc || !canManagePermissions) return;

      const requestsArray = doc.getArray<PermissionRequest>('permission-requests');
      const permsMap = doc.getMap<UserPermissions>('user-permissions');

      const list = requestsArray.toArray();
      const idx = list.findIndex((r) => r.id === requestId);
      if (idx === -1) return;

      const req = list[idx];
      const currentTargetPerms =
        permsMap.get(req.userId) || { ...DEFAULT_JOINER_PERMISSIONS };

      // Apply granted permissions (defaulting to clean editor preset if requesting edit access)
      const updatedPerms: UserPermissions = customGrant || {
        ...currentTargetPerms,
        ...req.permissions,
        managePermissions: Boolean(req.permissions.managePermissions),
      };

      const updatedReq: PermissionRequest = {
        ...req,
        status: 'approved',
        reviewedBy: currentUser.name,
        reviewedAt: Date.now(),
      };

      doc.transact(() => {
        requestsArray.delete(idx, 1);
        requestsArray.insert(idx, [updatedReq]);
        permsMap.set(req.userId, updatedPerms);

        // System notification in chat
        const chatArray = doc.getArray('chat-messages');
        chatArray.push([
          {
            id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            senderId: 0,
            senderName: 'System',
            senderColor: '#10b981',
            text: `✅ ${currentUser.name} approved permissions for ${req.userName}.`,
            timestamp: Date.now(),
            fileRef: null,
          },
        ]);
      });
    },
    [doc, canManagePermissions, currentUser.name]
  );

  /** Reject permission request (admin workflow) */
  const rejectRequest = useCallback(
    (requestId: string) => {
      if (!doc || !canManagePermissions) return;

      const requestsArray = doc.getArray<PermissionRequest>('permission-requests');
      const list = requestsArray.toArray();
      const idx = list.findIndex((r) => r.id === requestId);
      if (idx === -1) return;

      const req = list[idx];
      const updatedReq: PermissionRequest = {
        ...req,
        status: 'rejected',
        reviewedBy: currentUser.name,
        reviewedAt: Date.now(),
      };

      doc.transact(() => {
        requestsArray.delete(idx, 1);
        requestsArray.insert(idx, [updatedReq]);
      });
    },
    [doc, canManagePermissions, currentUser.name]
  );

  /** Update target user permissions directly */
  const updateUserPermissions = useCallback(
    (targetUserId: string, targetUserName: string, newPerms: UserPermissions) => {
      if (!doc || !canManagePermissions) return;

      const permsMap = doc.getMap<UserPermissions>('user-permissions');

      doc.transact(() => {
        permsMap.set(targetUserId, newPerms);

        const chatArray = doc.getArray('chat-messages');
        chatArray.push([
          {
            id: `sys_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            senderId: 0,
            senderName: 'System',
            senderColor: '#3b82f6',
            text: `🛡️ ${currentUser.name} updated permissions for ${targetUserName}.`,
            timestamp: Date.now(),
            fileRef: null,
          },
        ]);
      });
    },
    [doc, canManagePermissions, currentUser.name]
  );

  /** Update user preset role */
  const setUserRole = useCallback(
    (targetUserId: string, targetUserName: string, targetRole: Exclude<UserRole, 'custom'>) => {
      if (!doc || !canManagePermissions) return;
      const newPerms = ROLE_PRESETS[targetRole];
      updateUserPermissions(targetUserId, targetUserName, newPerms);
    },
    [doc, canManagePermissions, updateUserPermissions]
  );

  return {
    roomMeta,
    permissions,
    role,
    canEdit,
    canCreate,
    canDelete,
    canImport,
    canExecute,
    canExport,
    canManagePermissions,
    allUserPermissions,
    pendingRequests,
    userPendingRequest,
    statusMessage,
    clearStatusMessage: () => setStatusMessage(null),
    requestPermissions,
    cancelRequest,
    approveRequest,
    rejectRequest,
    updateUserPermissions,
    setUserRole,
  };
}
