/**
 * Notification Empty State Component
 * Пустое состояние для списка уведомлений
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEmptyStateText } from '@utils/notificationFormatters';

interface NotificationEmptyStateProps {
  isLoading: boolean;
}

export const NotificationEmptyState: React.FC<NotificationEmptyStateProps> = ({
  isLoading,
}) => {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const { title, subtitle } = getEmptyStateText();

  return (
    <View style={styles.container}>
      <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
