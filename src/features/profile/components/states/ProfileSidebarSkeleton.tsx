/**
 * ProfileSidebarSkeleton Component
 * Скелетон для sidebar навигации настроек профиля
 * (группы АККАУНТЫ, ПРОФИЛЬ, БЕЗОПАСНОСТЬ, ВНЕШНИЙ ВИД, НАСТРОЙКИ + кнопка выхода)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const ProfileSidebarSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const line = { backgroundColor: theme.border, opacity };

  const renderItem = (key: number, isActive: boolean = false) => (
    <View
      key={key}
      style={[
        styles.item,
        isActive && { backgroundColor: theme.primary, opacity: 0.15, borderRadius: 8 },
      ]}
    >
      <Animated.View style={[styles.itemIcon, line, { borderRadius: 6 }]} />
      <Animated.View style={[styles.itemLabel, line, { width: key % 2 === 0 ? 120 : 100 }]} />
    </View>
  );

  return (
    <View style={styles.content}>
      {/* Group: АККАУНТЫ */}
      <View style={styles.group}>
        <Animated.View style={[styles.groupTitle, line, { width: 70 }]} />
        {renderItem(0)}
      </View>

      {/* Group: ПРОФИЛЬ */}
      <View style={styles.group}>
        <Animated.View style={[styles.groupTitle, line, { width: 60 }]} />
        {renderItem(1, true)}
      </View>

      {/* Group: БЕЗОПАСНОСТЬ */}
      <View style={styles.group}>
        <Animated.View style={[styles.groupTitle, line, { width: 100 }]} />
        {renderItem(2)}
        {renderItem(3)}
      </View>

      {/* Group: ВНЕШНИЙ ВИД */}
      <View style={styles.group}>
        <Animated.View style={[styles.groupTitle, line, { width: 90 }]} />
        {renderItem(4)}
      </View>

      {/* Group: НАСТРОЙКИ */}
      <View style={styles.group}>
        <Animated.View style={[styles.groupTitle, line, { width: 80 }]} />
        {renderItem(5)}
        {renderItem(6)}
        {renderItem(7)}
        {renderItem(8)}
      </View>

      {/* Logout button placeholder */}
      <View style={styles.logoutSpacer} />
      <View style={[styles.logoutArea, { borderTopColor: theme.border }]}>
        <Animated.View style={[styles.logoutButton, line, { borderRadius: 8 }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
  },
  group: {
    marginBottom: 20,
  },
  groupTitle: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    gap: 12,
  },
  itemIcon: {
    width: 28,
    height: 28,
  },
  itemLabel: {
    height: 14,
    borderRadius: 7,
  },
  logoutSpacer: {
    flex: 1,
  },
  logoutArea: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  logoutButton: {
    height: 44,
    marginHorizontal: 8,
  },
});
