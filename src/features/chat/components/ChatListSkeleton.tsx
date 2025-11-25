/**
 * ChatListSkeleton Component
 * Скелетон для списка чатов
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, FlatList } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const ChatListSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Пульсирующая анимация
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const dynamicStyles = {
    line: {
      backgroundColor: theme.border,
      opacity,
    },
  };

  const renderChatItemSkeleton = ({ index }: { index: number }) => (
    <View style={[styles.chatItem, { backgroundColor: theme.card }]}>
      {/* Avatar */}
      <Animated.View style={[styles.avatar, dynamicStyles.line]} />

      {/* Chat content */}
      <View style={styles.chatContent}>
        {/* Chat name and time */}
        <View style={styles.chatHeader}>
          <Animated.View style={[styles.chatName, dynamicStyles.line]} />
          <Animated.View style={[styles.chatTime, dynamicStyles.line]} />
        </View>

        {/* Last message preview */}
        <View style={styles.chatPreview}>
          <Animated.View style={[styles.messagePreview, dynamicStyles.line]} />
          {/* Unread badge (показываем только на некоторых элементах для разнообразия) */}
          {index % 3 === 0 && (
            <Animated.View style={[styles.unreadBadge, dynamicStyles.line]} />
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Chat list */}
      <FlatList
        data={Array.from({ length: 8 })}
        renderItem={renderChatItemSkeleton}
        keyExtractor={(_, index) => `skeleton-${index}`}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  chatContent: {
    flex: 1,
    gap: 6,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatName: {
    height: 16,
    width: 140,
    borderRadius: 8,
  },
  chatTime: {
    height: 12,
    width: 50,
    borderRadius: 6,
  },
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreview: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});

export default ChatListSkeleton;
