/**
 * Create Chat Helper Functions
 * Вспомогательные функции для создания чата
 */

import { User } from '@/types/user.types';

/**
 * Filter out current user from users list
 */
export const filterOutCurrentUser = (users: User[], currentUserId: number | undefined): User[] => {
  if (!currentUserId) return users;
  return users.filter((user) => user.id !== currentUserId);
};

/**
 * Filter out super admin users from list
 */
export const filterOutAdmins = (users: User[]): User[] => {
  return users.filter((user) => user.role !== 'super_admin');
};

/**
 * Filter users by search query
 */
export const filterUsersBySearch = (users: User[], searchQuery: string): User[] => {
  if (!searchQuery.trim()) return users;

  const query = searchQuery.toLowerCase();
  return users.filter((user) => {
    const searchText = `${user.name} ${user.email}`.toLowerCase();
    return searchText.includes(query);
  });
};

/**
 * Check if user can be selected based on chat type
 */
export const canSelectUser = (
  chatType: 'private' | 'group',
  selectedUsers: number[],
  userId: number
): boolean => {
  if (chatType === 'private') {
    return selectedUsers.length === 0 || selectedUsers.includes(userId);
  }
  return true;
};

/**
 * Get initials from user name
 */
export const getUserInitials = (name: string): string => {
  const words = name.split(' ');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Sort users: department heads first, then by name
 */
export const sortUsers = (users: User[]): User[] => {
  return [...users].sort((a, b) => {
    const aIsDeptHead = a.role === 'department_head';
    const bIsDeptHead = b.role === 'department_head';

    if (aIsDeptHead && !bIsDeptHead) return -1;
    if (!aIsDeptHead && bIsDeptHead) return 1;

    return a.name.localeCompare(b.name);
  });
};

/**
 * Check if all users in array are selected
 */
export const areAllUsersSelected = (userIds: number[], selectedUserIds: number[]): boolean => {
  return userIds.every((id) => selectedUserIds.includes(id));
};

/**
 * Check if some (but not all) users in array are selected
 */
export const areSomeUsersSelected = (userIds: number[], selectedUserIds: number[]): boolean => {
  const allSelected = areAllUsersSelected(userIds, selectedUserIds);
  const someSelected = userIds.some((id) => selectedUserIds.includes(id));
  return someSelected && !allSelected;
};

/**
 * Validate chat creation
 */
export const validateChatCreation = (
  chatType: 'private' | 'group',
  chatName: string,
  selectedUsers: number[]
): { isValid: boolean; error?: string } => {
  // Валидация для группового чата
  if (chatType === 'group') {
    if (!chatName.trim()) {
      return { isValid: false, error: 'Введите название группового чата' };
    }
  }

  // Валидация количества участников
  if (selectedUsers.length === 0) {
    return { isValid: false, error: 'Выберите хотя бы одного участника' };
  }

  if (chatType === 'private' && selectedUsers.length > 1) {
    return { isValid: false, error: 'Личный чат может быть только с одним пользователем' };
  }

  return { isValid: true };
};

/**
 * Get final chat name based on chat type
 */
export const getFinalChatName = (chatType: 'private' | 'group', chatName: string): string => {
  return chatType === 'private' ? '' : chatName.trim();
};

/**
 * Check if chat can be created
 */
export const canCreateChat = (
  chatType: 'private' | 'group',
  chatName: string,
  selectedUsers: number[]
): boolean => {
  if (chatType === 'private') {
    return selectedUsers.length === 1;
  }
  return chatName.trim().length > 0 && selectedUsers.length > 0;
};
