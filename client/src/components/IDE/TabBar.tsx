import { FileCode, Activity } from 'lucide-react';

interface TabBarProps {
  activeFile: string;
  userCount: number;
}

export function TabBar({ activeFile, userCount }: TabBarProps) {
  return (
    <div className="tab-bar">
      <div className="tab-item active-tab">
        <FileCode size={14} className="tab-icon" />
        <span className="tab-title">{activeFile}</span>
        <span className="tab-sync-dot" title="Yjs CRDT Active" />
      </div>
      <div className="tab-actions">
        <span className="tab-hint">
          <Activity size={13} />
          {userCount} collaborator{userCount !== 1 ? 's' : ''} in room
        </span>
      </div>
    </div>
  );
}
