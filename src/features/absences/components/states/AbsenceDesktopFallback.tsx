/**
 * AbsenceDesktopFallback Component
 * Фоллбек для Suspense при lazy-загрузке экрана нерабочих дней на десктопе.
 * Показывает скелетон представления «Список» (дефолтный viewMode).
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { AbsenceListSkeleton } from './AbsenceListSkeleton';

export const AbsenceDesktopFallback: React.FC = () => {
  const { theme, isDark } = useTheme();
  const cardBg = isDark ? theme.card : '#FFFFFF';

  return (
    <View style={styles.container}>
      {/* Toolbar placeholder */}
      <View style={[styles.toolbarPlaceholder, { backgroundColor: cardBg, borderColor: theme.border }]} />

      {/* Single card layout (list view default) */}
      <View style={styles.contentContainer}>
        <View style={[styles.listCard, { backgroundColor: cardBg, borderColor: theme.border }]}>
          {/* Card header placeholder */}
          <View style={[styles.cardHeader, { borderColor: theme.border }]} />
          <AbsenceListSkeleton />
        </View>
      </View>
    </View>
  );
};

const cardShadow = Platform.OS === 'web' ? {
  // @ts-ignore - web only
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
} : {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  toolbarPlaceholder: {
    height: 56,
    borderBottomWidth: 1,
  },
  contentContainer: {
    flex: 1,
  },
  listCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    overflow: 'hidden',
    ...cardShadow,
  },
  cardHeader: {
    height: 56,
    borderBottomWidth: 1,
  },
});
