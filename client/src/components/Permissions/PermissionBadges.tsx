import React from 'react';
import { ShieldCheck, Edit3, Eye, Sliders } from 'lucide-react';
import type { UserRole } from '../../types/permissions';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'sm' }) => {
  const getRoleConfig = () => {
    switch (role) {
      case 'admin':
        return {
          label: 'Admin',
          icon: <ShieldCheck size={size === 'sm' ? 11 : 13} className="role-badge-icon" />,
          className: 'role-badge-admin',
          tooltip: 'Administrator (Can manage permissions & edit code)',
        };
      case 'editor':
        return {
          label: 'Editor',
          icon: <Edit3 size={size === 'sm' ? 11 : 13} className="role-badge-icon" />,
          className: 'role-badge-editor',
          tooltip: 'Editor (Can edit, create, delete, and import files)',
        };
      case 'viewer':
        return {
          label: 'Viewer',
          icon: <Eye size={size === 'sm' ? 11 : 13} className="role-badge-icon" />,
          className: 'role-badge-viewer',
          tooltip: 'Viewer (Read-only access with code execution & export)',
        };
      case 'custom':
      default:
        return {
          label: 'Custom',
          icon: <Sliders size={size === 'sm' ? 11 : 13} className="role-badge-icon" />,
          className: 'role-badge-custom',
          tooltip: 'Customized granular permission set',
        };
    }
  };

  const config = getRoleConfig();

  return (
    <span
      className={`role-badge role-badge-${size} ${config.className}`}
      title={config.tooltip}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};
