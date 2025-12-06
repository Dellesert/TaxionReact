/**
 * ChecklistSkeleton Component
 * Скелетон для чек-листов задачи
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const ChecklistSkeleton: React.FC = () => {
  const { theme } = useTheme();
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
    <View style={styles.container}>
      {/* First Checklist */}
      <View style={[styles.checklistCard, { backgroundColor: theme.card }]}>
        {/* Checklist Header */}
        <View style={styles.checklistHeader}>
          {/* Title with icon */}
          <View style={styles.headerLeft}>
            <Animated.View style={[styles.icon, dynamicStyles.line]} />
            <Animated.View style={[styles.checklistTitle, dynamicStyles.line]} />
          </View>
          {/* Progress circle */}
          <Animated.View style={[styles.progressCircle, dynamicStyles.line]} />
        </View>

        {/* Checklist Items */}
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.checklistItem}>
            <Animated.View style={[styles.checkbox, dynamicStyles.line]} />
            <Animated.View style={[styles.itemText, dynamicStyles.line]} />
          </View>
        ))}

        {/* Footer with assignee */}
        <View style={styles.checklistFooter}>
          <Animated.View style={[styles.assigneeAvatar, dynamicStyles.line]} />
          <Animated.View style={[styles.assigneeName, dynamicStyles.line]} />
        </View>
      </View>

      {/* Second Checklist */}
      <View style={[styles.checklistCard, { backgroundColor: theme.card }]}>
        {/* Checklist Header */}
        <View style={styles.checklistHeader}>
          {/* Title with icon */}
          <View style={styles.headerLeft}>
            <Animated.View style={[styles.icon, dynamicStyles.line]} />
            <Animated.View style={[styles.checklistTitle, dynamicStyles.line]} />
          </View>
          {/* Progress circle */}
          <Animated.View style={[styles.progressCircle, dynamicStyles.line]} />
        </View>

        {/* Checklist Items */}
        {[1, 2].map((item) => (
          <View key={item} style={styles.checklistItem}>
            <Animated.View style={[styles.checkbox, dynamicStyles.line]} />
            <Animated.View style={[styles.itemText, dynamicStyles.line]} />
          </View>
        ))}

        {/* Footer with assignee */}
        <View style={styles.checklistFooter}>
          <Animated.View style={[styles.assigneeAvatar, dynamicStyles.line]} />
          <Animated.View style={[styles.assigneeName, dynamicStyles.line]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  checklistCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  icon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  checklistTitle: {
    height: 18,
    width: '50%',
    borderRadius: 9,
  },
  progressCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  itemText: {
    flex: 1,
    height: 14,
    borderRadius: 7,
  },
  checklistFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  assigneeName: {
    height: 14,
    width: 100,
    borderRadius: 7,
  },
});

export default ChecklistSkeleton;
