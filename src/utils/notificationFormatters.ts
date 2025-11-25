/**
 * Notification Formatters
 * Функции форматирования для уведомлений
 */

/**
 * Получить название экрана для навигации по типу уведомления
 */
export const getNavigationScreenByType = (
  type: string
): string | null => {
  switch (type) {
    case 'message':
      return 'Chats';
    case 'task':
      return 'TaskDetail';
    case 'poll':
      return 'Polls';
    case 'calendar':
      return 'Calendar';
    default:
      return null;
  }
};

/**
 * Получить параметры навигации для уведомления
 */
export const getNavigationParams = (
  type: string,
  data: Record<string, unknown>
): Record<string, unknown> | null => {
  switch (type) {
    case 'message':
      if (data.chat_id) {
        return {
          screen: 'Chat',
          params: { chatId: data.chat_id },
        };
      }
      return null;
    case 'task':
      if (data.task_id) {
        return { taskId: data.task_id };
      }
      return null;
    case 'poll':
      if (data.poll_id) {
        return {
          screen: 'PollDetails',
          params: { pollId: data.poll_id },
        };
      }
      return null;
    case 'calendar':
      return {};
    default:
      return null;
  }
};

/**
 * Форматирование текста пустого состояния
 */
export const getEmptyStateText = (): { title: string; subtitle: string } => {
  return {
    title: 'Нет уведомлений',
    subtitle: 'Здесь будут отображаться ваши уведомления',
  };
};
