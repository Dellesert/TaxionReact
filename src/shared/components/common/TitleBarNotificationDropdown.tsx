/**
 * TitleBarNotificationDropdown Component
 * Красивое dropdown окно с уведомлениями для CustomTitleBar
 */

import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '@shared/store/notificationStore';
import { useUniversalNavigation } from '@shared/hooks/useUniversalNavigation';
import NotificationItem from '@shared/components/common/NotificationItem';
import { Notification } from '../../../types/notification.types';
import { useTheme } from '@shared/hooks/useTheme';
import {
  getNavigationScreenByType,
  getNavigationParams,
} from '@/features/notifications/utils/notificationFormatters';

interface TitleBarNotificationDropdownProps {
  visible: boolean;
  onClose: () => void;
  anchorPosition: { x: number; y: number };
}

export const TitleBarNotificationDropdown: React.FC<TitleBarNotificationDropdownProps> = ({
  visible,
  onClose,
  anchorPosition,
}) => {
  // Безопасно получаем navigate (может быть undefined если вне NavigationContainer)
  let navigate: ((screen: string, params?: any) => void) | undefined;
  try {
    const nav = useUniversalNavigation();
    navigate = nav.navigate;
  } catch (e) {
    // Если не внутри NavigationContainer, navigate будет undefined
    navigate = undefined;
  }

  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

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
      // Анимация появления
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Анимация исчезновения
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
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
      // Mark as read if unread
      if (!notification.is_read) {
        markAsRead(notification.id);
      }

      // Close dropdown
      onClose();

      // Navigate to corresponding screen based on type (если navigate доступен)
      if (navigate) {
        setTimeout(() => {
          const screenName = getNavigationScreenByType(notification.type, notification.data);
          const params = notification.data
            ? getNavigationParams(notification.type, notification.data)
            : null;

          if (screenName && params && navigate) {
            navigate(screenName, params);
          }
        }, 300);
      }
    },
    [markAsRead, navigate, onClose]
  );

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const handleDeleteAll = useCallback(() => {
    deleteAllNotifications();
  }, [deleteAllNotifications]);

  const handleDeleteNotification = useCallback(
    (id: number) => {
      deleteNotification(id);
    },
    [deleteNotification]
  );

  // Group notifications by date
  type DateSection = {
    title: string;
    data: Notification[];
  };

  const groupedNotifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const sections: DateSection[] = [
      { title: 'Сегодня', data: [] },
      { title: 'Вчера', data: [] },
      { title: 'Последние 7 дней', data: [] },
      { title: 'Ранее', data: [] },
    ];

    notifications.forEach((notification) => {
      const notificationDate = new Date(notification.created_at);

      if (notificationDate >= today) {
        sections[0].data.push(notification);
      } else if (notificationDate >= yesterday) {
        sections[1].data.push(notification);
      } else if (notificationDate >= weekAgo) {
        sections[2].data.push(notification);
      } else {
        sections[3].data.push(notification);
      }
    });

    // Filter out empty sections and flatten for FlatList
    return sections.filter((section) => section.data.length > 0);
  }, [notifications]);

  // Flatten grouped notifications for FlatList
  const flattenedData = useMemo(() => {
    const items: Array<
      { type: 'header'; title: string } | { type: 'notification'; data: Notification }
    > = [];
    groupedNotifications.forEach((section) => {
      items.push({ type: 'header', title: section.title });
      section.data.forEach((notification) => {
        items.push({ type: 'notification', data: notification });
      });
    });
    return items;
  }, [groupedNotifications]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      if (item.type === 'header') {
        return (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionHeaderText, { color: theme.textTertiary }]}>
              {item.title}
            </Text>
          </View>
        );
      }

      return (
        <NotificationItem
          notification={item.data}
          onPress={handleNotificationPress}
          onMarkAsRead={markAsRead}
          onDelete={handleDeleteNotification}
        />
      );
    },
    [handleNotificationPress, markAsRead, handleDeleteNotification, theme]
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
        <Ionicons name="notifications-off-outline" size={48} color={theme.textTertiary} />
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

  if (!visible) {
    return null;
  }

  // Позиционирование dropdown справа от иконки
  const dropdownStyle = {
    position: 'absolute' as const,
    top: anchorPosition.y + 8, // Небольшой отступ от иконки
    right: 16, // Отступ от правого края
    zIndex: 10000,
  };

  const dropdownContent = (
    <>
      {/* Overlay для закрытия по клику вне dropdown */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Dropdown контейнер */}
      <Animated.View
        style={[
          styles.dropdown,
          dropdownStyle,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            ...Platform.select({
              web: {
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
              },
              default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.24,
                shadowRadius: 16,
                elevation: 12,
              },
            }),
          },
        ]}
      >
        {/* Хвостик (стрелочка) */}
        <View
          style={[
            styles.arrow,
            {
              backgroundColor: theme.card,
              borderLeftColor: theme.border,
              borderTopColor: theme.border,
            },
          ]}
        />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Уведомления</Text>
          {notifications.length > 0 && (
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllAsRead}
                  style={styles.headerActionButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="checkmark-done" size={20} color={theme.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleDeleteAll}
                style={styles.headerActionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* List */}
        <FlatList
          data={flattenedData}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `header-${item.title}` : `notification-${item.data.id}`
          }
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
          style={styles.list}
        />
      </Animated.View>
    </>
  );

  // Используем Portal для рендеринга dropdown на верхнем уровне DOM (только для web)
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return ReactDOM.createPortal(dropdownContent, document.body);
  }

  return dropdownContent;
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    ...Platform.select({
      web: {
        // @ts-ignore
        position: 'fixed',
      },
    }),
  },
  dropdown: {
    width: 420,
    maxHeight: 600,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        // @ts-ignore
        position: 'fixed',
      },
    }),
  },
  arrow: {
    position: 'absolute',
    top: -6,
    right: 20,
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
    borderLeftWidth: 1,
    borderTopWidth: 1,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    padding: 6,
    borderRadius: 6,
  },
  list: {
    maxHeight: 540,
  },
  listContent: {
    paddingTop: 4,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 250,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
