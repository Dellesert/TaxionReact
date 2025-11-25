/**
 * Messages List Component
 * Список сообщений в чате
 */

import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Message } from '@/types/chat.types';
import { formatTime } from '@utils/message.utils';

interface MessagesListProps {
  messages: Message[];
  currentUserId: number | undefined;
  flatListRef: React.RefObject<FlatList | null>;
  onReact: (messageId: number, emoji: string) => Promise<void>;
  onLongPress: (message: Message) => void;
  onEndReached: () => void;
}

export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  currentUserId,
  flatListRef,
  onLongPress,
  onEndReached,
}) => {
  const { theme } = useTheme();

  const renderItem = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === currentUserId;

    return (
      <TouchableOpacity
        onLongPress={() => onLongPress(item)}
        activeOpacity={0.9}
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOwn ? theme.messageOwn : theme.messageOther,
            },
          ]}
        >
          <Text style={[styles.messageText, { color: theme.text }]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, { color: theme.textTertiary }]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      inverted
      contentContainerStyle={styles.listContent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});
