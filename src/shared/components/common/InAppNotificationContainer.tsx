/**
 * InAppNotificationContainer
 * Контейнер для отображения in-app toast уведомлений
 * Должен быть добавлен на верхний уровень приложения
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { InAppNotification } from './InAppNotification';
import { useInAppNotificationStore } from '@shared/store/inAppNotificationStore';
import { useNotificationStore } from '@shared/store/notificationStore';
import { useUniversalNavigation } from '@shared/hooks/useUniversalNavigation';
import {
  getNavigationScreenByType,
  getNavigationParams,
} from '@/features/notifications/utils/notificationFormatters';

export const InAppNotificationContainer: React.FC = () => {
  const { navigate } = useUniversalNavigation();
  const currentNotification = useInAppNotificationStore((state) => state.currentNotification);
  const dismissNotification = useInAppNotificationStore((state) => state.dismissNotification);
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  if (!currentNotification) {
    return null;
  }

  const handlePress = () => {
    // Mark as read
    if (!currentNotification.is_read) {
      markAsRead(currentNotification.id);
    }

    // Navigate using universal navigation logic
    const screenName = getNavigationScreenByType(currentNotification.type, currentNotification.data);
    const params = currentNotification.data
      ? getNavigationParams(currentNotification.type, currentNotification.data)
      : null;

    if (screenName && params) {
      navigate(screenName, params);
    } else {
      console.warn('🔔 [InAppNotification] No navigation - screenName or params missing', {
        screenName,
        params,
        type: currentNotification.type
      });
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <InAppNotification
        notification={currentNotification}
        onPress={handlePress}
        onDismiss={dismissNotification}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});
