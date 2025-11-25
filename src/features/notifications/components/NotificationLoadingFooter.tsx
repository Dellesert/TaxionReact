/**
 * Notification Loading Footer Component
 * Футер с индикатором загрузки для списка уведомлений
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { shouldShowLoadingFooter } from '../utils/notificationHelpers';

interface NotificationLoadingFooterProps {
  hasMore: boolean;
  notificationsCount: number;
  isLoading: boolean;
}

export const NotificationLoadingFooter: React.FC<
  NotificationLoadingFooterProps
> = ({ hasMore, notificationsCount, isLoading }) => {
  if (!shouldShowLoadingFooter(hasMore, notificationsCount, isLoading)) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#3B82F6" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
