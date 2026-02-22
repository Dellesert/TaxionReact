import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '@shared/contexts/NotificationContext';
import {
  getUserPreferences,
  updateUserPreference,
  NotificationType,
  NotificationPriority,
} from '../api/notificationPreferences.api';
import {
  getGlobalMutePreferences,
  updateGlobalMutePreferences,
} from '@/features/chat/api/chat.api';

export interface NotificationSettings {
  // Основные каналы
  push: boolean;
  email: boolean;
  sms: boolean;

  // Глобальное отключение уведомлений от групп/каналов
  muteAllGroups: boolean;
  muteAllChannels: boolean;

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
  muteAllGroups: false,
  muteAllChannels: false,
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
      const [prefs, mutePrefs] = await Promise.all([
        getUserPreferences(),
        getGlobalMutePreferences(),
      ]);

      const newSettings: NotificationSettings = { ...DEFAULT_SETTINGS };

      // Глобальные mute-настройки (muted = timestamp в будущем)
      const now = new Date();
      newSettings.muteAllGroups = mutePrefs.mute_all_groups_until
        ? new Date(mutePrefs.mute_all_groups_until) > now
        : false;
      newSettings.muteAllChannels = mutePrefs.mute_all_channels_until
        ? new Date(mutePrefs.mute_all_channels_until) > now
        : false;

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

      // Сбрасываем каналы в false перед проверкой
      newSettings.push = false;
      newSettings.email = false;
      newSettings.sms = false;

      prefs.forEach((pref) => {
        // Проверяем, включены ли каналы хотя бы для одного типа
        if (pref.push_enabled) newSettings.push = true;
        if (pref.email_enabled) newSettings.email = true;
        if (pref.sms_enabled) newSettings.sms = true;

        // Тип считается включённым, если хотя бы один канал активен
        const typeEnabled =
          pref.in_app_enabled || pref.push_enabled || pref.email_enabled || pref.sms_enabled;

        // Сохраняем настройки для каждого типа
        if (pref.notification_type === 'message') {
          newSettings.message = typeEnabled;
        } else if (pref.notification_type === 'mention') {
          newSettings.mention = typeEnabled;
        } else if (pref.notification_type === 'task') {
          newSettings.task = typeEnabled;
        } else if (pref.notification_type === 'poll') {
          newSettings.poll = typeEnabled;
        } else if (pref.notification_type === 'calendar') {
          newSettings.calendar = typeEnabled;
        } else if (pref.notification_type === 'system') {
          newSettings.system = typeEnabled;
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

        // Обновляем канал только для типов, которые включены
        const enabledTypes = ALL_NOTIFICATION_TYPES.filter(
          (type) => settings[type as keyof NotificationSettings]
        );

        if (enabledTypes.length > 0) {
          await Promise.all(
            enabledTypes.map((type) =>
              updateUserPreference(type, {
                [fieldMap[channel]]: value,
              })
            )
          );
        }

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
    [settings, showSuccess, showError]
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
        if (value) {
          // Включаем тип: активируем in_app + каналы согласно глобальным настройкам
          await updateUserPreference(type, {
            in_app_enabled: true,
            push_enabled: settings.push,
            email_enabled: settings.email,
            sms_enabled: false,
          });
        } else {
          // Выключаем тип: отключаем ВСЕ каналы для этого типа
          await updateUserPreference(type, {
            in_app_enabled: false,
            push_enabled: false,
            email_enabled: false,
            sms_enabled: false,
          });
        }

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
    [settings.push, settings.email, showSuccess, showError]
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
   * Update quiet hours setting (always sends device timezone).
   * Если задано только начало — автоматически ставит конец (07:00).
   * Если задан только конец — автоматически ставит начало (23:00).
   */
  const handleQuietHoursChange = useCallback(
    async (type: 'start' | 'end', hour: number | null) => {
      const oldStart = settings.quietHoursStart;
      const oldEnd = settings.quietHoursEnd;
      const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      setSaving(type === 'start' ? 'quiet_hours_start' : 'quiet_hours_end');

      try {
        if (hour === null) {
          // Сброс: отключаем оба поля
          setSettings((prev) => ({ ...prev, quietHoursStart: null, quietHoursEnd: null }));
          await Promise.all(
            ALL_NOTIFICATION_TYPES.map((t) =>
              updateUserPreference(t, { reset_quiet_hours: true, timezone: deviceTimezone })
            )
          );
          showSuccess('Тихие часы отключены');
        } else {
          // Автозаполнение парного значения если оно не задано
          const DEFAULT_START = 23;
          const DEFAULT_END = 7;

          let newStart = type === 'start' ? hour : (oldStart ?? DEFAULT_START);
          let newEnd = type === 'end' ? hour : (oldEnd ?? DEFAULT_END);

          setSettings((prev) => ({ ...prev, quietHoursStart: newStart, quietHoursEnd: newEnd }));

          await Promise.all(
            ALL_NOTIFICATION_TYPES.map((t) =>
              updateUserPreference(t, {
                quiet_hours_start: newStart,
                quiet_hours_end: newEnd,
                timezone: deviceTimezone,
              })
            )
          );
          showSuccess('Настройки сохранены');
        }
      } catch (error) {
        // Откат
        setSettings((prev) => ({ ...prev, quietHoursStart: oldStart, quietHoursEnd: oldEnd }));
        showError('Не удалось сохранить настройки');
      } finally {
        setSaving(null);
      }
    },
    [settings, showSuccess, showError]
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

  /**
   * Toggle global mute for all groups or all channels
   */
  const handleToggleGlobalMute = useCallback(
    async (type: 'groups' | 'channels', value: boolean) => {
      const field = type === 'groups' ? 'muteAllGroups' : 'muteAllChannels';
      const savingKey = type === 'groups' ? 'mute_all_groups' : 'mute_all_channels';
      setSettings((prev) => ({ ...prev, [field]: value }));
      setSaving(savingKey);

      try {
        const param =
          type === 'groups'
            ? { mute_all_groups: value ? 'forever' as const : 'off' as const }
            : { mute_all_channels: value ? 'forever' as const : 'off' as const };
        await updateGlobalMutePreferences(param);
        showSuccess('Настройки сохранены');
      } catch (error: any) {
        console.error('Error updating global mute:', error);
        showError(error.message || 'Не удалось сохранить настройки');
        setSettings((prev) => ({ ...prev, [field]: !value }));
      } finally {
        setSaving(null);
      }
    },
    [showSuccess, showError]
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
    handleToggleGlobalMute,
    handlePriorityChange,
    handleQuietHoursChange,
    handleToggleAdvanced,
  };
};
