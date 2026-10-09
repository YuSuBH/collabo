import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { FolderTree, Users } from 'lucide-react';
import { Button } from '../common';
import { FileExplorer } from '../FileExplorer/FileExplorer';
import { RoomInfo } from '../Sidebar/RoomInfo';
import type { Collaborator, UserPresence } from '../../utils/collaborators';
import type { LeftSidebarTab } from '../../hooks/useIDEState';
import type {
  UserPermissions,
  UserRole,
  PermissionRequest,
} from '../../types/permissions';
import { ROLE_PRESETS } from '../../types/permissions';

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
  permissions: UserPermissions;
  role: UserRole;
  canManagePermissions: boolean;
  allUserPermissions: Map<string, UserPermissions>;
  pendingRequests: PermissionRequest[];
  userPendingRequest: PermissionRequest | null;
  onRequestPermissions: (perms: Partial<UserPermissions>, note?: string) => void;
  onCancelRequest: () => void;
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onUpdateUserPermissions: (targetUserId: string, targetUserName: string, perms: UserPermissions) => void;
  onKickUser: (targetUserId: string, targetUserName: string, reason?: string) => void;
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
  permissions,
  role,
  canManagePermissions,
  allUserPermissions,
  pendingRequests,
  userPendingRequest,
  onRequestPermissions,
  onCancelRequest,
  onApproveRequest,
  onRejectRequest,
  onUpdateUserPermissions,
  onKickUser,
}: LeftSidebarProps) {
  return (
    <div className="sidebar-container left-sidebar">
      <div className="sidebar-tab-switcher">
        <Button
          variant="ghost"
          size="sm"
          className="sidebar-tab-btn"
          active={leftSidebarTab === 'files'}
          onClick={() => onTabChange('files')}
          title="File Explorer"
          icon={<FolderTree size={14} />}
        >
          <span>Files</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="sidebar-tab-btn"
          active={leftSidebarTab === 'room'}
          onClick={() => onTabChange('room')}
          title={`Room & Members${pendingRequests.length > 0 ? ` (${pendingRequests.length} requests)` : ''}`}
          icon={<Users size={14} />}
        >
          <span>Room</span>
          {pendingRequests.length > 0 && (
            <span className="tab-badge-dot" />
          )}
        </Button>
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
            onRequestPermission={() => onRequestPermissions(ROLE_PRESETS.editor)}
          />
        )}

        {leftSidebarTab === 'room' && (
          <RoomInfo
            roomId={roomId}
            users={users}
            currentUser={currentUser}
            permissions={permissions}
            role={role}
            canManagePermissions={canManagePermissions}
            allUserPermissions={allUserPermissions}
            pendingRequests={pendingRequests}
            userPendingRequest={userPendingRequest}
            onRequestPermissions={onRequestPermissions}
            onCancelRequest={onCancelRequest}
            onApproveRequest={onApproveRequest}
            onRejectRequest={onRejectRequest}
            onUpdateUserPermissions={onUpdateUserPermissions}
            onKickUser={onKickUser}
          />
        )}
      </div>
    </div>
  );
}
