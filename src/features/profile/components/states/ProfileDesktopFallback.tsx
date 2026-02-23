/**
 * ProfileDesktopFallback Component
 * Фоллбек для Suspense при lazy-загрузке ProfileNavigator на десктопе.
 * Повторяет layout ProfileSplitView: sidebar + content card
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { ProfileSidebarSkeleton } from './ProfileSidebarSkeleton';
import { ProfileContentSkeleton } from './ProfileContentSkeleton';

export const ProfileDesktopFallback: React.FC = () => {
  const { theme, isDark } = useTheme();
  const cardBg = isDark ? theme.card : '#FFFFFF';

  return (
    <View style={styles.container}>
      {/* Sidebar skeleton (mimics ProfileSidebarNavigation) */}
      <View style={[styles.sidebar, { backgroundColor: cardBg, borderColor: theme.border }]}>
        <ProfileSidebarSkeleton />
      </View>

      {/* Content card skeleton (mimics ProfileContentArea) */}
      <View style={[styles.content, { backgroundColor: cardBg, borderColor: theme.border }]}>
        <ProfileContentSkeleton />
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
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    minWidth: 240,
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    marginRight: 0,
    overflow: 'hidden',
    ...cardShadow,
  },
  content: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    marginLeft: 16,
    overflow: 'hidden',
    ...cardShadow,
  },
});
