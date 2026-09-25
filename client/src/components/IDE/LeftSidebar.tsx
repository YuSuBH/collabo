import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { FolderTree, Users } from 'lucide-react';
import { FileExplorer } from '../FileExplorer/FileExplorer';
import { RoomInfo } from '../Sidebar/RoomInfo';
import type { Collaborator, UserPresence } from '../../utils/collaborators';
import type { LeftSidebarTab } from '../../hooks/useIDEState';
import type {
  UserPermissions,
  UserRole,
  PermissionRequest,
  RoomMeta,
} from '../../types/permissions';

interface LeftSidebarProps {
  leftSidebarTab: LeftSidebarTab;
  onTabChange: (tab: LeftSidebarTab) => void;
  doc: Y.Doc | null;
  awareness: Awareness | null;
  activeFile: string;
  onFileSelect: (fileName: string) => void;
  users: Collaborator[];
  roomId: string;
  currentUser: UserPresence;
  // Permissions props
  roomMeta: RoomMeta | null;
  permissions: UserPermissions;
  role: UserRole;
  isOwner: boolean;
  canManagePermissions: boolean;
  allUserPermissions: Map<string, UserPermissions>;
  pendingRequests: PermissionRequest[];
  userPendingRequest: PermissionRequest | null;
  onRequestPermissions: (perms: Partial<UserPermissions>, note?: string) => void;
  onCancelRequest: () => void;
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onUpdateUserPermissions: (targetUserId: string, targetUserName: string, perms: UserPermissions) => void;
  onTransferOwnership: (targetUserId: string, targetUserName: string) => void;
  onOpenPermissionRequestModal?: () => void;
}

export function LeftSidebar({
  leftSidebarTab,
  onTabChange,
  doc,
  awareness,
  activeFile,
  onFileSelect,
  users,
  roomId,
  currentUser,
  roomMeta,
  permissions,
  role,
  isOwner,
  canManagePermissions,
  allUserPermissions,
  pendingRequests,
  userPendingRequest,
  onRequestPermissions,
  onCancelRequest,
  onApproveRequest,
  onRejectRequest,
  onUpdateUserPermissions,
  onTransferOwnership,
  onOpenPermissionRequestModal,
}: LeftSidebarProps) {
  return (
    <div className="sidebar-container left-sidebar">
      <div className="sidebar-tab-switcher">
        <button
          className={`sidebar-tab-btn ${leftSidebarTab === 'files' ? 'sidebar-tab-btn-active' : ''}`}
          onClick={() => onTabChange('files')}
          title="File Explorer"
        >
          <FolderTree size={14} />
          <span>Files</span>
        </button>
        <button
          className={`sidebar-tab-btn ${leftSidebarTab === 'room' ? 'sidebar-tab-btn-active' : ''}`}
          onClick={() => onTabChange('room')}
          title={`Room & Members${pendingRequests.length > 0 ? ` (${pendingRequests.length} requests)` : ''}`}
        >
          <Users size={14} />
          <span>Room</span>
          {pendingRequests.length > 0 && (
            <span className="tab-badge-dot" />
          )}
        </button>
      </div>

      <div className="sidebar-content-view">
        {leftSidebarTab === 'files' && doc && awareness && (
          <FileExplorer
            doc={doc}
            awareness={awareness}
            activeFile={activeFile}
            onFileSelect={onFileSelect}
            users={users}
            canCreate={permissions.create}
            canDelete={permissions.delete}
            canImport={permissions.import}
            canExport={permissions.export}
            onRequestPermission={onOpenPermissionRequestModal}
          />
        )}

        {leftSidebarTab === 'room' && (
          <RoomInfo
            roomId={roomId}
            users={users}
            currentUser={currentUser}
            roomMeta={roomMeta}
            permissions={permissions}
            role={role}
            isOwner={isOwner}
            canManagePermissions={canManagePermissions}
            allUserPermissions={allUserPermissions}
            pendingRequests={pendingRequests}
            userPendingRequest={userPendingRequest}
            onRequestPermissions={onRequestPermissions}
            onCancelRequest={onCancelRequest}
            onApproveRequest={onApproveRequest}
            onRejectRequest={onRejectRequest}
            onUpdateUserPermissions={onUpdateUserPermissions}
            onTransferOwnership={onTransferOwnership}
          />
        )}
      </div>
    </div>
  );
}
