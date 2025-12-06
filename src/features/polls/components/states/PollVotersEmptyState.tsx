import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export const PollVotersEmptyState: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color="#9CA3AF" />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        Пока никто не проголосовал
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
