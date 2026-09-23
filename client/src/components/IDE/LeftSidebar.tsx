import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { FolderTree, Users } from 'lucide-react';
import { FileExplorer } from '../FileExplorer/FileExplorer';
import { RoomInfo } from '../Sidebar/RoomInfo';
import type { Collaborator, UserPresence } from '../../utils/collaborators';
import type { LeftSidebarTab } from '../../hooks/useIDEState';

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
          title="Room & Members"
        >
          <Users size={14} />
          <span>Room</span>
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
          />
        )}

        {leftSidebarTab === 'room' && (
          <RoomInfo
            roomId={roomId}
            users={users}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  );
}
