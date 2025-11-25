/**
 * Profile helper functions
 */

import { User } from '@/types/user.types';

/**
 * Get theme label in Russian
 */
export const getThemeLabel = (themeMode: 'light' | 'dark' | 'system'): string => {
  switch (themeMode) {
    case 'light':
      return 'Светлая';
    case 'dark':
      return 'Тёмная';
    case 'system':
      return 'Системная';
    default:
      return 'Системная';
  }
};

/**
 * Validate image file for avatar upload
 */
export const validateAvatarFile = (file: File): { valid: boolean; error?: string } => {
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return {
      valid: false,
      error: 'Размер файла не должен превышать 5 МБ',
    };
  }

  // Validate file type
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Пожалуйста, выберите изображение',
    };
  }

  return { valid: true };
};

/**
 * Check if user has admin role
 */
export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'admin' || user?.role === 'super_admin';
};

/**
 * Check if user has department head role
 */
export const isDepartmentHead = (user: User | null): boolean => {
  return user?.role === 'department_head';
};

/**
 * Get role icon name for user
 */
export const getRoleIcon = (user: User | null): string | null => {
  if (!user) return null;

  if (user.role === 'department_head') {
    return 'shield-checkmark';
  }

  if (user.role === 'admin' || user.role === 'super_admin') {
    return 'shield';
  }

  return null;
};

/**
 * Get role icon color for user
 */
export const getRoleIconColor = (user: User | null): string | null => {
  if (!user) return null;

  if (user.role === 'department_head') {
    return '#F59E0B';
  }

  if (user.role === 'admin' || user.role === 'super_admin') {
    return '#8B5CF6';
  }

  return null;
};
