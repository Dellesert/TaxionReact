/**
 * Notification Empty State Component
 * Пустое состояние для списка уведомлений
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { getEmptyStateText } from '../utils/notificationFormatters';

export const NotificationEmptyState: React.FC = () => {
  const { theme } = useTheme();
  const { title, subtitle } = getEmptyStateText();

  return (
    <View style={styles.container}>
      <Ionicons name="notifications-off-outline" size={64} color={theme.textTertiary} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
