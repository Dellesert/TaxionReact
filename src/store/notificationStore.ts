/**
 * Notification Store
 * Zustand store для управления уведомлениями
 */

import { create } from 'zustand';
import { Notification, NotificationPreferences } from '@types/notification.types';
import * as notificationApi from '@api/notification.api';

interface NotificationState {
  // State
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;

  // Actions
  loadNotifications: (refresh?: boolean) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markMultipleAsRead: (notificationIds: number[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: number) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  handleNewNotification: (notification: Notification) => void;
  clearError: () => void;
}

const NOTIFICATIONS_PER_PAGE = 20;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  preferences: null,
  isLoading: false,
  error: null,
  hasMore: true,

  /**
   * Load notifications
   */
  loadNotifications: async (refresh = false) => {
    try {
      console.log('📬 Loading notifications...');
      set({ isLoading: true, error: null });

      const response = await notificationApi.getNotifications(
        {},
        { limit: NOTIFICATIONS_PER_PAGE, offset: 0 }
      );

      console.log('✅ Notifications loaded:', response.data.length, 'items');
      console.log('First notification:', response.data[0]);

      set({
        notifications: response.data,
        hasMore: response.hasMore,
        isLoading: false,
      });

      // Also load unread count
      get().loadUnreadCount();
    } catch (error: any) {
      console.error('❌ Failed to load notifications:', error);
      set({
        error: error.message || 'Failed to load notifications',
        isLoading: false,
      });
    }
  },

  /**
   * Load more notifications (pagination)
   */
  loadMoreNotifications: async () => {
    const { notifications, hasMore, isLoading } = get();

    if (!hasMore || isLoading) {
      return;
    }

    try {
      set({ isLoading: true, error: null });

      const response = await notificationApi.getNotifications(
        {},
        {
          limit: NOTIFICATIONS_PER_PAGE,
          offset: notifications.length,
        }
      );

      set({
        notifications: [...notifications, ...response.data],
        hasMore: response.hasMore,
        isLoading: false,
      });
    } catch (error: any) {
      console.error('Failed to load more notifications:', error);
      set({
        error: error.message || 'Failed to load more notifications',
        isLoading: false,
      });
    }
  },

  /**
   * Load unread count
   */
  loadUnreadCount: async () => {
    try {
      const count = await notificationApi.getUnreadCount();
      set({ unreadCount: count });
    } catch (error: any) {
      console.error('Failed to load unread count:', error);
    }
  },

  /**
   * Load notification preferences
   */
  loadPreferences: async () => {
    try {
      const preferences = await notificationApi.getNotificationPreferences();
      set({ preferences });
    } catch (error: any) {
      set({ error: error.message || 'Failed to load preferences' });
    }
  },

  /**
   * Update notification preferences
   */
  updatePreferences: async (updates: Partial<NotificationPreferences>) => {
    try {
      set({ isLoading: true, error: null });

      const updatedPreferences = await notificationApi.updateNotificationPreferences(updates);

      set({
        preferences: updatedPreferences,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update preferences',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Mark single notification as read
   */
  markAsRead: async (notificationId: number) => {
    try {
      await notificationApi.markNotificationRead(notificationId);

      set((state) => ({
        notifications: state.notifications.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark as read' });
    }
  },

  /**
   * Mark multiple notifications as read
   */
  markMultipleAsRead: async (notificationIds: number[]) => {
    try {
      await notificationApi.markNotificationsRead({ notification_ids: notificationIds });

      set((state) => ({
        notifications: state.notifications.map((notif) =>
          notificationIds.includes(notif.id) ? { ...notif, is_read: true } : notif
        ),
        unreadCount: Math.max(
          0,
          state.unreadCount - notificationIds.length
        ),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark as read' });
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    try {
      await notificationApi.markAllNotificationsRead();

      set((state) => ({
        notifications: state.notifications.map((notif) => ({
          ...notif,
          is_read: true,
        })),
        unreadCount: 0,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark all as read' });
    }
  },

  /**
   * Delete single notification
   */
  deleteNotification: async (notificationId: number) => {
    try {
      await notificationApi.deleteNotification(notificationId);

      set((state) => {
        const deletedNotif = state.notifications.find((n) => n.id === notificationId);
        const wasUnread = deletedNotif && !deletedNotif.is_read;

        return {
          notifications: state.notifications.filter((notif) => notif.id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete notification' });
      throw error;
    }
  },

  /**
   * Delete all notifications
   */
  deleteAllNotifications: async () => {
    try {
      await notificationApi.deleteAllNotifications();

      set({
        notifications: [],
        unreadCount: 0,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete all notifications' });
      throw error;
    }
  },

  /**
   * Handle new notification from push/WebSocket
   */
  handleNewNotification: (notification: Notification) => {
    console.log('✅ [NotificationStore] handleNewNotification called:', notification.id, notification.title);
    set((state) => {
      const newUnreadCount = state.unreadCount + 1;
      console.log('📊 [NotificationStore] Updating state - new unread count:', newUnreadCount);
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: newUnreadCount,
      };
    });
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },
}));
