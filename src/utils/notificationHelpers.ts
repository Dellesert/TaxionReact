/**
 * Notification settings helper functions
 */

import { NotificationPriority } from '@api/notificationPreferences.api';

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
