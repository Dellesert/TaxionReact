import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '@types/chat.types';
import { Avatar } from '@components/common/Avatar';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { getUser } from '@api/user.api'; // Assume this exists

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const currentUser = useAuthStore((state) => state.user);
  const { theme } = useTheme();
  const [sender, setSender] = useState<User | null>(message.sender || null);

  // Fetch sender if missing
  useEffect(() => {
    if (!message.sender && message.sender_id) {
      console.warn('Message without sender:', message);
      getUser(message.sender_id)
        .then((user) => setSender(user))
        .catch(() => console.error('Failed to fetch sender'));
    }
  }, [message.sender, message.sender_id]);

  const isOwnMessage = message.sender_id === currentUser?.id;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const dynamicStyles = StyleSheet.create({
    messageBubble: {
      backgroundColor: theme.messageOther,
    },
    ownMessageBubble: {
      backgroundColor: theme.messageOwn,
    },
    senderName: {
      color: theme.primary,
    },
    messageText: {
      color: theme.text,
    },
    ownMessageText: {
      color: '#FFFFFF',
    },
    time: {
      color: theme.textTertiary,
    },
    ownTime: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    edited: {
      color: theme.textTertiary,
    },
    ownEdited: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
  });

  return (
    <View style={[styles.container, isOwnMessage && styles.ownMessageContainer]}>
      {!isOwnMessage && (
        <Avatar
          uri={sender?.avatar}
          name={sender?.full_name || `User ${message.sender_id}`}
          size={32}
          style={styles.avatar}
        />
      )}
      <View style={[styles.messageBubble, dynamicStyles.messageBubble, isOwnMessage && [styles.ownMessageBubble, dynamicStyles.ownMessageBubble]]}>
        {!isOwnMessage && (
          <Text style={[styles.senderName, dynamicStyles.senderName]}>
            {sender?.full_name || `User ${message.sender_id}`}
          </Text>
        )}
        <Text style={[styles.messageText, dynamicStyles.messageText, isOwnMessage && dynamicStyles.ownMessageText]}>
          {message.content}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.time, dynamicStyles.time, isOwnMessage && dynamicStyles.ownTime]}>
            {formatTime(message.created_at)}
          </Text>
          {message.is_edited && (
            <Text style={[styles.edited, dynamicStyles.edited, isOwnMessage && dynamicStyles.ownEdited]}>
              изменено
            </Text>
          )}
        </View>
      </View>
      {isOwnMessage && (
        <Avatar
          uri={sender?.avatar}
          name={sender?.full_name || 'You'}
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
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 12,
  },
  ownMessageBubble: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'center',
  },
  time: {
    fontSize: 11,
  },
  edited: {
    fontSize: 11,
    marginLeft: 6,
    fontStyle: 'italic',
  },
});

export default MessageItem;