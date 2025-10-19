import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Message } from '../../types/chat.types';
import { Avatar } from '@components/common/Avatar';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { getUser } from '@api/user.api'; // Assume this exists
import { User } from '../../types/user.types';

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

  const handleUserPress = () => {
    console.log('👤 User pressed!');
    console.log('👤 Sender:', sender);
    console.log('👤 Message:', message);

    if (!sender) {
      console.warn('⚠️ Sender not found!');
      // Показываем хотя бы базовую информацию
      Alert.alert(
        'Пользователь',
        `ID: ${message.sender_id}`,
        [{ text: 'Закрыть', style: 'cancel' }]
      );
      return;
    }

    // TODO: Открыть экран профиля пользователя
    // Пока показываем информацию в Alert
    console.log('✅ Opening user profile');
    Alert.alert(
      sender.full_name || sender.email || 'Пользователь',
      `Email: ${sender.email || 'Не указан'}\nID: ${sender.id}`,
      [
        { text: 'Закрыть', style: 'cancel' }
      ]
    );
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
      color: theme.text,
    },
    time: {
      color: theme.textTertiary,
    },
    ownTime: {
      color: theme.textTertiary,
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
        <TouchableOpacity onPress={handleUserPress} activeOpacity={0.7}>
          <Avatar
            uri={sender?.avatar}
            name={sender?.full_name || `User ${message.sender_id}`}
            size={32}
            style={styles.avatar}
          />
        </TouchableOpacity>
      )}
      <View style={[styles.messageBubble, dynamicStyles.messageBubble, isOwnMessage && [styles.ownMessageBubble, dynamicStyles.ownMessageBubble]]}>
        {!isOwnMessage && (
          <TouchableOpacity onPress={handleUserPress} activeOpacity={0.7}>
            <Text style={[styles.senderName, dynamicStyles.senderName]}>
              {sender?.full_name || `User ${message.sender_id}`}
            </Text>
          </TouchableOpacity>
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
    minWidth: 100,
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
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
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