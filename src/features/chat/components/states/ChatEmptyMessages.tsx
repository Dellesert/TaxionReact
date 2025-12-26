import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { ChatType } from '../../types/chat.types';

interface ChatEmptyMessagesProps {
  chatType?: ChatType;
}

/**
 * Empty state placeholder for chat with no messages
 */
export const ChatEmptyMessages: React.FC<ChatEmptyMessagesProps> = ({ chatType }) => {
  const { theme } = useTheme();

  // Специальный контент для saved чата
  const isSavedChat = chatType === 'saved';

  const iconName = isSavedChat ? 'bookmark' : 'chatbubbles-outline';
  const iconColor = isSavedChat ? '#FFFFFF' : theme.textTertiary;
  const iconBgColor = isSavedChat ? '#3B82F6' : theme.backgroundTertiary;
  const title = isSavedChat ? 'Избранное пусто' : 'Сообщений пока нет';
  const subtitle = isSavedChat
    ? 'Пересылайте сюда важные сообщения, чтобы сохранить их'
    : 'Отправьте первое сообщение, чтобы начать беседу';

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={iconName} size={48} color={iconColor} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        {subtitle}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100, // Space for input at bottom
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
