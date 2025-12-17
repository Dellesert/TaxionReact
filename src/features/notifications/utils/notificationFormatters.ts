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
    case 'calendar':
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
/**
 * Преобразует значение в число (FCM отправляет все как строки)
 */
const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

export const getNavigationParams = (
  type: string,
  data: Record<string, unknown>
): Record<string, unknown> | null => {
  switch (type) {
    case 'message':
    case 'mention':
    case 'reaction':
      const chatId = toNumber(data.chat_id);
      if (chatId) {
        return {
          screen: 'Chat',
          params: { chatId },
        };
      }
      return null;
    case 'task':
    case 'reminder':
      // If reminder has event_id, it's an event reminder - handle it separately
      const eventIdFromReminder = toNumber(data.event_id);
      if (type === 'reminder' && eventIdFromReminder) {
        return { eventId: eventIdFromReminder };
      }

      // For task notifications
      const taskId = toNumber(data.task_id);
      if (taskId) {
        return { taskId };
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
          const firstTaskId = toNumber(data.task_ids[0]);
          return firstTaskId ? { taskId: firstTaskId } : null;
        }
      }
      return null;
    case 'poll':
      const pollId = toNumber(data.poll_id);
      if (pollId) {
        return {
          screen: 'PollDetail',
          params: { pollId },
        };
      }
      return null;
    case 'event':
    case 'calendar':
      // For events, always navigate to calendar
      // If there's an event_id, we could potentially scroll to it in the future
      const eventId = toNumber(data.event_id);
      if (eventId) {
        return { eventId };
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
