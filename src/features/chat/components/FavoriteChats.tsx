/**
 * Favorite Chats Component
 * Компонент для отображения избранных чатов в виде горизонтального списка аватаров
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Chat } from '../types/chat.types';
import { getChatDisplayName, getChatDisplayAvatar } from '../utils/chatUtils';
import { useAuthStore } from '@shared/store/authStore';

interface FavoriteChatsProps {
  chats: Chat[];
  onChatPress: (chat: Chat) => void;
}

export const FavoriteChats: React.FC<FavoriteChatsProps> = ({ chats, onChatPress }) => {
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);

  // Фильтруем только избранные чаты
  const favoriteChats = chats.filter(chat => chat.is_favorite);

  // Если нет избранных чатов, не отображаем компонент
  if (favoriteChats.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {favoriteChats.map((chat) => {
          const displayName = getChatDisplayName(chat, currentUser);
          const avatarUrl = getChatDisplayAvatar(chat, currentUser);

          return (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatItem}
              onPress={() => onChatPress(chat)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="person" size={24} color={theme.primary} />
                  </View>
                )}
                {!!chat.unread_count && chat.unread_count > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.error }]}>
                    <Text style={styles.badgeText}>
                      {chat.unread_count > 99 ? '99+' : String(chat.unread_count)}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.chatName, { color: theme.text }]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  chatItem: {
    alignItems: 'center',
    marginHorizontal: 4,
    width: 70,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  chatName: {
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },
});
