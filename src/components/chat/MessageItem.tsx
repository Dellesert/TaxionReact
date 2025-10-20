import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Message } from '../../types/chat.types';
import { Avatar } from '@components/common/Avatar';
import { UserProfileModal } from '@components/common/UserProfileModal';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { getUser } from '@api/user.api';
import { User } from '../../types/user.types';
import { Ionicons } from '@expo/vector-icons';

interface MessageItemProps {
  message: Message;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: number) => void;
  onPin?: (messageId: number) => void;
  onForward?: (message: Message) => void;
  onReplyPress?: (messageId: number) => void;
  isHighlighted?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onForward,
  onReplyPress,
  isHighlighted = false,
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const { theme } = useTheme();
  const [sender, setSender] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const messageBubbleRef = useRef<View>(null);

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

  // Проверяем, является ли сообщение пересланным
  const isForwardedMessage = message.content.startsWith('📩 Переслано от ');

  const handleLongPress = () => {
    messageBubbleRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      const menuWidth = 250;
      const menuHeight = 450; // Примерная высота меню с превью сообщения

      // Позиционируем меню справа с отступом
      const left = screenWidth - menuWidth - 20; // 20px отступ справа

      // Рассчитываем позицию меню
      let top = y; // Начинаем от верхней границы сообщения

      // Если меню не помещается внизу, поднимаем выше
      if (top + menuHeight > screenHeight - 20) {
        top = Math.max(20, screenHeight - menuHeight - 20);
      }

      setMenuPosition({ top, left });
      setShowContextMenu(true);
    });
  };

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
            imageUrl={sender?.avatar_url}
            name={sender?.name || `User ${message.sender_id}`}
            size={32}
            style={styles.avatar}
          />
        </TouchableOpacity>
      )}
   <TouchableOpacity
  ref={messageBubbleRef}
  activeOpacity={0.9}
  onLongPress={handleLongPress}
  style={[
    styles.messageBubble,
    dynamicStyles.messageBubble,
    isOwnMessage && [styles.ownMessageBubble, dynamicStyles.ownMessageBubble],
    isHighlighted && [styles.highlightedBubble, { backgroundColor: theme.primary + '40' }],
    isForwardedMessage && [styles.forwardedBubble, { borderLeftColor: theme.primary }],
  ]}
