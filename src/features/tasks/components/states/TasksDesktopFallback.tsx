/**
 * TasksDesktopFallback Component
 * Фоллбек для Suspense при lazy-загрузке задач на десктопе.
 * Показывает скелетон канбан-доски вместо ActivityIndicator.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { TaskBoardSkeleton } from './TaskBoardSkeleton';

export const TasksDesktopFallback: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TaskBoardSkeleton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
