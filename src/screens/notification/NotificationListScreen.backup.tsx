/**
 * Notification List Screen
 * Экран со списком уведомлений
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '@store/notificationStore';
import NotificationItem from '@components/common/NotificationItem';
import ScreenHeader from '@components/common/ScreenHeader';
import { Notification } from '@types/notification.types';

const NotificationListScreen: React.FC = () => {
  const navigation = useNavigation();

  const {
    notifications,
    isLoading,
    hasMore,
    loadNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
  } = useNotificationStore();

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleRefresh = useCallback(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadMoreNotifications();
    }
  }, [isLoading, hasMore, loadMoreNotifications]);

  const handleNotificationPress = useCallback(
    (notification: Notification) => {
      // Отмечаем как прочитанное
      if (!notification.is_read) {
        markAsRead(notification.id);
      }

      // Переходим на соответствующий экран в зависимости от типа
      if (notification.type === 'message' && notification.data?.chat_id) {
        navigation.navigate('Chats' as never, {
          screen: 'Chat',
          params: { chatId: notification.data.chat_id },
        } as never);
      } else if (notification.type === 'task' && notification.data?.task_id) {
        navigation.navigate('TaskDetail' as never, { taskId: notification.data.task_id } as never);
      } else if (notification.type === 'poll' && notification.data?.poll_id) {
        navigation.navigate('Polls' as never, {
          screen: 'PollDetails',
          params: { pollId: notification.data.poll_id },
        } as never);
      } else if (notification.type === 'calendar' && notification.data?.event_id) {
        navigation.navigate('Calendar' as never);
      }
      // Добавьте другие типы по необходимости
    },
    [markAsRead, navigation]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem
        notification={item}
        onPress={handleNotificationPress}
        onMarkAsRead={markAsRead}
      />
    ),
    [handleNotificationPress, markAsRead]
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyText}>Нет уведомлений</Text>
        <Text style={styles.emptySubtext}>
          Здесь будут отображаться ваши уведомления
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore || notifications.length === 0) {
      return null;
    }

    if (isLoading) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Уведомления"
        showBack
        rightComponent={
          unreadCount > 0 ? (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              style={styles.markAllButton}
            >
              <Ionicons name="checkmark-done" size={24} color="#3B82F6" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && notifications.length === 0}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyListContainer : undefined
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  markAllButton: {
    padding: 8,
  },
});

export default NotificationListScreen;
