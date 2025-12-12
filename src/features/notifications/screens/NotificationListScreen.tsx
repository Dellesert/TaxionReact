/**
 * Notification List Screen (Refactored)
 * Экран со списком уведомлений
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '@shared/store/notificationStore';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import NotificationItem from '@shared/components/common/NotificationItem';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { Notification, NotificationType } from '@/types/notification.types';

// Custom Hooks
import { useNotificationListData } from '../hooks/useNotificationListData';
import { useNotificationListActions } from '../hooks/useNotificationListActions';

// Components
import { NotificationEmptyState } from '../components/NotificationEmptyState';
import { NotificationLoadingFooter } from '../components/NotificationLoadingFooter';

// Utils
import { shouldShowMarkAllButton, isNotificationListEmpty } from '../utils/notificationHelpers';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

// Filter types
type NotificationFilter = 'all' | 'message' | 'task' | 'event' | 'poll' | 'system';

const NotificationListScreen: React.FC = () => {
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();
  const { markAsRead, deleteAllNotifications } = useNotificationStore();

  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilter>('all');

  // Custom Hooks
  const { notifications, isLoading, hasMore, unreadCount } = useNotificationListData();
  const { handleRefresh, handleLoadMore, handleNotificationPress, handleMarkAllAsRead } =
    useNotificationListActions(isLoading, hasMore);

  // Handle delete all
  const handleDeleteAll = useCallback(async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Вы уверены, что хотите удалить все уведомления?')) {
        await deleteAllNotifications();
      }
    } else {
      // For native, you might want to show an Alert
      await deleteAllNotifications();
    }
  }, [deleteAllNotifications]);

  // Filter notifications by type
  const filteredNotifications = useMemo(() => {
    if (selectedFilter === 'all') {
      return notifications;
    }

    return notifications.filter((notification) => {
      const type = notification.type;
      switch (selectedFilter) {
        case 'message':
          return type === 'message' || type === 'mention' || type === 'reaction';
        case 'task':
          return type === 'task' || type === 'reminder';
        case 'event':
          return type === 'event';
        case 'poll':
          return type === 'poll';
        case 'system':
          return type === 'system';
        default:
          return true;
      }
    });
  }, [notifications, selectedFilter]);

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

    filteredNotifications.forEach((notification) => {
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

    // Filter out empty sections and flatten for FlashList
    return sections.filter((section) => section.data.length > 0);
  }, [filteredNotifications]);

  // Flatten grouped notifications for FlashList
  const flattenedData = useMemo(() => {
    const items: Array<{ type: 'header'; title: string } | { type: 'notification'; data: Notification }> = [];
    groupedNotifications.forEach((section) => {
      items.push({ type: 'header', title: section.title });
      section.data.forEach((notification) => {
        items.push({ type: 'notification', data: notification });
      });
    });
    return items;
  }, [groupedNotifications]);

  // Get item type for FlashList optimization
  const getItemType = useCallback((item: any) => {
    return item.type;
  }, []);

  // Render notification item
  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      if (item.type === 'header') {
        return (
          <View style={[styles.sectionHeader, isWideScreen && styles.sectionHeaderDesktop]}>
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
        />
      );
    },
    [theme, isWideScreen, handleNotificationPress, markAsRead]
  );

  // Render empty state
  const renderEmpty = useCallback(
    () => <NotificationEmptyState isLoading={isLoading} />,
    [isLoading]
  );

  // Render loading footer
  const renderFooter = useCallback(
    () => (
      <NotificationLoadingFooter
        hasMore={hasMore}
        notificationsCount={notifications.length}
        isLoading={isLoading}
      />
    ),
    [hasMore, notifications.length, isLoading]
  );

  // Desktop header render
  const renderDesktopHeader = () => {
    if (!isWideScreen) return null;

    const filters: Array<{ key: NotificationFilter; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
      { key: 'all', label: 'Все', icon: 'notifications' },
      { key: 'message', label: 'Сообщения', icon: 'chatbubble' },
      { key: 'task', label: 'Задачи', icon: 'checkmark-circle' },
      { key: 'event', label: 'События', icon: 'calendar' },
      { key: 'poll', label: 'Опросы', icon: 'bar-chart' },
      { key: 'system', label: 'Система', icon: 'information-circle' },
    ];

    return (
      <View style={[styles.desktopHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {/* Title and Actions Row */}
        <View style={styles.desktopHeaderTop}>
          <Text style={[styles.desktopTitle, { color: theme.text }]}>Уведомления</Text>

          <View style={styles.desktopActions}>
            {/* Mark All as Read Button */}
            {shouldShowMarkAllButton(unreadCount) && (
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                style={[styles.desktopButton, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                <Text style={styles.desktopButtonText}>Прочитать все</Text>
              </TouchableOpacity>
            )}

            {/* Delete All Button */}
            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={handleDeleteAll}
                style={[styles.desktopButtonOutline, { borderColor: theme.error }]}
              >
                <Ionicons name="trash-outline" size={18} color={theme.error} />
                <Text style={[styles.desktopButtonOutlineText, { color: theme.error }]}>Удалить все</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters Row */}
        <View style={styles.filtersContainer}>
          {filters.map((filter) => {
            const isActive = selectedFilter === filter.key;
            const count =
              filter.key === 'all'
                ? notifications.length
                : notifications.filter((n) => {
                    switch (filter.key) {
                      case 'message':
                        return n.type === 'message' || n.type === 'mention' || n.type === 'reaction';
                      case 'task':
                        return n.type === 'task' || n.type === 'reminder';
                      case 'event':
                        return n.type === 'event';
                      case 'poll':
                        return n.type === 'poll';
                      case 'system':
                        return n.type === 'system';
                      default:
                        return false;
                    }
                  }).length;

            return (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setSelectedFilter(filter.key)}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isActive ? theme.primaryLight || theme.primary + '20' : 'transparent',
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={filter.icon}
                  size={16}
                  color={isActive ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.filterTabText,
                    { color: isActive ? theme.primary : theme.textSecondary },
                  ]}
                >
                  {filter.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.filterBadgeText}>{count > 99 ? '99+' : count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Mobile Header */}
      {!isWideScreen && (
        <ScreenHeader
          title="Уведомления"
          rightButton={
            shouldShowMarkAllButton(unreadCount)
              ? {
                  icon: 'checkmark-done',
                  color: '#3B82F6',
                  onPress: handleMarkAllAsRead,
                }
              : undefined
          }
        />
      )}

      {/* Desktop Header */}
      {renderDesktopHeader()}

      {/* List Container - Centered on Desktop */}
      <View style={isWideScreen ? styles.desktopListContainer : styles.listContainer}>
        <FlashList
          data={flattenedData}
          renderItem={renderItem}
          estimatedItemHeight={90}
          getItemType={getItemType}
          keyExtractor={(item, index) =>
            item.type === 'header' ? `header-${item.title}` : `notification-${item.data.id}`
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && isNotificationListEmpty(notifications)}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={
            isNotificationListEmpty(notifications) ? styles.emptyListContainer : undefined
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  emptyListContainer: {
    flexGrow: 1,
  },

  // Desktop Header Styles
  desktopHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  desktopHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  desktopTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  desktopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  desktopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'transform, box-shadow',
        transitionDuration: '0.15s',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  desktopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  desktopButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'transform, background-color',
        transitionDuration: '0.15s',
      },
    }),
  },
  desktopButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  // Filters Styles
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'background-color, border-color, transform',
        transitionDuration: '0.2s',
      },
    }),
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  filterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Section Header Styles
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 20,
  },
  sectionHeaderDesktop: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 0,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Desktop List Container (Centered with max-width)
  desktopListContainer: {
    flex: 1,
  },
});

export default NotificationListScreen;
