import { UserRole } from '@/types/user.types';

export const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case 'super_admin':
      return 'Супер Админ';
    case 'admin':
      return 'Админ';
    case 'department_head':
      return 'Руководитель отдела';
    case 'employee':
      return 'Сотрудник';
    default:
      return role;
  }
};

export const getRoleColor = (role: UserRole): string => {
  switch (role) {
    case 'super_admin':
      return '#DC2626';
    case 'admin':
      return '#EA580C';
    case 'department_head':
      return '#2563EB';
    case 'employee':
      return '#059669';
    default:
      return '#6B7280';
  }
};

export const getAvailableRoles = (currentUserRole: UserRole): UserRole[] => {
  const roles: UserRole[] = ['employee', 'department_head', 'admin'];

  // Super admin can assign any role including super_admin
  if (currentUserRole === 'super_admin') {
    roles.push('super_admin');
  }

  return roles;
};

export const canChangeRole = (currentUserRole: UserRole, targetUserRole: UserRole): boolean => {
  // Super admin can change anyone's role
  if (currentUserRole === 'super_admin') {
    return true;
  }

  // Admin can change roles except super_admin
  if (currentUserRole === 'admin' && targetUserRole !== 'super_admin') {
    return true;
  }

  return false;
};

export const isAdmin = (role?: UserRole): boolean => {
  return role === 'admin' || role === 'super_admin';
};
