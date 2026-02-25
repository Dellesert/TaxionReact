import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PollListEmptyStateProps {
  canCreate?: boolean;
}

export const PollListEmptyState: React.FC<PollListEmptyStateProps> = ({ canCreate = false }) => {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="bar-chart-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>Нет опросов</Text>
      {canCreate && (
        <Text style={styles.emptySubtitle}>Создайте первый опрос для вашей команды</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
