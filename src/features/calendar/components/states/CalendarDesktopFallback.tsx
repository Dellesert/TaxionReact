/**
 * CalendarDesktopFallback Component
 * Фоллбек для Suspense при lazy-загрузке календаря на десктопе.
 * Показывает скелетоны левой и правой карточки вместо ActivityIndicator.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { LeftSidebarSkeleton } from './LeftSidebarSkeleton';
import { EventListSkeleton } from './EventListSkeleton';

export const CalendarDesktopFallback: React.FC = () => {
  const { theme, isDark } = useTheme();
  const cardBgColor = isDark ? theme.card : '#FFFFFF';

  return (
    <View style={styles.container}>
      {/* Toolbar placeholder */}
      <View style={[styles.toolbarPlaceholder, { backgroundColor: cardBgColor, borderColor: theme.border }]} />

      {/* Two-card layout */}
      <View style={styles.contentContainer}>
        {/* Left card skeleton */}
        <View style={[styles.leftSidebar, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
          <LeftSidebarSkeleton />
        </View>

        {/* Center card skeleton */}
        <View style={[styles.centerPanel, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
          {/* Header placeholder */}
          <View style={[styles.headerPlaceholder, { borderColor: theme.border }]} />
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            <EventListSkeleton />
          </View>
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
    flexDirection: 'column',
  },
  toolbarPlaceholder: {
    height: 56,
    borderBottomWidth: 1,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftSidebar: {
    width: 350,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 16,
    marginLeft: 16,
    overflow: 'hidden',
    ...sidebarShadow,
  },
  centerPanel: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 16,
    marginLeft: 16,
    marginRight: 16,
    overflow: 'hidden',
    ...sidebarShadow,
  },
  headerPlaceholder: {
    height: 56,
    borderBottomWidth: 1,
  },
});
