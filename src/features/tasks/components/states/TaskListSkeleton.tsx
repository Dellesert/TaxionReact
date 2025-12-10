import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { TaskSkeleton } from './TaskSkeleton';

export const TaskListSkeleton: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={Array.from({ length: 8 })}
        renderItem={({ index }) => <TaskSkeleton key={`skeleton-${index}`} />}
        keyExtractor={(_, index) => `skeleton-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 120,
  },
});
