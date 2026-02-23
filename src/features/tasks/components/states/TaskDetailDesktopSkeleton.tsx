/**
 * TaskDetailDesktopSkeleton Component
 * Скелетон для двухколоночного десктоп-лейаута деталей задачи
 * Повторяет структуру TaskDesktopLayout: левая колонка (обзор) + правая (табы)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const TaskDetailDesktopSkeleton: React.FC = () => {
  const { theme, isDark } = useTheme();
  const cardBgColor = isDark ? theme.card : '#FFFFFF';
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

  return (
    <View style={styles.container}>
      <View style={styles.columnsRow}>
        {/* LEFT COLUMN — Task Overview */}
        <View style={styles.leftColumn}>
          <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
            {/* Card header */}
            <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
              <Animated.View style={[styles.headerIcon, line]} />
              <Animated.View style={[styles.headerTitle, line]} />
            </View>
            {/* Content */}
            <View style={[styles.cardBody, { backgroundColor: theme.background }]}>
              {/* Title */}
              <Animated.View style={[styles.taskTitle, line]} />
              {/* Description lines */}
              <Animated.View style={[styles.descLine, { width: '90%' }, line]} />
              <Animated.View style={[styles.descLine, { width: '75%' }, line]} />
              <Animated.View style={[styles.descLine, { width: '60%' }, line]} />
              {/* Meta row (badges + avatar) */}
              <View style={styles.metaRow}>
                <Animated.View style={[styles.badge, line]} />
                <Animated.View style={[styles.badge, line]} />
                <Animated.View style={[styles.avatar, line]} />
              </View>
              {/* Checklist section */}
              <View style={styles.section}>
                <Animated.View style={[styles.sectionTitle, line]} />
                {[1, 2, 3].map((i) => (
                  <View key={i} style={styles.checklistRow}>
                    <Animated.View style={[styles.checkbox, line]} />
                    <Animated.View style={[styles.checklistText, line]} />
                  </View>
                ))}
              </View>
              {/* Subtasks section */}
              <View style={styles.section}>
                <Animated.View style={[styles.sectionTitle, line]} />
                {[1, 2].map((i) => (
                  <View key={i} style={[styles.subtaskRow, { borderBottomColor: theme.border }]}>
                    <View style={styles.subtaskContent}>
                      <Animated.View style={[styles.subtaskTitle, line]} />
                      <Animated.View style={[styles.subtaskMeta, line]} />
                    </View>
                    <Animated.View style={[styles.subtaskBadge, line]} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* RIGHT COLUMN — Details Tabs */}
        <View style={styles.rightColumn}>
          <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
            {/* Card header */}
            <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
              <Animated.View style={[styles.headerIcon, line]} />
              <Animated.View style={[styles.headerTitle, line]} />
            </View>
            {/* Tab bar */}
            <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.tabItem}>
                  <Animated.View style={[styles.tabIcon, line]} />
                  <Animated.View style={[styles.tabLabel, line]} />
                </View>
              ))}
            </View>
            {/* Tab content */}
            <View style={[styles.tabContent, { backgroundColor: theme.background }]}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.attachmentRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Animated.View style={[styles.attachmentIcon, line]} />
                  <View style={styles.attachmentTexts}>
                    <Animated.View style={[styles.attachmentName, line]} />
                    <Animated.View style={[styles.attachmentSize, line]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const shadowStyle = Platform.select({
  web: {
    // @ts-ignore
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  columnsRow: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },

  // Columns
  leftColumn: {
    flex: 2,
    minWidth: 360,
    maxWidth: 600,
  },
  rightColumn: {
    flex: 3,
    minWidth: 400,
  },

  // Card
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadowStyle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  headerTitle: {
    width: 60,
    height: 16,
    borderRadius: 8,
  },
  cardBody: {
    flex: 1,
    padding: 16,
    gap: 12,
  },

  // Task overview
  taskTitle: {
    height: 20,
    width: '55%',
    borderRadius: 10,
  },
  descLine: {
    height: 12,
    borderRadius: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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

  // Checklist
  section: {
    marginTop: 8,
    gap: 8,
  },
  sectionTitle: {
    height: 16,
    width: '35%',
    borderRadius: 8,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
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

  // Subtasks
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  subtaskContent: {
    flex: 1,
    gap: 6,
  },
  subtaskTitle: {
    height: 14,
    width: '65%',
    borderRadius: 7,
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

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  tabIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  tabLabel: {
    width: 70,
    height: 14,
    borderRadius: 7,
  },

  // Tab content (attachment-like rows)
  tabContent: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  attachmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  attachmentTexts: {
    flex: 1,
    gap: 6,
  },
  attachmentName: {
    height: 14,
    width: '60%',
    borderRadius: 7,
  },
  attachmentSize: {
    height: 12,
    width: '30%',
    borderRadius: 6,
  },
});
