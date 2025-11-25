/**
 * Custom Hook: useNotificationListData
 * Управление данными списка уведомлений
 */

import { useEffect } from 'react';
import { useNotificationStore } from '@store/notificationStore';

interface UseNotificationListDataReturn {
  notifications: any[];
  isLoading: boolean;
  hasMore: boolean;
  unreadCount: number;
}

export const useNotificationListData = (): UseNotificationListDataReturn => {
  const {
    notifications,
    isLoading,
    hasMore,
    unreadCount,
    loadNotifications,
  } = useNotificationStore();

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  return {
    notifications,
    isLoading,
    hasMore,
    unreadCount,
  };
};
