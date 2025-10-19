import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Message } from '../../types/chat.types';
import { Avatar } from '@components/common/Avatar';
import { UserProfileModal } from '@components/common/UserProfileModal';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { getUser } from '@api/user.api';
import { User } from '../../types/user.types';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const currentUser = useAuthStore((state) => state.user);
  const { theme } = useTheme();
  const [sender, setSender] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Fetch sender
  useEffect(() => {
    console.log('🔄 MessageItem effect running for message:', message.id);
    console.log('🔄 message.sender:', message.sender);
    console.log('🔄 message.sender_id:', message.sender_id);

    if (message.sender) {
      console.log('✅ Sender already in message:', message.sender);
      setSender(message.sender);
    } else if (message.sender_id) {
      console.log('📥 Fetching sender for message:', message.id, 'sender_id:', message.sender_id);
      getUser(message.sender_id)
        .then((user) => {
          console.log('✅ Fetched sender:', user);
          setSender(user);
        })
        .catch((error) => {
          console.error('❌ Failed to fetch sender:', error);
        });
    }
  }, [message.id, message.sender, message.sender_id]);

  const isOwnMessage = message.sender_id === currentUser?.id;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleUserPress = async () => {
    console.log('👤 User pressed!');

    // Если sender уже есть - используем его
    let senderData = sender || message.sender;

    // Если нет - загружаем прямо сейчас
    if (!senderData && message.sender_id) {
      console.log('📥 Fetching sender on click...');
      try {
        senderData = await getUser(message.sender_id);
        setSender(senderData); // Сохраняем для следующего раза
      } catch (error) {
        console.error('❌ Failed to fetch sender on click:', error);
      }
    }

    // Открываем модальное окно
    if (senderData) {
      setShowProfileModal(true);
    }
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

      {/* Модальное окно профиля */}
      <UserProfileModal
        visible={showProfileModal}
        user={sender}
        onClose={() => setShowProfileModal(false)}
      />
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