/**
 * TaskDetailSkeleton Component
 * Скелетон для страницы деталей задачи
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Скелетон только для контента (без header и tabs)
 * Используется внутри ScrollView когда task ещё не загружен
 */
export const TaskContentSkeleton: React.FC = () => {
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

  const dynamicStyles = {
    line: {
      backgroundColor: theme.border,
      opacity,
    },
  };

  return (
    <View style={styles.scrollContent}>
      {/* Main card */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Animated.View style={[styles.cardTitle, dynamicStyles.line]} />
        <Animated.View style={[styles.descLine, styles.descLineLong, dynamicStyles.line]} />
        <Animated.View style={[styles.descLine, styles.descLineMedium, dynamicStyles.line]} />
        <Animated.View style={[styles.descLine, styles.descLineShort, dynamicStyles.line]} />
        <View style={styles.cardFooter}>
          <Animated.View style={[styles.badge, dynamicStyles.line]} />
          <Animated.View style={[styles.badge, dynamicStyles.line]} />
          <Animated.View style={[styles.avatar, dynamicStyles.line]} />
        </View>
      </View>

      {/* Checklists skeleton */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Animated.View style={[styles.cardTitle, dynamicStyles.line]} />
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.checklistItem}>
            <Animated.View style={[styles.checkbox, dynamicStyles.line]} />
            <Animated.View style={[styles.checklistText, dynamicStyles.line]} />
          </View>
        ))}
      </View>

      {/* Subtasks skeleton */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Animated.View style={[styles.cardTitle, dynamicStyles.line]} />
        {[1, 2].map((item) => (
          <View key={item} style={[styles.subtaskItem, { borderBottomColor: theme.border }]}>
            <View style={styles.subtaskContent}>
              <Animated.View style={[styles.subtaskTitle, dynamicStyles.line]} />
              <Animated.View style={[styles.subtaskMeta, dynamicStyles.line]} />
            </View>
            <Animated.View style={[styles.subtaskBadge, dynamicStyles.line]} />
          </View>
        ))}
      </View>
    </View>
  );
};

/**
 * Полный скелетон для страницы (с header и tabs)
 * @deprecated Используйте TaskContentSkeleton внутри основного layout
 */
export const TaskDetailSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Пульсирующая анимация
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

  const dynamicStyles = {
    line: {
      backgroundColor: theme.border,
      opacity,
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          {/* Back button */}
          <Animated.View style={[styles.backButton, dynamicStyles.line]} />

          {/* Title */}
          <Animated.View style={[styles.headerTitle, dynamicStyles.line]} />

          {/* Actions button */}
          <Animated.View style={[styles.actionButton, dynamicStyles.line]} />
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Animated.View style={[styles.tab, dynamicStyles.line]} />
        <Animated.View style={[styles.tab, dynamicStyles.line]} />
        <Animated.View style={[styles.tab, dynamicStyles.line]} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Main card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          {/* Card header */}
          <Animated.View style={[styles.cardTitle, dynamicStyles.line]} />

          {/* Card content */}
          <Animated.View style={[styles.descLine, styles.descLineLong, dynamicStyles.line]} />
          <Animated.View style={[styles.descLine, styles.descLineMedium, dynamicStyles.line]} />
          <Animated.View style={[styles.descLine, styles.descLineShort, dynamicStyles.line]} />

          {/* Card footer */}
          <View style={styles.cardFooter}>
            <Animated.View style={[styles.badge, dynamicStyles.line]} />
            <Animated.View style={[styles.badge, dynamicStyles.line]} />
            <Animated.View style={[styles.avatar, dynamicStyles.line]} />
          </View>
        </View>

        {/* Checklists skeleton */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Animated.View style={[styles.cardTitle, dynamicStyles.line]} />

          {/* Checklist items */}
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.checklistItem}>
              <Animated.View style={[styles.checkbox, dynamicStyles.line]} />
              <Animated.View style={[styles.checklistText, dynamicStyles.line]} />
            </View>
          ))}
        </View>

        {/* Subtasks skeleton */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Animated.View style={[styles.cardTitle, dynamicStyles.line]} />

          {/* Subtask items */}
          {[1, 2].map((item) => (
            <View key={item} style={[styles.subtaskItem, { borderBottomColor: theme.border }]}>
              <View style={styles.subtaskContent}>
                <Animated.View style={[styles.subtaskTitle, dynamicStyles.line]} />
                <Animated.View style={[styles.subtaskMeta, dynamicStyles.line]} />
              </View>
              <Animated.View style={[styles.subtaskBadge, dynamicStyles.line]} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerTitle: {
    flex: 1,
    height: 20,
    borderRadius: 10,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
    borderBottomWidth: 1,
  },
  tab: {
    height: 24,
    width: 80,
    borderRadius: 12,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    height: 18,
    width: '40%',
    borderRadius: 9,
  },
  descLine: {
    height: 12,
    borderRadius: 6,
  },
  descLineLong: {
    width: '90%',
  },
  descLineMedium: {
    width: '70%',
  },
  descLineShort: {
    width: '50%',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  badge: {
    height: 24,
    width: 60,
    borderRadius: 12,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginLeft: 'auto',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  checklistText: {
    flex: 1,
    height: 14,
    borderRadius: 7,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  subtaskContent: {
    flex: 1,
    gap: 8,
  },
  subtaskTitle: {
    height: 16,
    width: '70%',
    borderRadius: 8,
  },
  subtaskMeta: {
    height: 12,
    width: '40%',
    borderRadius: 6,
  },
  subtaskBadge: {
    height: 24,
    width: 60,
    borderRadius: 12,
  },
});

export default TaskDetailSkeleton;
