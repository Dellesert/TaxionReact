/**
 * Notification API
 * API клиент для работы с уведомлениями
 */

import api from './axios.config';
import { API_ENDPOINTS, PAGINATION } from '@constants/api.constants';
import {
  Notification,
  NotificationPreferences,
  UpdateNotificationPreferencesDto,
  MarkNotificationsReadDto,
  NotificationListFilters,
  NotificationStats,
  PushTokenDto,
} from '../types/notification.types';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/common.types';

// ============= Notification Operations =============

/**
 * Get list of notifications with filters
 */
export const getNotifications = async (
  filters?: NotificationListFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Notification>> => {
  const params = {
    ...filters,
    limit: pagination?.limit || PAGINATION.DEFAULT_LIMIT,
    offset: pagination?.offset || PAGINATION.DEFAULT_OFFSET,
  };

  const response = await api.get<ApiResponse<PaginatedResponse<Notification>>>(
    API_ENDPOINTS.NOTIFICATION.LIST,
    { params }
  );
  return response.data.data;
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get<ApiResponse<{ count: number }>>(
    API_ENDPOINTS.NOTIFICATION.UNREAD_COUNT
  );
  return response.data.data.count;
};

/**
 * Get notification by ID
 */
export const getNotification = async (id: number): Promise<Notification> => {
  const response = await api.get<ApiResponse<Notification>>(
    API_ENDPOINTS.NOTIFICATION.BY_ID(id)
  );
  return response.data.data;
};

/**
 * Mark single notification as read
 */
export const markNotificationRead = async (id: number): Promise<void> => {
  await api.put(API_ENDPOINTS.NOTIFICATION.MARK_READ(id));
};

/**
 * Mark multiple notifications as read
 */
export const markNotificationsRead = async (data: MarkNotificationsReadDto): Promise<void> => {
  await api.put(API_ENDPOINTS.NOTIFICATION.MARK_MULTIPLE_READ, data);
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsRead = async (): Promise<void> => {
  await api.put(API_ENDPOINTS.NOTIFICATION.MARK_ALL_READ);
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async (): Promise<NotificationStats> => {
  const response = await api.get<ApiResponse<NotificationStats>>(
    API_ENDPOINTS.NOTIFICATION.STATS
  );
  return response.data.data;
};

/**
 * Search notifications
 */
export const searchNotifications = async (
  query: string,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Notification>> => {
  const params = {
    query,
    limit: pagination?.limit || PAGINATION.DEFAULT_LIMIT,
    offset: pagination?.offset || PAGINATION.DEFAULT_OFFSET,
  };

  const response = await api.get<ApiResponse<PaginatedResponse<Notification>>>(
    API_ENDPOINTS.NOTIFICATION.SEARCH,
    { params }
  );
  return response.data.data;
};

// ============= Notification Preferences =============

/**
 * Get notification preferences
 */
export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const response = await api.get<ApiResponse<NotificationPreferences>>(
    API_ENDPOINTS.NOTIFICATION.PREFERENCES
  );
  return response.data.data;
};

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = async (
  data: UpdateNotificationPreferencesDto
): Promise<NotificationPreferences> => {
  const response = await api.put<ApiResponse<NotificationPreferences>>(
    API_ENDPOINTS.NOTIFICATION.UPDATE_PREFERENCES,
    data
  );
  return response.data.data;
};

// ============= Push Notifications =============

/**
 * Register push notification token
 */
export const registerPushToken = async (data: PushTokenDto): Promise<void> => {
  await api.post('/notifications/push-token', data);
};

/**
 * Unregister push notification token
 */
export const unregisterPushToken = async (token: string): Promise<void> => {
  await api.delete('/notifications/push-token', { data: { token } });
};
