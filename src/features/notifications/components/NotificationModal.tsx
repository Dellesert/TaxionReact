/**
 * Notification Modal Component
 * Модальное окно со списком уведомлений
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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '@shared/store/notificationStore';
import NotificationItem from '@shared/components/common/NotificationItem';
import { Notification } from '../../../types/notification.types';
import { useTheme } from '@shared/hooks/useTheme';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const {
    notifications,
    isLoading,
    hasMore,
    loadNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    unreadCount,
  } = useNotificationStore();

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

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

      // Закрываем модалку
      onClose();

      // Переходим на соответствующий экран в зависимости от типа
      setTimeout(() => {
        if (notification.type === 'message' && notification.data?.chat_id) {
          // @ts-ignore - Navigation with nested params
          navigation.navigate('Main', {
            screen: 'Chats',
            params: {
              screen: 'Chat',
              params: {
                chatId: notification.data.chat_id,
              },
            },
          });
        } else if ((notification.type === 'task' || notification.type === 'reminder')) {
          // Check for grouped notifications (multiple tasks)
          if (notification.data?.task_ids && notification.data.task_ids.length > 1) {
            // For grouped notifications, go to task list with filter
            // @ts-ignore - Navigation with nested params
            navigation.navigate('Main', {
              screen: 'Tasks',
              params: {
                screen: 'TaskList',
                params: {
                  filterCategory: notification.data.category,
                  taskIds: notification.data.task_ids
                }
              },
            });
          } else if (notification.data?.task_id) {
            // Single task notification - navigate to root TaskDetail screen
            // @ts-ignore - Navigation to root level screen
            navigation.navigate('TaskDetail', {
              taskId: notification.data.task_id,
            });
          } else if (notification.data?.task_ids && notification.data.task_ids.length === 1) {
            // Single task in array format - navigate to root TaskDetail screen
            // @ts-ignore - Navigation to root level screen
            navigation.navigate('TaskDetail', {
              taskId: notification.data.task_ids[0],
            });
          }
        } else if (notification.type === 'poll' && notification.data?.poll_id) {
          // @ts-ignore - Navigation to root level screen
          navigation.navigate('PollDetail', {
            pollId: notification.data.poll_id,
          });
        } else if (notification.type === 'event' && notification.data?.event_id) {
          // @ts-ignore - Navigation to calendar
          navigation.navigate('Calendar');
        }
      }, 300);
    },
    [markAsRead, navigation, onClose]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const handleDeleteAll = useCallback(() => {
    deleteAllNotifications();
  }, [deleteAllNotifications]);

  const handleDeleteNotification = useCallback((id: number) => {
    deleteNotification(id);
  }, [deleteNotification]);

  const renderItem = useCallback(
    ({ item }: { item: Notification }) => (
      <NotificationItem
        notification={item}
        onPress={handleNotificationPress}
        onMarkAsRead={markAsRead}
        onDelete={handleDeleteNotification}
      />
    ),
    [handleNotificationPress, markAsRead, handleDeleteNotification]
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-off-outline" size={64} color={theme.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.text }]}>Нет уведомлений</Text>
        <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
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
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      );
    }

    return null;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            paddingTop: insets.top,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={28} color="#EF4444" />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Уведомления</Text>
          {notifications.length > 0 ? (
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerActionButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="checkmark-done" size={24} color={theme.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleDeleteAll} style={styles.headerActionButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {/* List */}
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
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyListContainer : styles.listContent
          }
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    position: 'relative',
  },
  closeButton: {
    padding: 8,
    width: 44,
    zIndex: 1,
  },
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 60,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
    marginLeft: 'auto',
  },
  headerActionButton: {
    padding: 8,
    width: 44,
    alignItems: 'center',
  },
  placeholder: {
    width: 44,
  },
  listContent: {
    paddingTop: 8,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
