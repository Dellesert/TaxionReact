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

  return (
    <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundTertiary }]}>
        <Ionicons name="checkmark-done" size={40} color={theme.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {searchQuery ? 'Ничего не найдено' : 'Нет задач'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
        {searchQuery
          ? 'Попробуйте изменить фильтры или поисковый запрос'
          : isAllEmpty
          ? 'Нажмите + чтобы создать первую задачу'
          : 'В этом статусе пока нет задач'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
