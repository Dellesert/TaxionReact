/**
 * Notification Helpers
 * Вспомогательные функции для работы с уведомлениями
 */

import { Notification } from '@/types/notification.types';
import { NotificationPriority } from '../api/notificationPreferences.api';

// ===== Notification List Helpers =====

/**
 * Проверка, следует ли показывать кнопку "Отметить все как прочитанное"
 */
export const shouldShowMarkAllButton = (unreadCount: number): boolean => {
  return unreadCount > 0;
};

/**
 * Проверка, следует ли загружать еще уведомлений
 */
export const canLoadMore = (isLoading: boolean, hasMore: boolean): boolean => {
  return !isLoading && hasMore;
};

/**
 * Проверка, пустой ли список уведомлений
 */
export const isNotificationListEmpty = (notifications: Notification[]): boolean => {
  return notifications.length === 0;
};

/**
 * Проверка, нужно ли показывать футер загрузки
 */
export const shouldShowLoadingFooter = (
  hasMore: boolean,
  notificationsCount: number,
  isLoading: boolean
): boolean => {
  return hasMore && notificationsCount > 0 && isLoading;
};

// ===== Notification Settings Helpers =====

/**
 * Format hour number to time string (HH:00)
 */
export const formatHour = (hour: number | null): string => {
  if (hour === null) return 'Не установлено';
  return `${hour.toString().padStart(2, '0')}:00`;
};

/**
 * Get priority label in Russian
 */
export const getPriorityLabel = (priority: NotificationPriority): string => {
  const labels: Record<NotificationPriority, string> = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    critical: 'Критический',
  };
  return labels[priority];
};

/**
 * Get all available priority options
 */
export const getPriorityOptions = (): NotificationPriority[] => {
  return ['low', 'medium', 'high', 'critical'];
};

/**
 * Get all available hours (0-23)
 */
export const getHourOptions = (): number[] => {
  return Array.from({ length: 24 }, (_, i) => i);
};
