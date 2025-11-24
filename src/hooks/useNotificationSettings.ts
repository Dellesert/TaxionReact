import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '@contexts/NotificationContext';
import {
  getUserPreferences,
  updateUserPreference,
  NotificationType,
  NotificationPriority,
} from '@api/notificationPreferences.api';

export interface NotificationSettings {
  // Основные каналы
  push: boolean;
  email: boolean;
  sms: boolean;

  // Категории уведомлений
  message: boolean;
  mention: boolean;
  task: boolean;
  poll: boolean;
  calendar: boolean;
  system: boolean;

  // Расширенные настройки
  minPriority: NotificationPriority;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  weekendEnabled: boolean;
  digestEnabled: boolean;
  digestFrequency: number | null;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  push: true,
  email: false,
  sms: false,
  message: true,
  mention: true,
  task: true,
  poll: true,
  calendar: true,
  system: true,
  minPriority: 'low',
  quietHoursStart: null,
  quietHoursEnd: null,
  weekendEnabled: true,
  digestEnabled: false,
  digestFrequency: null,
};

const ALL_NOTIFICATION_TYPES: NotificationType[] = [
  'message',
  'mention',
  'task',
  'poll',
  'calendar',
  'system',
];

/**
 * Hook for managing notification settings
 */
export const useNotificationSettings = () => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  /**
   * Load preferences from API
   */
  const loadPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const prefs = await getUserPreferences();

      const newSettings: NotificationSettings = { ...DEFAULT_SETTINGS };

      // Берем настройки из первого типа уведомлений (они общие для всех типов)
      const firstPref = prefs[0];
      if (firstPref) {
        newSettings.minPriority = firstPref.min_priority;
        newSettings.quietHoursStart = firstPref.quiet_hours_start ?? null;
        newSettings.quietHoursEnd = firstPref.quiet_hours_end ?? null;
        newSettings.weekendEnabled = firstPref.weekend_enabled;
        newSettings.digestEnabled = firstPref.digest_enabled;
        newSettings.digestFrequency = firstPref.digest_frequency ?? null;
      }

      prefs.forEach((pref) => {
        // Проверяем, включены ли каналы хотя бы для одного типа
        if (pref.push_enabled) newSettings.push = true;
        if (pref.email_enabled) newSettings.email = true;
        if (pref.sms_enabled) newSettings.sms = true;

        // Сохраняем настройки для каждого типа
        if (pref.notification_type === 'message') {
          newSettings.message = pref.in_app_enabled;
        } else if (pref.notification_type === 'mention') {
          newSettings.mention = pref.in_app_enabled;
        } else if (pref.notification_type === 'task') {
          newSettings.task = pref.in_app_enabled;
        } else if (pref.notification_type === 'poll') {
          newSettings.poll = pref.in_app_enabled;
        } else if (pref.notification_type === 'calendar') {
          newSettings.calendar = pref.in_app_enabled;
        } else if (pref.notification_type === 'system') {
          newSettings.system = pref.in_app_enabled;
        }
      });

      setSettings(newSettings);
    } catch (error: any) {
      console.error('Error loading preferences:', error);
      showError(error.message || 'Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  /**
   * Update channel setting (push, email, sms)
   */
  const handleToggleChannel = useCallback(
    async (channel: 'push' | 'email' | 'sms', value: boolean) => {
      setSettings((prev) => ({ ...prev, [channel]: value }));
      setSaving(channel);

      try {
        const fieldMap = {
          push: 'push_enabled',
          email: 'email_enabled',
          sms: 'sms_enabled',
        };

        await Promise.all(
          ALL_NOTIFICATION_TYPES.map((type) =>
            updateUserPreference(type, {
              [fieldMap[channel]]: value,
            })
          )
        );

        showSuccess('Настройки сохранены');
      } catch (error: any) {
        console.error('Error updating channel:', error);
        showError(error.message || 'Не удалось сохранить настройки');
        // Откатываем изменение
        setSettings((prev) => ({ ...prev, [channel]: !value }));
      } finally {
        setSaving(null);
      }
    },
    [showSuccess, showError]
  );

  /**
   * Update notification type setting
   */
  const handleToggleType = useCallback(
    async (type: NotificationType, value: boolean) => {
      const key = type as keyof NotificationSettings;
      setSettings((prev) => ({ ...prev, [key]: value }));
      setSaving(type);

      try {
        await updateUserPreference(type, {
          in_app_enabled: value,
        });

        showSuccess('Настройки сохранены');
      } catch (error: any) {
        console.error('Error updating type:', error);
        showError(error.message || 'Не удалось сохранить настройки');
        // Откатываем изменение
        setSettings((prev) => ({ ...prev, [key]: !value }));
      } finally {
        setSaving(null);
      }
    },
    [showSuccess, showError]
  );

  /**
   * Update advanced setting for all notification types
   */
  const updateAdvancedSetting = useCallback(
    async (field: string, value: any) => {
      setSaving(field);

      try {
        await Promise.all(
          ALL_NOTIFICATION_TYPES.map((type) =>
            updateUserPreference(type, {
              [field]: value,
            })
          )
        );

        showSuccess('Настройки сохранены');
      } catch (error: any) {
        console.error('Error updating advanced setting:', error);
        showError(error.message || 'Не удалось сохранить настройки');
        throw error;
      } finally {
        setSaving(null);
      }
    },
    [showSuccess, showError]
  );

  /**
   * Update priority setting
   */
  const handlePriorityChange = useCallback(
    async (priority: NotificationPriority) => {
      const oldValue = settings.minPriority;
      setSettings((prev) => ({ ...prev, minPriority: priority }));

      try {
        await updateAdvancedSetting('min_priority', priority);
      } catch (error) {
        setSettings((prev) => ({ ...prev, minPriority: oldValue }));
      }
    },
    [settings.minPriority, updateAdvancedSetting]
  );

  /**
   * Update quiet hours setting
   */
  const handleQuietHoursChange = useCallback(
    async (type: 'start' | 'end', hour: number) => {
      const field = type === 'start' ? 'quietHoursStart' : 'quietHoursEnd';
      const apiField = type === 'start' ? 'quiet_hours_start' : 'quiet_hours_end';
      const oldValue = settings[field];

      setSettings((prev) => ({ ...prev, [field]: hour }));

      try {
        await updateAdvancedSetting(apiField, hour);
      } catch (error) {
        setSettings((prev) => ({ ...prev, [field]: oldValue }));
      }
    },
    [settings, updateAdvancedSetting]
  );

  /**
   * Update advanced toggle settings
   */
  const handleToggleAdvanced = useCallback(
    async (field: 'weekendEnabled' | 'digestEnabled', value: boolean) => {
      const apiField = field === 'weekendEnabled' ? 'weekend_enabled' : 'digest_enabled';
      setSettings((prev) => ({ ...prev, [field]: value }));

      try {
        await updateAdvancedSetting(apiField, value);
      } catch (error) {
        setSettings((prev) => ({ ...prev, [field]: !value }));
      }
    },
    [updateAdvancedSetting]
  );

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    loading,
    saving,
    settings,
    handleToggleChannel,
    handleToggleType,
    handlePriorityChange,
    handleQuietHoursChange,
    handleToggleAdvanced,
  };
};
