/**
 * Notification List Screen (Refactored)
 * Экран со списком уведомлений
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNotificationStore } from '@shared/store/notificationStore';
import NotificationItem from '@shared/components/common/NotificationItem';
import ScreenHeader from '@shared/components/common/ScreenHeader';
import { Notification } from '@/types/notification.types';

// Custom Hooks
import { useNotificationListData } from '../hooks/useNotificationListData';
import { useNotificationListActions } from '../hooks/useNotificationListActions';

// Components
import { NotificationEmptyState } from '../components/NotificationEmptyState';
import { NotificationLoadingFooter } from '../components/NotificationLoadingFooter';

// Utils
import { shouldShowMarkAllButton, isNotificationListEmpty } from '../utils/notificationHelpers';

const NotificationListScreen: React.FC = () => {
  const { markAsRead } = useNotificationStore();

  // Custom Hooks
  const { notifications, isLoading, hasMore, unreadCount } = useNotificationListData();
  const { handleRefresh, handleLoadMore, handleNotificationPress, handleMarkAllAsRead } =
    useNotificationListActions(isLoading, hasMore);

  // Render notification item
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

  return (
    <View style={styles.container}>
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

      <FlashList
        data={notifications}
        renderItem={renderItem}
        estimatedItemSize={90}
        keyExtractor={(item) => item.id.toString()}
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
        contentContainerStyle={isNotificationListEmpty(notifications) ? styles.emptyListContainer : undefined}
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
});

export default NotificationListScreen;
