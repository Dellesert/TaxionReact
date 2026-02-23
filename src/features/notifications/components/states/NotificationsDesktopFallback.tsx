/**
 * NotificationsDesktopFallback Component
 * Фоллбек для Suspense при lazy-загрузке уведомлений на десктопе.
 * Повторяет макет: заголовок с кнопками + фильтры + список скелетонов.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { NotificationListSkeleton } from './NotificationListSkeleton';

export const NotificationsDesktopFallback: React.FC = () => {
  const { theme, isDark } = useTheme();
  const cardBg = isDark ? theme.card : '#FFFFFF';
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const line = { backgroundColor: theme.border, opacity };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Desktop Header Skeleton */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: cardBg,
            borderBottomColor: theme.border,
          },
        ]}
      >
        {/* Title + Actions row */}
        <View style={styles.headerTop}>
          <Animated.View style={[styles.titlePlaceholder, line]} />
          <View style={styles.actionsRow}>
            <Animated.View style={[styles.buttonPlaceholder, line]} />
            <Animated.View style={[styles.buttonOutlinePlaceholder, line]} />
          </View>
        </View>

        {/* Filter tabs row */}
        <View style={styles.filtersRow}>
          {[70, 100, 72, 84, 76, 82].map((width, i) => (
            <Animated.View
              key={i}
              style={[styles.filterTab, { width }, line]}
            />
          ))}
        </View>
      </View>

      {/* Notification List Skeleton */}
      <NotificationListSkeleton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titlePlaceholder: {
    height: 28,
    width: 180,
    borderRadius: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonPlaceholder: {
    height: 40,
    width: 150,
    borderRadius: 12,
  },
  buttonOutlinePlaceholder: {
    height: 40,
    width: 130,
    borderRadius: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterTab: {
    height: 36,
    borderRadius: 20,
  },
});
