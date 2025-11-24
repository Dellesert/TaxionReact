/**
 * API для работы с настройками уведомлений пользователя
 */

import api from './axios.config';

export type NotificationType = 'message' | 'task' | 'calendar' | 'system' | 'mention' | 'poll' | 'reminder' | 'announce';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface UserNotificationPreference {
  id: number;
  user_id: number;
  notification_type: NotificationType;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  min_priority: NotificationPriority;
  quiet_hours_start?: number;
  quiet_hours_end?: number;
  weekend_enabled: boolean;
  digest_enabled: boolean;
  digest_frequency?: number;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferenceRequest {
  notification_type: NotificationType;
  in_app_enabled?: boolean;
  email_enabled?: boolean;
  push_enabled?: boolean;
  sms_enabled?: boolean;
  min_priority?: NotificationPriority;
  quiet_hours_start?: number;
  quiet_hours_end?: number;
  weekend_enabled?: boolean;
  digest_enabled?: boolean;
  digest_frequency?: number;
}

/**
 * Получить настройки уведомлений пользователя
 */
export const getUserPreferences = async (): Promise<UserNotificationPreference[]> => {
  const response = await api.get<{ preferences: UserNotificationPreference[] }>(
    '/notifications/preferences'
  );
  return response.data.preferences || [];
};

/**
 * Обновить настройки уведомлений для конкретного типа
 */
export const updateUserPreference = async (
  type: NotificationType,
  preferences: Omit<UpdatePreferenceRequest, 'notification_type'>
): Promise<UserNotificationPreference> => {
  const payload = {
    notification_type: type,
    ...preferences,
  };

  console.log(`📡 API: Updating "${type}"`);
  console.log('📡 Preferences:', preferences);
  console.log('📡 Full payload:', payload);
  console.log('📡 JSON:', JSON.stringify(payload, null, 2));

  const response = await api.put<{ preference: UserNotificationPreference }>(
    `/notifications/preferences/${type}`,
    payload
  );

  console.log(`📡 Response for "${type}":`, response.data);
  return response.data.preference;
};