>
  {!isOwnMessage && <View style={[styles.tail, { backgroundColor: theme.messageOther }]} />}
  {isOwnMessage && <View style={[styles.tailOwn, { backgroundColor: theme.messageOwn }]} />}

  {/* Цитируемое сообщение (если это ответ) */}
  {message.reply_to && (
    <TouchableOpacity
      style={[styles.replyContainer, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)', borderLeftColor: theme.primary }]}
      onPress={() => onReplyPress?.(message.reply_to_id!)}
      activeOpacity={0.7}
    >
      <Text style={[styles.replySender, { color: theme.primary }]} numberOfLines={1}>
        {message.reply_to.sender?.name || `User ${message.reply_to.sender_id}`}
      </Text>
      <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={2}>
        {message.reply_to.content}
      </Text>
    </TouchableOpacity>
  )}

  {/* Контент сообщения */}
  <View style={styles.messageContentRow}>
    <Text
      style={[
        styles.messageText,
        dynamicStyles.messageText,
        isOwnMessage && dynamicStyles.ownMessageText,
      ]}
    >
      {message.content}
    </Text>

    <View style={styles.messageFooter}>
      <Text
        style={[
          styles.time,
          dynamicStyles.time,
          isOwnMessage && dynamicStyles.ownTime,
        ]}
      >
        {formatTime(message.created_at)}
      </Text>
      {message.is_edited && (
        <Text
          style={[
            styles.edited,
            dynamicStyles.edited,
            isOwnMessage && dynamicStyles.ownEdited,
          ]}
        >
          изменено
        </Text>
      )}
    </View>
  </View>
</TouchableOpacity>




      {/* Контекстное меню */}
      <Modal
        visible={showContextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <BlurView intensity={80} style={styles.blurOverlay} tint="dark">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowContextMenu(false)}
          >
            <View style={[
              styles.contextMenu,
              { backgroundColor: theme.backgroundSecondary, top: menuPosition.top, left: menuPosition.left }
            ]}>
            {/* Превью выбранного сообщения */}
            <View style={[styles.messagePreview, { backgroundColor: theme.background }]}>
              <Text style={[styles.previewText, { color: theme.text }]} numberOfLines={3}>
                {message.content}
              </Text>
              <Text style={[styles.previewTime, { color: theme.textSecondary }]}>
                {formatTime(message.created_at)}
              </Text>
            </View>

            {/* Разделитель */}
            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            {/* Ответить */}
            {onReply && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowContextMenu(false);
                  onReply(message);
                }}
              >
                <Ionicons name="arrow-undo-outline" size={20} color={theme.text} />
                <Text style={[styles.menuText, { color: theme.text }]}>Ответить</Text>
              </TouchableOpacity>
            )}

            {/* Скопировать */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowContextMenu(false);
                // TODO: Implement copy to clipboard
                console.log('Copy:', message.content);
              }}
            >
              <Ionicons name="copy-outline" size={20} color={theme.text} />
              <Text style={[styles.menuText, { color: theme.text }]}>Скопировать</Text>
            </TouchableOpacity>

            {/* Изменить (только свои сообщения и не пересланные) */}
            {isOwnMessage && onEdit && !isForwardedMessage && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowContextMenu(false);
                  onEdit(message);
                }}
              >
                <Ionicons name="create-outline" size={20} color={theme.text} />
                <Text style={[styles.menuText, { color: theme.text }]}>Изменить</Text>
              </TouchableOpacity>
            )}

            {/* Закрепить */}
            {onPin && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowContextMenu(false);
                  onPin(message.id);
                }}
              >
                <Ionicons name="pin-outline" size={20} color={theme.text} />
                <Text style={[styles.menuText, { color: theme.text }]}>Закрепить</Text>
              </TouchableOpacity>
            )}

            {/* Переслать */}
            {onForward && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowContextMenu(false);
                  onForward(message);
                }}
              >
                <Ionicons name="arrow-redo-outline" size={20} color={theme.text} />
                <Text style={[styles.menuText, { color: theme.text }]}>Переслать</Text>
              </TouchableOpacity>
            )}

            {/* Удалить (только свои сообщения и не пересланные) */}
            {isOwnMessage && onDelete && !isForwardedMessage && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowContextMenu(false);
                  onDelete(message.id);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#E94444" />
                <Text style={[styles.menuText, { color: '#E94444' }]}>Удалить</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
        </BlurView>
      </Modal>

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
    marginLeft: 8,
    marginRight: 14,
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    minWidth: 100,
  },
  ownMessageBubble: {
    borderRadius: 16,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
 messageContentRow: {
  flexDirection: 'row',
  alignItems: 'flex-end', // выравнивание по нижнему краю
  justifyContent: 'space-between',
},

messageText: {
  fontSize: 15,
  lineHeight: 20,
  flexShrink: 1,
  color: '#fff',
},

messageFooter: {
  flexDirection: 'row',
  alignItems: 'flex-end',
  marginLeft: 6,
},

time: {
  fontSize: 11,
  color: '#ccc',
  transform: [{ translateY: 3 }], // 🔹 немного ниже базовой линии
},

edited: {
  fontSize: 11,
  marginLeft: 4,
  fontStyle: 'italic',
  color: '#aaa',
  transform: [{ translateY: 3 }], // 🔹 тоже чуть ниже
},

tail: {
  position: 'absolute',
  bottom: 0,
  left: -6, // немного вынос за пределы пузыря
  width: 12,
  height: 12,
  backgroundColor: '#fff', // заменяется динамически
  borderBottomRightRadius: 10,
  transform: [{ rotate: '45deg' }],
},

tailOwn: {
  position: 'absolute',
  bottom: 0,
  right: -6,
  width: 12,
  height: 12,
  backgroundColor: '#fff', // заменяется динамически
  borderBottomLeftRadius: 10,
  transform: [{ rotate: '-45deg' }],
},
replyContainer: {
  borderLeftWidth: 3,
  borderRadius: 8,
  paddingLeft: 8,
  paddingRight: 8,
  paddingVertical: 6,
  marginBottom: 8,
},
replySender: {
  fontSize: 13,
  fontWeight: '600',
  marginBottom: 2,
},
replyText: {
  fontSize: 13,
  lineHeight: 18,
},
highlightedBubble: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 6,
},
forwardedBubble: {
  borderLeftWidth: 4,
},

blurOverlay: {
  flex: 1,
},
modalOverlay: {
  flex: 1,
},
contextMenu: {
  position: 'absolute',
  minWidth: 250,
  maxWidth: Dimensions.get('window').width - 40,
  borderRadius: 12,
  padding: 0,
  overflow: 'hidden',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 5,
},
messagePreview: {
  padding: 12,
  paddingBottom: 8,
},
previewText: {
  fontSize: 15,
  lineHeight: 20,
  marginBottom: 4,
},
previewTime: {
  fontSize: 11,
  marginTop: 4,
},
separator: {
  height: 1,
  marginHorizontal: 8,
  marginVertical: 4,
},
menuItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
},
menuText: {
  fontSize: 16,
  marginLeft: 12,
  fontWeight: '500',
},

});

export default MessageItem;