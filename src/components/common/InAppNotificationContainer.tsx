/**
 * InAppNotificationContainer
 * Контейнер для отображения in-app toast уведомлений
 * Должен быть добавлен на верхний уровень приложения
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { InAppNotification } from './InAppNotification';
import { useInAppNotificationStore } from '@store/inAppNotificationStore';
import { useNotificationStore } from '@store/notificationStore';

export const InAppNotificationContainer: React.FC = () => {
  const navigation = useNavigation<any>();
  const currentNotification = useInAppNotificationStore((state) => state.currentNotification);
  const dismissNotification = useInAppNotificationStore((state) => state.dismissNotification);
  const markAsRead = useNotificationStore((state) => state.markAsRead);

  if (!currentNotification) {
    return null;
  }

  const handlePress = () => {
    console.log('🔔 [InAppNotification] Pressed notification:', {
      id: currentNotification.id,
      type: currentNotification.type,
      data: currentNotification.data,
      chat_id: currentNotification.data?.chat_id,
    });

    // Отметить как прочитанное
    if (!currentNotification.is_read) {
      markAsRead(currentNotification.id);
    }

    // Навигация в зависимости от типа уведомления
    if (currentNotification.type === 'message' && currentNotification.data?.chat_id) {
      console.log('🔔 [InAppNotification] Navigating to chat:', currentNotification.data.chat_id);
      // Переход в чат
      navigation.navigate('Chats', {
        screen: 'Chat',
        params: { chatId: currentNotification.data.chat_id },
      });
    } else if (currentNotification.type === 'task' && currentNotification.data?.task_id) {
      // Переход к задаче
      console.log('🔔 [InAppNotification] Navigating to task:', currentNotification.data.task_id);
      navigation.navigate('TaskDetail', {
        taskId: currentNotification.data.task_id,
      });
    } else if (currentNotification.type === 'event' && currentNotification.data?.event_id) {
      // Переход к событию
      navigation.navigate('Calendar');
    } else if (currentNotification.type === 'poll' && currentNotification.data?.poll_id) {
      // Переход к опросу
      navigation.navigate('Polls', {
        screen: 'PollDetails',
        params: { pollId: currentNotification.data.poll_id },
      });
    } else {
      console.log('🔔 [InAppNotification] No specific route, going to notifications list');
      // По умолчанию переход в список уведомлений
      navigation.navigate('Notifications', {
        screen: 'NotificationList',
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
