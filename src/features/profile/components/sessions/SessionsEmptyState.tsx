/**
 * SessionsEmptyState Component
 * Пустое состояние списка сессий
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface SessionsEmptyStateProps {
  loading: boolean;
}

export const SessionsEmptyState: React.FC<SessionsEmptyStateProps> = ({ loading }) => {
  const { theme } = useTheme();

  if (loading) {
    return null;
  }

  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="phone-portrait-outline" size={64} color={theme.textTertiary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        Нет активных сессий
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
});
