/**
 * Notification Skeleton Component
 * Скелетон для загрузки уведомлений
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';

interface NotificationSkeletonProps {
  count?: number;
}

const SkeletonItem: React.FC<{ isDesktop: boolean }> = ({ isDesktop }) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.skeletonItem,
        isDesktop && styles.skeletonItemDesktop,
        { backgroundColor: theme.card, borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.content}>
        {/* Avatar skeleton */}
        <View style={[styles.avatarSkeleton, { backgroundColor: theme.border }]} />

        {/* Text content skeleton */}
        <View style={styles.textContainer}>
          {/* Title skeleton */}
          <View
            style={[styles.titleSkeleton, { backgroundColor: theme.border }]}
          />
          {/* Message skeleton - 2 lines */}
          <View
            style={[styles.messageSkeleton, styles.messageSkeletonFirst, { backgroundColor: theme.border }]}
          />
          <View
            style={[styles.messageSkeleton, styles.messageSkeletonSecond, { backgroundColor: theme.border }]}
          />
          {/* Time skeleton */}
          <View
            style={[styles.timeSkeleton, { backgroundColor: theme.border }]}
          />
        </View>
      </View>
    </View>
  );
};

export const NotificationSkeleton: React.FC<NotificationSkeletonProps> = ({
  count = 8,
}) => {
  const isDesktop = useIsWideScreen();

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={index} isDesktop={isDesktop} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  skeletonItemDesktop: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 0,
    marginVertical: 6,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    borderBottomWidth: 0,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarSkeleton: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  textContainer: {
    flex: 1,
  },
  titleSkeleton: {
    height: 14,
    borderRadius: 7,
    marginBottom: 8,
    width: '60%',
  },
  messageSkeleton: {
    height: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  messageSkeletonFirst: {
    width: '90%',
  },
  messageSkeletonSecond: {
    width: '70%',
  },
  timeSkeleton: {
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    width: '30%',
  },
});
