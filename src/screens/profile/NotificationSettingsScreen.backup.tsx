import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useNotification } from '@contexts/NotificationContext';
import {
  getUserPreferences,
  updateUserPreference,
  UserNotificationPreference,
  NotificationType,
  NotificationPriority,
} from '@api/notificationPreferences.api';

interface NotificationSettings {
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

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showQuietHoursPicker, setShowQuietHoursPicker] = useState(false);
  const [quietHoursType, setQuietHoursType] = useState<'start' | 'end'>('start');
  const [settings, setSettings] = useState<NotificationSettings>({
    // Основные каналы
    push: true,
    email: false,
    sms: false,

    // Категории уведомлений
    message: true,
    mention: true,
    task: true,
    poll: true,
    calendar: true,
    system: true,

    // Расширенные настройки
    minPriority: 'low',
    quietHoursStart: null,
    quietHoursEnd: null,
    weekendEnabled: true,
    digestEnabled: false,
    digestFrequency: null,
  });

  // Загрузка настроек при монтировании компонента
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await getUserPreferences();

      // Преобразуем настройки из API в локальный формат
      const newSettings: NotificationSettings = {
        push: false,
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
  };

  const handleToggleChannel = async (channel: 'push' | 'email' | 'sms', value: boolean) => {
    setSettings((prev) => ({ ...prev, [channel]: value }));
    setSaving(channel);

    try {
      // Обновляем все типы уведомлений для этого канала
      const types: NotificationType[] = ['message', 'mention', 'task', 'poll', 'calendar', 'system'];

      const fieldMap = {
        push: 'push_enabled',
        email: 'email_enabled',
        sms: 'sms_enabled',
      };

      await Promise.all(
        types.map((type) =>
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
  };

  const handleToggleType = async (type: NotificationType, value: boolean) => {
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
  };

  const updateAdvancedSetting = async (field: string, value: any) => {
    setSaving(field);

    try {
      const types: NotificationType[] = ['message', 'mention', 'task', 'poll', 'calendar', 'system'];

      await Promise.all(
        types.map((type) =>
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
  };

  const handlePriorityChange = async (priority: NotificationPriority) => {
    const oldValue = settings.minPriority;
    setSettings((prev) => ({ ...prev, minPriority: priority }));
    setShowPriorityPicker(false);

    try {
      await updateAdvancedSetting('min_priority', priority);
    } catch (error) {
      setSettings((prev) => ({ ...prev, minPriority: oldValue }));
    }
  };

  const handleQuietHoursChange = async (hour: number) => {
    const field = quietHoursType === 'start' ? 'quietHoursStart' : 'quietHoursEnd';
    const apiField = quietHoursType === 'start' ? 'quiet_hours_start' : 'quiet_hours_end';
    const oldValue = settings[field];

    setSettings((prev) => ({ ...prev, [field]: hour }));
    setShowQuietHoursPicker(false);

    try {
      await updateAdvancedSetting(apiField, hour);
    } catch (error) {
      setSettings((prev) => ({ ...prev, [field]: oldValue }));
    }
  };

  const handleToggleAdvanced = async (field: 'weekendEnabled' | 'digestEnabled', value: boolean) => {
    const apiField = field === 'weekendEnabled' ? 'weekend_enabled' : 'digest_enabled';
    setSettings((prev) => ({ ...prev, [field]: value }));

    try {
      await updateAdvancedSetting(apiField, value);
    } catch (error) {
      setSettings((prev) => ({ ...prev, [field]: !value }));
    }
  };

  const formatHour = (hour: number | null): string => {
    if (hour === null) return 'Не установлено';
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getPriorityLabel = (priority: NotificationPriority): string => {
    const labels: Record<NotificationPriority, string> = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      critical: 'Критический',
    };
    return labels[priority];
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? theme.background : '#F3F4F6',
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 0 : 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    headerRight: {
      width: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      padding: 12,
      paddingBottom: Platform.OS === 'web' ? 100 : Platform.OS === 'ios' ? 100 : 32,
    },
    section: {
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 16,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: isDark ? 0 : 1,
      borderColor: isDark ? 'transparent' : '#E5E7EB',
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.backgroundSecondary,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
      letterSpacing: 0.5,
    },
    sectionDescription: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 4,
      lineHeight: 16,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      backgroundColor: theme.backgroundSecondary,
    },
    settingItemLast: {
      borderBottomWidth: 0,
    },
    settingItemDisabled: {
      opacity: 0.5,
    },
    settingItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingContent: {
      flex: 1,
      marginLeft: 12,
    },
    settingTitle: {
      fontSize: 16,
      color: theme.text,
      fontWeight: '500',
    },
    settingDescription: {
      fontSize: 13,
      color: theme.textTertiary,
      marginTop: 2,
    },
    settingValue: {
      fontSize: 14,
      color: theme.textSecondary,
      marginRight: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
    },
    modalHeader: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
    },
    modalBody: {
      maxHeight: 400,
    },
    modalOption: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalOptionLast: {
      borderBottomWidth: 0,
    },
    modalOptionText: {
      fontSize: 16,
      color: theme.text,
    },
    modalOptionSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
  });

  if (loading) {
    return (
      <View style={dynamicStyles.container}>
        <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
          <View style={dynamicStyles.header}>
            <TouchableOpacity
              style={dynamicStyles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>Настройки уведомлений</Text>
            <View style={dynamicStyles.headerRight} />
          </View>
        </SafeAreaView>
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.textSecondary, marginTop: 16 }}>Загрузка настроек...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Настройки уведомлений</Text>
          <View style={dynamicStyles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Основные каналы */}
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>КАНАЛЫ ДОСТАВКИ</Text>
            <Text style={dynamicStyles.sectionDescription}>
              Выберите способы получения уведомлений
            </Text>
          </View>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#E94444' }]}>
                <Ionicons name="notifications" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Push-уведомления</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Всплывающие уведомления на устройстве
                </Text>
              </View>
            </View>
            {saving === 'push' ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                value={settings.push}
                onValueChange={(value) => handleToggleChannel('push', value)}
                trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
                thumbColor={settings.push ? theme.primary : '#F3F4F6'}
              />
            )}
          </View>

          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#3B82F6' }]}>
                <Ionicons name="mail" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Email-уведомления</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Уведомления на электронную почту
                </Text>
              </View>
            </View>
            {saving === 'email' ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                value={settings.email}
                onValueChange={(value) => handleToggleChannel('email', value)}
                trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
                thumbColor={settings.email ? theme.primary : '#F3F4F6'}
              />
            )}
          </View>

          <View style={[dynamicStyles.settingItem, dynamicStyles.settingItemLast, dynamicStyles.settingItemDisabled]}>
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#10B981' }]}>
                <Ionicons name="chatbox-ellipses" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>SMS-уведомления</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Уведомления по SMS (скоро будет доступно)
                </Text>
              </View>
            </View>
            <Switch
              value={false}
              disabled={true}
              trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
              thumbColor={'#F3F4F6'}
            />
          </View>
        </View>

        {/* Категории уведомлений */}
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>ТИПЫ УВЕДОМЛЕНИЙ</Text>
            <Text style={dynamicStyles.sectionDescription}>
              Выберите, о каких событиях вас уведомлять
            </Text>
          </View>

          <View
            style={[
              dynamicStyles.settingItem,
              (!settings.push && !settings.email) && dynamicStyles.settingItemDisabled,
            ]}
          >
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#10B981' }]}>
                <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Сообщения</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Новые сообщения в чатах
                </Text>
              </View>
            </View>
            {saving === 'message' ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                value={settings.message}
                onValueChange={(value) => handleToggleType('message', value)}
                disabled={!settings.push && !settings.email}
                trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
                thumbColor={settings.message ? theme.primary : '#F3F4F6'}
              />
            )}
          </View>

          <View
            style={[
              dynamicStyles.settingItem,
              (!settings.push && !settings.email) && dynamicStyles.settingItemDisabled,
            ]}
          >
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="at" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Упоминания</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Когда вас упоминают (@имя)
                </Text>
              </View>
            </View>
            {saving === 'mention' ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                value={settings.mention}
                onValueChange={(value) => handleToggleType('mention', value)}
                disabled={!settings.push && !settings.email}
                trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
                thumbColor={settings.mention ? theme.primary : '#F3F4F6'}
              />
            )}
          </View>

          <View
            style={[
              dynamicStyles.settingItem,
              (!settings.push && !settings.email) && dynamicStyles.settingItemDisabled,
            ]}
          >
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="checkbox" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Задачи</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Новые задачи и изменения статуса
                </Text>
              </View>
            </View>
            {saving === 'task' ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                value={settings.task}
                onValueChange={(value) => handleToggleType('task', value)}
                disabled={!settings.push && !settings.email}
                trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
                thumbColor={settings.task ? theme.primary : '#F3F4F6'}
              />
            )}
          </View>

          <View
            style={[
              dynamicStyles.settingItem,
              (!settings.push && !settings.email) && dynamicStyles.settingItemDisabled,
            ]}
          >
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#EC4899' }]}>
                <Ionicons name="bar-chart" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Опросы</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Новые опросы и результаты голосования
                </Text>
              </View>
            </View>
            {saving === 'poll' ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                value={settings.poll}
                onValueChange={(value) => handleToggleType('poll', value)}
                disabled={!settings.push && !settings.email}
                trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
                thumbColor={settings.poll ? theme.primary : '#F3F4F6'}
              />
            )}
          </View>

          <View
            style={[
              dynamicStyles.settingItem,
              (!settings.push && !settings.email) && dynamicStyles.settingItemDisabled,
            ]}
          >
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#06B6D4' }]}>
                <Ionicons name="calendar" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Календарь</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Напоминания о событиях и встречах
                </Text>
              </View>
            </View>
            {saving === 'calendar' ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                value={settings.calendar}
                onValueChange={(value) => handleToggleType('calendar', value)}
                disabled={!settings.push && !settings.email}
                trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
                thumbColor={settings.calendar ? theme.primary : '#F3F4F6'}
              />
            )}
          </View>

          <View
            style={[
              dynamicStyles.settingItem,
              dynamicStyles.settingItemLast,
              (!settings.push && !settings.email) && dynamicStyles.settingItemDisabled,
            ]}
          >
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#6366F1' }]}>
                <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Система</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Важные системные уведомления
                </Text>
              </View>
            </View>
            {saving === 'system' ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                value={settings.system}
                onValueChange={(value) => handleToggleType('system', value)}
                disabled={!settings.push && !settings.email}
                trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
                thumbColor={settings.system ? theme.primary : '#F3F4F6'}
              />
            )}
          </View>
        </View>

        {/* Расширенные настройки */}
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>РАСШИРЕННЫЕ НАСТРОЙКИ</Text>
            <Text style={dynamicStyles.sectionDescription}>
              Дополнительные параметры доставки уведомлений
            </Text>
          </View>

          {/* Минимальный приоритет */}
          <TouchableOpacity
            style={dynamicStyles.settingItem}
            onPress={() => setShowPriorityPicker(true)}
          >
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Минимальный приоритет</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Не показывать уведомления ниже этого уровня
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {saving === 'min_priority' ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Text style={dynamicStyles.settingValue}>
                    {getPriorityLabel(settings.minPriority)}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Тихие часы - начало */}
          <TouchableOpacity
            style={dynamicStyles.settingItem}
            onPress={() => {
              setQuietHoursType('start');
              setShowQuietHoursPicker(true);
            }}
          >
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="moon" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Начало тихих часов</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Не беспокоить с этого времени
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {saving === 'quiet_hours_start' ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Text style={dynamicStyles.settingValue}>
                    {formatHour(settings.quietHoursStart)}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Тихие часы - конец */}
          <TouchableOpacity
            style={dynamicStyles.settingItem}
            onPress={() => {
              setQuietHoursType('end');
              setShowQuietHoursPicker(true);
            }}
          >
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="sunny" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Конец тихих часов</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Возобновить уведомления с этого времени
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {saving === 'quiet_hours_end' ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Text style={dynamicStyles.settingValue}>
                    {formatHour(settings.quietHoursEnd)}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Уведомления в выходные */}
          <View style={dynamicStyles.settingItem}>
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#EC4899' }]}>
                <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Уведомления в выходные</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Получать уведомления в субботу и воскресенье
                </Text>
              </View>
            </View>
            {saving === 'weekend_enabled' ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                value={settings.weekendEnabled}
                onValueChange={(value) => handleToggleAdvanced('weekendEnabled', value)}
                trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
                thumbColor={settings.weekendEnabled ? theme.primary : '#F3F4F6'}
              />
            )}
          </View>

          {/* Режим дайджеста */}
          <View style={[dynamicStyles.settingItem, dynamicStyles.settingItemLast]}>
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#06B6D4' }]}>
                <Ionicons name="layers" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Режим дайджеста</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Группировать уведомления и отправлять периодически
                </Text>
              </View>
            </View>
            {saving === 'digest_enabled' ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Switch
                value={settings.digestEnabled}
                onValueChange={(value) => handleToggleAdvanced('digestEnabled', value)}
                trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
                thumbColor={settings.digestEnabled ? theme.primary : '#F3F4F6'}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Модальное окно выбора приоритета */}
      <Modal
        visible={showPriorityPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPriorityPicker(false)}
      >
        <Pressable style={dynamicStyles.modalOverlay} onPress={() => setShowPriorityPicker(false)}>
          <Pressable style={dynamicStyles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>Минимальный приоритет</Text>
            </View>
            <ScrollView style={dynamicStyles.modalBody}>
              {(['low', 'medium', 'high', 'critical'] as NotificationPriority[]).map((priority, index) => (
                <TouchableOpacity
                  key={priority}
                  style={[
                    dynamicStyles.modalOption,
                    index === 3 && dynamicStyles.modalOptionLast,
                  ]}
                  onPress={() => handlePriorityChange(priority)}
                >
                  <Text
                    style={[
                      dynamicStyles.modalOptionText,
                      settings.minPriority === priority && dynamicStyles.modalOptionSelected,
                    ]}
                  >
                    {getPriorityLabel(priority)}
                  </Text>
                  {settings.minPriority === priority && (
                    <Ionicons name="checkmark" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Модальное окно выбора времени */}
      <Modal
        visible={showQuietHoursPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQuietHoursPicker(false)}
      >
        <Pressable style={dynamicStyles.modalOverlay} onPress={() => setShowQuietHoursPicker(false)}>
          <Pressable style={dynamicStyles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={dynamicStyles.modalHeader}>
              <Text style={dynamicStyles.modalTitle}>
                {quietHoursType === 'start' ? 'Начало тихих часов' : 'Конец тихих часов'}
              </Text>
            </View>
            <ScrollView style={dynamicStyles.modalBody}>
              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={[
                    dynamicStyles.modalOption,
                    hour === 23 && dynamicStyles.modalOptionLast,
                  ]}
                  onPress={() => handleQuietHoursChange(hour)}
                >
                  <Text
                    style={[
                      dynamicStyles.modalOptionText,
                      settings[quietHoursType === 'start' ? 'quietHoursStart' : 'quietHoursEnd'] === hour &&
                        dynamicStyles.modalOptionSelected,
                    ]}
                  >
                    {formatHour(hour)}
                  </Text>
                  {settings[quietHoursType === 'start' ? 'quietHoursStart' : 'quietHoursEnd'] === hour && (
                    <Ionicons name="checkmark" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default NotificationSettingsScreen;
