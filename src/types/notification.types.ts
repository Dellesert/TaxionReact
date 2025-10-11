/**
 * Notification Types
 * Типы для работы с уведомлениями
 */

import { ISODateString } from './common.types';

// Notification Types
export type NotificationType =
  | 'message'
  | 'task'
  | 'event'
  | 'poll'
  | 'system'
  | 'mention'
  | 'reaction';

// Notification Priority
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Notification Interface
export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>; // Additional payload data
  is_read: boolean;
  priority: NotificationPriority;
  action_url?: string; // Deep link URL
  image_url?: string;
  created_at: ISODateString;
  read_at?: ISODateString;
}

// Notification Preferences Interface
export interface NotificationPreferences {
  id: number;
  user_id: number;

  // Channel preferences
  push_enabled: boolean;
  email_enabled: boolean;
  in_app_enabled: boolean;

  // Type preferences
  message_notifications: boolean;
  task_notifications: boolean;
  event_notifications: boolean;
  poll_notifications: boolean;
  system_notifications: boolean;
  mention_notifications: boolean;
  reaction_notifications: boolean;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string; // Format: "HH:mm"
  quiet_hours_end?: string; // Format: "HH:mm"

  // Grouping
  group_notifications: boolean;

  updated_at: ISODateString;
}

// Update Notification Preferences DTO
export interface UpdateNotificationPreferencesDto {
  push_enabled?: boolean;
  email_enabled?: boolean;
  in_app_enabled?: boolean;
  message_notifications?: boolean;
  task_notifications?: boolean;
  event_notifications?: boolean;
  poll_notifications?: boolean;
  system_notifications?: boolean;
  mention_notifications?: boolean;
  reaction_notifications?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  group_notifications?: boolean;
}

// Mark Notifications Read DTO
export interface MarkNotificationsReadDto {
  notification_ids: number[];
}

// Notification List Filters
export interface NotificationListFilters {
  type?: NotificationType;
  is_read?: boolean;
  priority?: NotificationPriority;
  from_date?: ISODateString;
  to_date?: ISODateString;
}

// Notification Statistics
export interface NotificationStats {
  total: number;
  unread: number;
  by_type: {
    [K in NotificationType]: number;
  };
  by_priority: {
    [K in NotificationPriority]: number;
  };
}

// Push Notification Token
export interface PushTokenDto {
  token: string;
  platform: 'ios' | 'android' | 'web';
}
