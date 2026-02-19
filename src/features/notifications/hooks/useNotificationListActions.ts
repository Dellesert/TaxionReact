/**
 * Custom Hook: useNotificationListActions
 * Управление действиями со списком уведомлений
 */

import { useCallback } from 'react';
import { useUniversalNavigation } from '@shared/hooks/useUniversalNavigation';
import { useNotificationStore } from '@shared/store/notificationStore';
import { Notification } from '@/types/notification.types';
import {
  getNavigationScreenByType,
  getNavigationParams,
} from '../utils/notificationFormatters';
import { canLoadMore } from '../utils/notificationHelpers';

interface UseNotificationListActionsReturn {
  handleRefresh: () => void;
  handleLoadMore: () => void;
  handleNotificationPress: (notification: Notification) => void;
  handleMarkAllAsRead: () => void;
}

export const useNotificationListActions = (
  isLoading: boolean,
  hasMore: boolean
): UseNotificationListActionsReturn => {
  const { navigate } = useUniversalNavigation();
  const {
    loadNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  // Refresh handler
  const handleRefresh = useCallback(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (canLoadMore(isLoading, hasMore)) {
      loadMoreNotifications();
    }
  }, [isLoading, hasMore, loadMoreNotifications]);

  // Notification press handler
  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      // Mark as read if unread
      if (!notification.is_read) {
        markAsRead(notification.id);
      }

      // Navigate to corresponding screen based on type
      const screenName = getNavigationScreenByType(notification.type, notification.data);
      const params = notification.data
        ? getNavigationParams(notification.type, notification.data)
        : null;

      if (screenName && params) {
        navigate(screenName, params);
      } else {
        console.warn('[Notification] No navigation - screenName or params missing', {
          screenName,
          params,
          type: notification.type
        });
      }
    },
    [markAsRead, navigate]
  );

  // Mark all as read handler
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  return {
    handleRefresh,
    handleLoadMore,
    handleNotificationPress,
    handleMarkAllAsRead,
  };
};
