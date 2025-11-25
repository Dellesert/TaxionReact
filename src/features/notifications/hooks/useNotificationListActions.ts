/**
 * Custom Hook: useNotificationListActions
 * Управление действиями со списком уведомлений
 */

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useNotificationStore } from '@store/notificationStore';
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
  const navigation = useNavigation();
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
      const screenName = getNavigationScreenByType(notification.type);
      const params = notification.data
        ? getNavigationParams(notification.type, notification.data)
        : null;

      if (screenName && params) {
        // @ts-ignore - Navigation types are complex, ignoring for now
        navigation.navigate(screenName, params);
      }
    },
    [markAsRead, navigation]
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
