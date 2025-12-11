/**
 * Chat Settings Formatter Functions
 * Функции форматирования для настроек чата
 */

/**
 * Get system role label in Russian
 */
export const getSystemRoleLabel = (role: string): string => {
  switch (role) {
    case 'super_admin':
      return 'Супер Админ';
    case 'admin':
      return 'Администратор';
    case 'department_head':
      return 'Руководитель отдела';
    case 'manager':
      return 'Менеджер';
    case 'employee':
      return 'Сотрудник';
    default:
      return role;
  }
};

/**
 * Get chat role label in Russian
 */
export const getChatRoleLabel = (role: string): string => {
  switch (role) {
    case 'owner':
      return 'Владелец';
    case 'admin':
      return 'Администратор';
    default:
      return ''; // Don't show label for regular members
  }
};

/**
 * Get chat role color
 */
export const getChatRoleColor = (role: string, primaryColor: string, textSecondary: string): string => {
  switch (role) {
    case 'owner':
      return '#E94444';
    case 'admin':
      return primaryColor;
    default:
      return textSecondary;
  }
};

/**
 * Get last seen text for user status
 */
export const getLastSeenText = (status: string, lastActiveAt?: string): string => {
  if (status === 'online') {
    return 'В сети';
  }

  if (!lastActiveAt) {
    return 'Был(а) давно';
  }

  const lastActive = new Date(lastActiveAt);
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Только что';
  } else if (diffMins < 60) {
    return `Был(а) ${diffMins} мин. назад`;
  } else if (diffHours < 24) {
    return `Был(а) ${diffHours} ч. назад`;
  } else if (diffDays === 1) {
    return 'Был(а) вчера';
  } else if (diffDays < 7) {
    return `Был(а) ${diffDays} дн. назад`;
  } else {
    return 'Был(а) давно';
  }
};

/**
 * Format members count with proper Russian plural form
 */
export const formatMembersCount = (count: number): string => {
  if (count === 1) {
    return '1 участник';
  } else if (count < 5) {
    return `${count} участника`;
  } else {
    return `${count} участников`;
  }
};
