/**
 * ChatDesktopFallback Component
 * Фоллбек для Suspense при lazy-загрузке чата на десктопе.
 * Показывает скелетоны левой (список чатов) и правой (чат) карточки.
 * Стили карточек повторяют ChatSplitView.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { ChatListSkeleton } from '../chat-list/ChatListSkeleton';
import { ChatDetailSkeleton } from './ChatDetailSkeleton';

export const ChatDesktopFallback: React.FC = () => {
  const { theme, isDark } = useTheme();
  const cardBgColor = isDark ? theme.card : '#FFFFFF';

  return (
    <View style={styles.container}>
      {/* Left card — chat list skeleton */}
      <View style={[styles.chatList, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
        {/* Header placeholder (search bar area) */}
        <View style={[styles.listHeader, { borderBottomColor: theme.border }]} />
        <ChatListSkeleton />
      </View>

      {/* Right card — chat detail skeleton */}
      <View style={[styles.chatDetail, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
        <ChatDetailSkeleton />
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
  chatList: {
    width: 420,
    minWidth: 360,
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    marginRight: 0,
    overflow: 'hidden',
    ...cardShadow,
  },
  listHeader: {
    height: 56,
    borderBottomWidth: 1,
  },
  chatDetail: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    marginLeft: 16,
    overflow: 'hidden',
    ...cardShadow,
  },
});
