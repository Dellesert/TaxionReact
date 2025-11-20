import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useNotification } from '@contexts/NotificationContext';

interface NotificationSettings {
  // Основные каналы
  push: boolean;
  email: boolean;

  // Категории уведомлений
  messages: boolean;
  mentions: boolean;
  tasks: boolean;
  polls: boolean;
  calendar: boolean;
  system: boolean;

  // Дополнительные настройки
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { showSuccess } = useNotification();

  const [settings, setSettings] = useState<NotificationSettings>({
    // Основные каналы
    push: true,
    email: true,

    // Категории уведомлений
    messages: true,
    mentions: true,
    tasks: true,
    polls: true,
    calendar: true,
    system: true,

    // Дополнительные настройки
    soundEnabled: true,
    vibrationEnabled: true,
  });

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));

    // TODO: Здесь будет API запрос для сохранения настроек
    // await updateNotificationSettings({ [key]: value });

    // Временно показываем успешное сохранение
    setTimeout(() => {
      showSuccess('Настройки сохранены');
    }, 300);
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
    infoBox: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
      borderLeftWidth: 3,
      borderLeftColor: '#3B82F6',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    infoText: {
      fontSize: 13,
      color: isDark ? theme.textSecondary : '#1E40AF',
      flex: 1,
      lineHeight: 18,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
        {/* Header */}
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
            <Switch
              value={settings.push}
              onValueChange={(value) => handleToggle('push', value)}
              trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
              thumbColor={settings.push ? theme.primary : '#F3F4F6'}
            />
          </View>

          <View style={[dynamicStyles.settingItem, dynamicStyles.settingItemLast]}>
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
            <Switch
              value={settings.email}
              onValueChange={(value) => handleToggle('email', value)}
              trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
              thumbColor={settings.email ? theme.primary : '#F3F4F6'}
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
            <Switch
              value={settings.messages}
              onValueChange={(value) => handleToggle('messages', value)}
              disabled={!settings.push && !settings.email}
              trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
              thumbColor={settings.messages ? theme.primary : '#F3F4F6'}
            />
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
            <Switch
              value={settings.mentions}
              onValueChange={(value) => handleToggle('mentions', value)}
              disabled={!settings.push && !settings.email}
              trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
              thumbColor={settings.mentions ? theme.primary : '#F3F4F6'}
            />
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
            <Switch
              value={settings.tasks}
              onValueChange={(value) => handleToggle('tasks', value)}
              disabled={!settings.push && !settings.email}
              trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
              thumbColor={settings.tasks ? theme.primary : '#F3F4F6'}
            />
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
            <Switch
              value={settings.polls}
              onValueChange={(value) => handleToggle('polls', value)}
              disabled={!settings.push && !settings.email}
              trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
              thumbColor={settings.polls ? theme.primary : '#F3F4F6'}
            />
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
            <Switch
              value={settings.calendar}
              onValueChange={(value) => handleToggle('calendar', value)}
              disabled={!settings.push && !settings.email}
              trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
              thumbColor={settings.calendar ? theme.primary : '#F3F4F6'}
            />
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
            <Switch
              value={settings.system}
              onValueChange={(value) => handleToggle('system', value)}
              disabled={!settings.push && !settings.email}
              trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
              thumbColor={settings.system ? theme.primary : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Дополнительные настройки */}
        <View style={dynamicStyles.section}>
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>ДОПОЛНИТЕЛЬНО</Text>
            <Text style={dynamicStyles.sectionDescription}>
              Звук и вибрация для push-уведомлений
            </Text>
          </View>

          <View
            style={[
              dynamicStyles.settingItem,
              !settings.push && dynamicStyles.settingItemDisabled,
            ]}
          >
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#14B8A6' }]}>
                <Ionicons name="volume-high" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Звук</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Звуковое сопровождение уведомлений
                </Text>
              </View>
            </View>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(value) => handleToggle('soundEnabled', value)}
              disabled={!settings.push}
              trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
              thumbColor={settings.soundEnabled ? theme.primary : '#F3F4F6'}
            />
          </View>

          <View
            style={[
              dynamicStyles.settingItem,
              dynamicStyles.settingItemLast,
              !settings.push && dynamicStyles.settingItemDisabled,
            ]}
          >
            <View style={dynamicStyles.settingItemLeft}>
              <View style={[dynamicStyles.iconContainer, { backgroundColor: '#F97316' }]}>
                <Ionicons name="phone-portrait" size={18} color="#FFFFFF" />
              </View>
              <View style={dynamicStyles.settingContent}>
                <Text style={dynamicStyles.settingTitle}>Вибрация</Text>
                <Text style={dynamicStyles.settingDescription}>
                  Вибрация при получении уведомлений
                </Text>
              </View>
            </View>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={(value) => handleToggle('vibrationEnabled', value)}
              disabled={!settings.push}
              trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
              thumbColor={settings.vibrationEnabled ? theme.primary : '#F3F4F6'}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default NotificationSettingsScreen;
