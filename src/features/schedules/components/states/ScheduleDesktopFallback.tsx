/**
 * ScheduleDesktopFallback Component
 * Фоллбек для Suspense при lazy-загрузке графиков на десктопе.
 * Показывает скелетоны левой и правой карточки вместо ActivityIndicator.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { ScheduleSidebarSkeleton } from './ScheduleSidebarSkeleton';
import { ScheduleListContentSkeleton } from './ScheduleListContentSkeleton';

export const ScheduleDesktopFallback: React.FC = () => {
  const { theme, isDark } = useTheme();
  const cardBgColor = isDark ? theme.card : '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Desktop row layout matching ScheduleListScreen */}
      <View style={styles.desktopRow}>
        {/* Left Sidebar - DayStrip + DailySummary */}
        <View style={[styles.summarySidebar, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
          <ScheduleSidebarSkeleton />
        </View>

        {/* Main Panel - Schedule list */}
        <View style={[styles.mainPanel, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
          {/* Header placeholder */}
          <View style={[styles.mainPanelHeader, { borderColor: theme.border }]} />
          <ScheduleListContentSkeleton />
        </View>
      </View>
    </View>
  );
};

const sidebarShadow = Platform.OS === 'web' ? {
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
  },
  desktopRow: {
    flex: 1,
    flexDirection: 'row',
  },
  summarySidebar: {
    width: 380,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    marginRight: 0,
    overflow: 'hidden',
    ...sidebarShadow,
  },
  mainPanel: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    marginLeft: 16,
    overflow: 'hidden',
    ...sidebarShadow,
  },
  mainPanelHeader: {
    height: 56,
    borderBottomWidth: 1,
  },
});
