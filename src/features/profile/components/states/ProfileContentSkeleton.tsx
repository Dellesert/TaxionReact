/**
 * ProfileContentSkeleton Component
 * Скелетон для контент-области настроек профиля
 * Повторяет структуру ProfileContentArea (header) + форму редактирования профиля
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const ProfileContentSkeleton: React.FC = () => {
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

  const renderField = (key: number, labelWidth: number) => (
    <View key={key} style={styles.field}>
      <Animated.View style={[styles.fieldLabel, line, { width: labelWidth }]} />
      <Animated.View style={[styles.fieldInput, line, { backgroundColor: theme.backgroundSecondary }]} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header skeleton (mimics ProfileContentArea header) */}
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
        <Animated.View style={[styles.headerTitle, line]} />
        <Animated.View style={[styles.headerDescription, line]} />
      </View>

      {/* Content skeleton (mimics EditProfileContent form) */}
      <View style={styles.content}>
        {/* Avatar placeholder */}
        <View style={styles.avatarRow}>
          <Animated.View style={[styles.avatar, line, { borderRadius: 40 }]} />
          <View style={styles.avatarTexts}>
            <Animated.View style={[styles.avatarName, line]} />
            <Animated.View style={[styles.avatarSub, line]} />
          </View>
        </View>

        {/* Form fields */}
        {renderField(0, 40)}
        {renderField(1, 70)}
        {renderField(2, 100)}
        {renderField(3, 60)}

        {/* Save button placeholder */}
        <Animated.View style={[styles.saveButton, line, { borderRadius: 12 }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    height: 22,
    width: 160,
    borderRadius: 8,
    marginBottom: 10,
  },
  headerDescription: {
    height: 14,
    width: 300,
    borderRadius: 7,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
    maxWidth: 800,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
  },
  avatarTexts: {
    flex: 1,
    gap: 8,
  },
  avatarName: {
    height: 18,
    width: 140,
    borderRadius: 8,
  },
  avatarSub: {
    height: 14,
    width: 200,
    borderRadius: 7,
  },
  field: {
    marginBottom: 20,
    gap: 8,
  },
  fieldLabel: {
    height: 12,
    borderRadius: 6,
  },
  fieldInput: {
    height: 44,
    borderRadius: 10,
  },
  saveButton: {
    height: 48,
    width: 160,
    marginTop: 12,
  },
});
