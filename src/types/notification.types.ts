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
  | 'reaction'
  | 'reminder';

// Notification Priority
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// Notification Sender Interface
export interface NotificationSender {
  id: number;
  name: string;
  avatar_url?: string;
}

// Notification Interface
export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: {
    chat_id?: number;
    task_id?: number;
    task_ids?: number[]; // For grouped task notifications
    task_count?: number; // Number of tasks in group
    poll_id?: number;
    event_id?: number;
    category?: string; // e.g., "overdue", "no_progress", etc.
    [key: string]: unknown;
  };
  is_read: boolean;
  priority: NotificationPriority;
  action_url?: string; // Deep link URL
  image_url?: string;
  created_at: ISODateString;
  read_at?: ISODateString;
  updated_at?: ISODateString;
  related_type?: string; // Type of related entity (e.g., "task", "message")

  // Grouping fields
  message_count?: number; // Number of grouped messages
  sender_id?: number;
  sender?: NotificationSender;
  group_key?: string; // Key for grouping notifications
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
