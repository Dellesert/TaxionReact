/**
 * Selected Users Counter Component
 * Счетчик выбранных пользователей
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface SelectedUsersCounterProps {
  count: number;
}

export const SelectedUsersCounter: React.FC<SelectedUsersCounterProps> = ({ count }) => {
  const { theme } = useTheme();

  if (count === 0) return null;

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary,
    },
    text: {
      color: theme.primary,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <Ionicons name="people" size={20} color={theme.primary} />
      <Text style={[styles.text, dynamicStyles.text]}>Выбрано: {count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});
