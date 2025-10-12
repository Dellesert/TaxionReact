import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '@types/chat.types';
import { Avatar } from '@components/common/Avatar';
import { useAuthStore } from '@store/authStore';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const currentUser = useAuthStore((state) => state.user);

  // Safe check for sender
  if (!message.sender) {
    console.error('Message without sender:', message);
    return null;
  }

  const isOwnMessage = message.sender.id === currentUser?.id;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.container, isOwnMessage && styles.ownMessageContainer]}>
      {!isOwnMessage && (
        <Avatar
          uri={message.sender?.avatar}
          name={message.sender?.full_name || 'Unknown'}
          size={32}
          style={styles.avatar}
        />
      )}
      <View style={[styles.messageBubble, isOwnMessage && styles.ownMessageBubble]}>
        {!isOwnMessage && (
          <Text style={styles.senderName}>
            {message.sender?.full_name || 'Unknown User'}
          </Text>
        )}
        <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
          {message.content}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.time, isOwnMessage && styles.ownTime]}>
            {formatTime(message.created_at)}
          </Text>
          {message.is_edited && (
            <Text style={[styles.edited, isOwnMessage && styles.ownEdited]}>
              изменено
            </Text>
          )}
        </View>
      </View>
      {isOwnMessage && (
        <Avatar
          uri={message.sender?.avatar}
          name={message.sender?.full_name || 'You'}
          size={32}
          style={styles.avatar}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 16,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '70%',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 12,
  },
  ownMessageBubble: {
    backgroundColor: '#E94444',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E94444',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'center',
  },
  time: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  ownTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  edited: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  ownEdited: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default MessageItem;
