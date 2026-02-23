/**
 * PollsDesktopFallback Component
 * Фоллбек для Suspense при lazy-загрузке опросов на десктопе.
 * Показывает скелетон сетки опросов вместо ActivityIndicator.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { PollBoardSkeleton } from './PollBoardSkeleton';

export const PollsDesktopFallback: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PollBoardSkeleton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
