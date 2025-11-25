/**
 * Create Chat Formatter Functions
 * Функции форматирования для создания чата
 */

/**
 * Get status color based on user status
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'online':
      return '#10B981';
    case 'busy':
      return '#EF4444';
    case 'away':
      return '#F59E0B';
    default:
      return '#9CA3AF';
  }
};

/**
 * Get role text in Russian
 */
export const getRoleText = (role: string): string => {
  switch (role) {
    case 'super_admin':
      return 'Супер администратор';
    case 'admin':
      return 'Администратор';
    case 'manager':
      return 'Менеджер';
    case 'employee':
      return 'Сотрудник';
    case 'department_head':
      return 'Руководитель отдела';
    default:
      return 'Пользователь';
  }
};

/**
 * Format user count text with proper Russian plural form
 */
export const formatUserCount = (count: number): string => {
  if (count === 1) {
    return '1 пользователь';
  } else if (count >= 2 && count <= 4) {
    return `${count} пользователя`;
  } else {
    return `${count} пользователей`;
  }
};

/**
 * Get error message for user loading
 */
export const getLoadUsersErrorMessage = (error: { code?: string; status?: number; message?: string }): string => {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
    return `Ошибка подключения к серверу.\n\nПроверьте:\n1. Запущен ли бэкенд на ${apiBaseUrl}\n2. Доступен ли endpoint /users\n3. Нет ли проблем с CORS`;
  } else if (error.status === 401) {
    return 'Ошибка авторизации. Войдите в систему заново.';
  } else if (error.status === 403) {
    return 'Недостаточно прав для просмотра списка пользователей.';
  }

  return 'Не удалось загрузить список пользователей.';
};

/**
 * Format department name
 */
export const formatDepartmentName = (departmentName: string | undefined, departmentId: number | null): string => {
  if (departmentName) {
    return departmentName;
  }
  if (departmentId !== null) {
    return `Подразделение ${departmentId}`;
  }
  return 'Без подразделения';
};
