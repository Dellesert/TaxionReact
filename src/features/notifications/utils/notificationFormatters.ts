/**
 * Notification Formatters
 * Функции форматирования для уведомлений
 */

/**
 * Получить название экрана для навигации по типу уведомления
 * @param type - тип уведомления
 * @param data - данные уведомления (для определения типа по содержимому)
 */
export const getNavigationScreenByType = (
  type: string,
  data?: Record<string, unknown>
): string | null => {
  // Special case: если это reminder с event_id, то это напоминание о событии
  if (type === 'reminder' && data?.event_id) {
    return 'Calendar';
  }

  switch (type) {
    case 'message':
    case 'mention':
    case 'reaction':
      return 'Chats';
    case 'task':
    case 'reminder':
      return 'Tasks';
    case 'poll':
      return 'Polls';
    case 'event':
      return 'Calendar';
    case 'system':
      return null; // System notifications don't navigate anywhere
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
    case 'mention':
    case 'reaction':
      if (data.chat_id) {
        return {
          screen: 'Chat',
          params: { chatId: data.chat_id },
        };
      }
      return null;
    case 'task':
    case 'reminder':
      // If reminder has event_id, it's an event reminder - handle it separately
      if (type === 'reminder' && data.event_id) {
        return { eventId: data.event_id };
      }

      // For task notifications
      if (data.task_id) {
        return { taskId: data.task_id };
      }
      // For grouped task notifications (e.g., overdue tasks, no progress tasks)
      if (data.task_ids && Array.isArray(data.task_ids) && data.task_ids.length > 0) {
        // Navigate to first task in the group, or to filtered task list
        if (data.category) {
          // Navigate to task list with filter
          return {
            filterCategory: data.category,
            taskIds: data.task_ids
          };
        } else {
          // Navigate to first task
          return { taskId: data.task_ids[0] };
        }
      }
      return null;
    case 'poll':
      if (data.poll_id) {
        return {
          screen: 'PollDetail',
          params: { pollId: data.poll_id },
        };
      }
      return null;
    case 'event':
      // For events, always navigate to calendar
      // If there's an event_id, we could potentially scroll to it in the future
      if (data.event_id) {
        return { eventId: data.event_id };
      }
      // Even without event_id, allow navigation to calendar
      return { navigateToCalendar: true };
    case 'system':
      return null;
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
