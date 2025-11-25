import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface TaskListEmptyStateProps {
  searchQuery: string;
  isAllEmpty: boolean;
}

export const TaskListEmptyState: React.FC<TaskListEmptyStateProps> = ({
  searchQuery,
  isAllEmpty,
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      backgroundColor: theme.background,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textTertiary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="checkmark-done" size={40} color={theme.textTertiary} />
      </View>
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Ничего не найдено' : 'Нет задач'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'Попробуйте изменить фильтры или поисковый запрос'
          : isAllEmpty
          ? 'Нажмите + чтобы создать первую задачу'
          : 'В этом статусе пока нет задач'}
      </Text>
    </View>
  );
};
