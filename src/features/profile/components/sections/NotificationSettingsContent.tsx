/**
 * Notification Settings Content
 * Полная логика настроек уведомлений без header
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotificationSettings } from '@/features/notifications/hooks/useNotificationSettings';
import { ProfileMenuSection } from '../common/ProfileMenuSection';
import { NotificationSettingItem } from '../notification/NotificationSettingItem';
import { PriorityPickerModal } from '../notification/PriorityPickerModal';
import { TimePickerModal } from '../notification/TimePickerModal';
import { formatHour, getPriorityLabel } from '@/features/notifications/utils/notificationHelpers';

const NotificationSettingsContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  const {
    loading,
    saving,
    settings,
    handleToggleChannel,
    handleToggleType,
    handlePriorityChange,
    handleQuietHoursChange,
    handleToggleAdvanced,
  } = useNotificationSettings();

  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showQuietHoursPicker, setShowQuietHoursPicker] = useState(false);
  const [quietHoursType, setQuietHoursType] = useState<'start' | 'end'>('start');

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 16 }}>Загрузка настроек...</Text>
      </View>
    );
  }

  const channelsDisabled = !settings.push && !settings.email;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#F3F4F6' }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Каналы доставки */}
        <ProfileMenuSection
          title="КАНАЛЫ ДОСТАВКИ"
          description="Выберите способы получения уведомлений"
        >
          <NotificationSettingItem
            icon="notifications"
            iconColor="#E94444"
            title="Push-уведомления"
            description="Всплывающие уведомления на устройстве"
            value={settings.push}
            onValueChange={(value) => handleToggleChannel('push', value)}
            isLoading={saving === 'push'}
          />
          <NotificationSettingItem
            icon="mail"
            iconColor="#3B82F6"
            title="Email-уведомления"
            description="Уведомления на электронную почту"
            value={settings.email}
            onValueChange={(value) => handleToggleChannel('email', value)}
            isLoading={saving === 'email'}
          />
          <NotificationSettingItem
            icon="chatbox-ellipses"
            iconColor="#10B981"
            title="SMS-уведомления"
            description="Уведомления по SMS (скоро будет доступно)"
            value={false}
            disabled
            isLast
          />
        </ProfileMenuSection>

        {/* Типы уведомлений */}
        <ProfileMenuSection
          title="ТИПЫ УВЕДОМЛЕНИЙ"
          description="Выберите, о каких событиях вас уведомлять"
        >
          <NotificationSettingItem
            icon="chatbubble"
            iconColor="#10B981"
            title="Сообщения"
            description="Новые сообщения в чатах"
            value={settings.message}
            onValueChange={(value) => handleToggleType('message', value)}
            isLoading={saving === 'message'}
            disabled={channelsDisabled}
          />
          <NotificationSettingItem
            icon="at"
            iconColor="#F59E0B"
            title="Упоминания"
            description="Когда вас упоминают (@имя)"
            value={settings.mention}
            onValueChange={(value) => handleToggleType('mention', value)}
            isLoading={saving === 'mention'}
            disabled={channelsDisabled}
          />
          <NotificationSettingItem
            icon="checkbox"
            iconColor="#8B5CF6"
            title="Задачи"
            description="Новые задачи и изменения статуса"
            value={settings.task}
            onValueChange={(value) => handleToggleType('task', value)}
            isLoading={saving === 'task'}
            disabled={channelsDisabled}
          />
          <NotificationSettingItem
            icon="bar-chart"
            iconColor="#EC4899"
            title="Опросы"
            description="Новые опросы и результаты голосования"
            value={settings.poll}
            onValueChange={(value) => handleToggleType('poll', value)}
            isLoading={saving === 'poll'}
            disabled={channelsDisabled}
          />
          <NotificationSettingItem
            icon="calendar"
            iconColor="#06B6D4"
            title="Календарь"
            description="Напоминания о событиях и встречах"
            value={settings.calendar}
            onValueChange={(value) => handleToggleType('calendar', value)}
            isLoading={saving === 'calendar'}
            disabled={channelsDisabled}
          />
          <NotificationSettingItem
            icon="shield-checkmark"
            iconColor="#6366F1"
            title="Система"
            description="Важные системные уведомления"
            value={settings.system}
            onValueChange={(value) => handleToggleType('system', value)}
            isLoading={saving === 'system'}
            disabled={channelsDisabled}
            isLast
          />
        </ProfileMenuSection>

        {/* Расширенные настройки */}
        <ProfileMenuSection
          title="РАСШИРЕННЫЕ НАСТРОЙКИ"
          description="Дополнительные параметры доставки уведомлений"
        >
          <NotificationSettingItem
            icon="alert-circle"
            iconColor="#F59E0B"
            title="Минимальный приоритет"
            description="Не показывать уведомления ниже этого уровня"
            displayValue={getPriorityLabel(settings.minPriority)}
            onPress={() => setShowPriorityPicker(true)}
            isLoading={saving === 'min_priority'}
            showChevron
          />
          <NotificationSettingItem
            icon="moon"
            iconColor="#8B5CF6"
            title="Начало тихих часов"
            description="Не беспокоить с этого времени"
            displayValue={formatHour(settings.quietHoursStart)}
            onPress={() => {
              setQuietHoursType('start');
              setShowQuietHoursPicker(true);
            }}
            isLoading={saving === 'quiet_hours_start'}
            showChevron
          />
          <NotificationSettingItem
            icon="sunny"
            iconColor="#8B5CF6"
            title="Конец тихих часов"
            description="Возобновить уведомления с этого времени"
            displayValue={formatHour(settings.quietHoursEnd)}
            onPress={() => {
              setQuietHoursType('end');
              setShowQuietHoursPicker(true);
            }}
            isLoading={saving === 'quiet_hours_end'}
            showChevron
          />
          <NotificationSettingItem
            icon="calendar-outline"
            iconColor="#EC4899"
            title="Уведомления в выходные"
            description="Получать уведомления в субботу и воскресенье"
            value={settings.weekendEnabled}
            onValueChange={(value) => handleToggleAdvanced('weekendEnabled', value)}
            isLoading={saving === 'weekend_enabled'}
          />
          <NotificationSettingItem
            icon="layers"
            iconColor="#06B6D4"
            title="Режим дайджеста"
            description="Группировать уведомления и отправлять периодически"
            value={settings.digestEnabled}
            onValueChange={(value) => handleToggleAdvanced('digestEnabled', value)}
            isLoading={saving === 'digest_enabled'}
            isLast
          />
        </ProfileMenuSection>
      </ScrollView>

      {/* Модальные окна */}
      <PriorityPickerModal
        visible={showPriorityPicker}
        selectedPriority={settings.minPriority}
        onSelect={handlePriorityChange}
        onClose={() => setShowPriorityPicker(false)}
      />

      <TimePickerModal
        visible={showQuietHoursPicker}
        type={quietHoursType}
        selectedHour={
          quietHoursType === 'start' ? settings.quietHoursStart : settings.quietHoursEnd
        }
        onSelect={(hour) => handleQuietHoursChange(quietHoursType, hour)}
        onClose={() => setShowQuietHoursPicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});

export default NotificationSettingsContent;
