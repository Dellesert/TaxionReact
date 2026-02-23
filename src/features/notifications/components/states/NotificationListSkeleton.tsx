/**
 * NotificationListSkeleton Component
 * Скелетон для десктопной страницы уведомлений с пульсирующей анимацией.
 * Повторяет структуру: заголовок + фильтры + список уведомлений.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const NotificationListSkeleton: React.FC = () => {
  const { theme } = useTheme();
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

  const renderNotificationSkeleton = (key: number) => (
    <View
      key={key}
      style={[
        styles.notificationItem,
        { backgroundColor: theme.card, borderBottomColor: theme.border },
      ]}
    >
      {/* Avatar */}
      <Animated.View style={[styles.avatar, line]} />

      <View style={styles.textContainer}>
        {/* Title */}
        <Animated.View style={[styles.title, line]} />
        {/* Message line 1 */}
        <Animated.View style={[styles.messageLine, styles.messageLine1, line]} />
        {/* Message line 2 */}
        <Animated.View style={[styles.messageLine, styles.messageLine2, line]} />
        {/* Time */}
        <Animated.View style={[styles.time, line]} />
      </View>
    </View>
  );

  const renderSectionHeader = (key: number, width: number) => (
    <View key={`section-${key}`} style={styles.sectionHeader}>
      <Animated.View style={[styles.sectionTitle, { width }, line]} />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Section: Сегодня */}
      {renderSectionHeader(0, 80)}
      {[0, 1, 2].map(renderNotificationSkeleton)}

      {/* Section: Вчера */}
      {renderSectionHeader(1, 60)}
      {[3, 4].map(renderNotificationSkeleton)}

      {/* Section: Последние 7 дней */}
      {renderSectionHeader(2, 140)}
      {[5, 6, 7].map(renderNotificationSkeleton)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingTop: 16,
  },
  sectionTitle: {
    height: 12,
    borderRadius: 6,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    marginVertical: 3,
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    height: 14,
    borderRadius: 7,
    marginBottom: 8,
    width: '60%',
  },
  messageLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: 6,
  },
  messageLine1: {
    width: '90%',
  },
  messageLine2: {
    width: '70%',
  },
  time: {
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    width: '30%',
  },
});
