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
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '@store/notificationStore';
import NotificationItem from '@components/common/NotificationItem';
import { Notification } from '@types/notification.types';
import { useTheme } from '@hooks/useTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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
    if (visible) {
      loadNotifications();
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
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
      }, 300);
    },
    [markAsRead, navigation, onClose]
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
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={[styles.backdrop, { backgroundColor: theme.overlay }]}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: theme.background,
              transform: [{ translateY: slideAnim }],
              paddingBottom: insets.bottom || 20,
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={[styles.dragHandle, { backgroundColor: theme.textTertiary }]} />
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: theme.text }]}>Уведомления</Text>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllAsRead}
                  style={styles.markAllButton}
                >
                  <Ionicons name="checkmark-done" size={24} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>
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
            onEndReachedThreshold={0.5}
            contentContainerStyle={
              notifications.length === 0 ? styles.emptyListContainer : styles.listContent
            }
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  markAllButton: {
    padding: 8,
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
