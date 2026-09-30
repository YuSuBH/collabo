export interface UserPermissions {
  edit: boolean;
  create: boolean;
  delete: boolean;
  import: boolean;
  execute: boolean;
  export: boolean;
  managePermissions: boolean;
}

export type UserRole = 'admin' | 'editor' | 'viewer' | 'custom';

export const DEFAULT_CREATOR_PERMISSIONS: UserPermissions = {
  edit: true,
  create: true,
  delete: true,
  import: true,
  execute: true,
  export: true,
  managePermissions: true,
};

export const DEFAULT_JOINER_PERMISSIONS: UserPermissions = {
  edit: false,
  create: false,
  delete: false,
  import: false,
  execute: true,
  export: true,
  managePermissions: false,
};

export const ROLE_PRESETS: Record<Exclude<UserRole, 'custom'>, UserPermissions> = {
  admin: {
    edit: true,
    create: true,
    delete: true,
    import: true,
    execute: true,
    export: true,
    managePermissions: true,
  },
  editor: {
    edit: true,
    create: true,
    delete: true,
    import: true,
    execute: true,
    export: true,
    managePermissions: false,
  },
  viewer: {
    edit: false,
    create: false,
    delete: false,
    import: false,
    execute: true,
    export: true,
    managePermissions: false,
  },
};

export interface PermissionRequest {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  permissions: Partial<UserPermissions>;
  note?: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: number;
}

export interface RoomMeta {
  creatorId: string;
  creatorName: string;
  creatorColor: string;
  createdAt: number;
}

export interface KickedUserInfo {
  userId: string;
  userName: string;
  kickedBy: string;
  kickedAt: number;
  reason?: string;
}

export const getRoleFromPermissions = (permissions: UserPermissions): UserRole => {
  if (permissions.managePermissions) {
    return 'admin';
  }
  if (permissions.edit) {
    return 'editor';
  }
  if (!permissions.create && !permissions.delete && !permissions.import) {
    return 'viewer';
  }
  return 'custom';
};

export const PERMISSION_LABELS: Record<keyof UserPermissions, { label: string; description: string }> = {
  edit: {
    label: 'Edit Code',
    description: 'Edit files live in the Monaco code editor',
  },
  create: {
    label: 'Create Files',
    description: 'Create new files and modules in the file explorer',
  },
  delete: {
    label: 'Delete Files',
    description: 'Delete existing project files',
  },
  import: {
    label: 'Import Files & ZIP',
    description: 'Upload files and drop ZIP archives into the project',
  },
  execute: {
    label: 'Run / Execute Code',
    description: 'Execute code against the backend Wandbox engine',
  },
  export: {
    label: 'Export ZIP',
    description: 'Download and export project files as a ZIP archive',
  },
  managePermissions: {
    label: 'Manage Permissions',
    description: 'Modify member permissions and approve access requests',
  },
};
