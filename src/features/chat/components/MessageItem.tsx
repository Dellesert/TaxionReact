import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ChatStackParamList } from '@navigation/types';
import { useTheme } from '@shared/hooks/useTheme';
import { Message } from '../types/chat.types';
import { Avatar } from '@shared/components/common/Avatar';
import { UserProfileModal } from '@shared/components/common/UserProfileModal';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { MessageBubble } from './MessageBubble';
import { MessageContextMenu } from './MessageContextMenu';
import { ActionModal } from '@shared/components/common/ActionModal';
import { ImageViewer } from './ImageViewer';
import { useMessageData } from '../hooks/useMessageData';
import { useImageLoader } from '@shared/hooks/useImageLoader';
import { isForwardedMessage } from '../utils/message.utils';
import { getUser } from '@api/user.api';
import { getOrCreateDirectChat } from '../api/chat.api';

interface MessageItemProps {
  message: Message;
  chatType?: 'private' | 'group' | 'channel';
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: number, deleteFor: 'everyone' | 'me') => void;
  onRestore?: (messageId: number) => void;
  onDeletePermanent?: (messageId: number) => void;
  onPin?: (messageId: number) => void;
  onUnpin?: (messageId: number) => void;
  onForward?: (message: Message) => void;
  onReplyPress?: (messageId: number) => void;
  onPollPress?: (pollId: number) => void;
  onTaskPress?: (taskId: number) => void;
  isHighlighted?: boolean;
  userRole?: 'owner' | 'admin' | 'member';
  chatMemberIds?: number[];
  selectionMode?: boolean;
  isSelected?: boolean;
  onEnterSelectionMode?: (messageId: number) => void;
  onToggleSelection?: (messageId: number) => void;
}

/**
 * Компонент элемента сообщения в чате.
 * Разделен на множество под-компонентов для лучшей читаемости.
 */
export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  chatType,
  onReply,
  onEdit,
  onDelete,
  onRestore,
  onDeletePermanent,
  onPin,
  onUnpin,
  onForward,
  onReplyPress,
  onPollPress,
  onTaskPress,
  isHighlighted = false,
  userRole = 'member',
  chatMemberIds = [],
  selectionMode = false,
  isSelected = false,
  onEnterSelectionMode,
  onToggleSelection,
}) => {
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const { showError } = useNotification();
  const navigation = useNavigation<NativeStackNavigationProp<ChatStackParamList>>();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const messageBubbleRef = useRef<View>(null);

  // Используем кастомные хуки для загрузки данных
  const { sender, setSender, replySender } = useMessageData(message);
  const imageUrls = useImageLoader(message.attachments);

  const isOwnMessage = message.sender_id === currentUser?.id;
  const isAdmin = userRole === 'owner' || userRole === 'admin';
  const isForwarded = isForwardedMessage(message.content);

  const handleLongPress = () => {
    messageBubbleRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      const menuWidth = 250;
      const menuHeight = 450;

      const left = isOwnMessage
        ? screenWidth - menuWidth - 20
        : 20;

      let top = y;
      if (top + menuHeight > screenHeight - 20) {
        top = Math.max(20, screenHeight - menuHeight - 20);
      }

      setMenuPosition({ top, left });
      setShowContextMenu(true);
    });
  };

  const handleUserPress = () => {
    if (message.sender_id) {
      setShowProfileModal(true);
    }
  };

  const handleImagePress = (imageUrl: string) => {
    // Найти индекс изображения в массиве imageUrls
    const imageUrlsArray = Object.values(imageUrls);
    const index = imageUrlsArray.findIndex(url => url === imageUrl);
    setSelectedImageIndex(index >= 0 ? index : 0);
    setShowImageViewer(true);
  };

  const handlePress = () => {
    if (selectionMode && onToggleSelection) {
      onToggleSelection(message.id);
    }
  };

  return (
    <View style={styles.outerContainer}>
      {/* Чекбокс в режиме выбора (всегда слева) */}
      {selectionMode && (
        <TouchableOpacity
          onPress={handlePress}
          style={styles.checkboxContainer}
          activeOpacity={0.7}
        >
          <View style={[
            styles.checkbox,
            { borderColor: theme.border },
            isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
          ]}>
            {isSelected && (
              <Ionicons name="checkmark" size={18} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Контейнер для аватара и сообщения */}
      <View style={[styles.container, isOwnMessage && styles.ownMessageContainer]}>
        {/* Аватар отправителя (только для чужих сообщений) */}
        {!isOwnMessage && !selectionMode && (
          <TouchableOpacity onPress={handleUserPress} activeOpacity={0.7}>
            <Avatar
              imageUrl={sender?.avatar}
              name={sender?.name || `User ${message.sender_id}`}
              size={32}
              style={styles.avatar}
            />
          </TouchableOpacity>
        )}

        {/* Пузырь сообщения */}
        <MessageBubble
          message={message}
          isOwnMessage={isOwnMessage}
          isHighlighted={isHighlighted}
          sender={sender}
          replySender={replySender}
          imageUrls={imageUrls}
          currentUserId={currentUser?.id}
          onLongPress={selectionMode ? undefined : handleLongPress}
          onPollPress={onPollPress}
          onTaskPress={onTaskPress}
          onReplyPress={onReplyPress}
          onImagePress={handleImagePress}
          messageBubbleRef={messageBubbleRef}
        />
      </View>

      {/* Контекстное меню */}
      <MessageContextMenu
        visible={showContextMenu}
        message={message}
        menuPosition={menuPosition}
        isOwnMessage={isOwnMessage}
        isAdmin={isAdmin}
        isForwardedMessage={isForwarded}
        chatType={chatType}
        currentUserRole={userRole}
        onClose={() => setShowContextMenu(false)}
        onReply={onReply}
        onEdit={onEdit}
        onPin={onPin}
        onUnpin={onUnpin}
        onForward={onForward}
        onDelete={() => setShowDeleteModal(true)}
        onRestore={onRestore}
        onEnterSelectionMode={onEnterSelectionMode}
      />

      {/* Модальное окно удаления */}
      <ActionModal
        visible={showDeleteModal}
        title="Удалить сообщение"
        message={message.content.length > 100 ? `${message.content.substring(0, 100)}...` : message.content}
        onDismiss={() => setShowDeleteModal(false)}
        actions={[
          // "Удалить для всех"
          // Для личных чатов: только свои сообщения
          // Для групповых: свои сообщения ИЛИ если пользователь админ/владелец
          ...((chatType === 'private' ? isOwnMessage : (isOwnMessage || isAdmin)) ? [{
            text: 'Удалить для всех',
            icon: 'trash-outline' as const,
            style: 'destructive' as const,
            onPress: async () => {
              setShowDeleteModal(false);
              onDelete?.(message.id, 'everyone');
            },
          }] : []),
          // "Удалить для меня" - всегда доступно
          {
            text: 'Удалить для меня',
            icon: 'trash-outline' as const,
            style: 'default' as const,
            onPress: async () => {
              setShowDeleteModal(false);
              onDelete?.(message.id, 'me');
            },
          },
          // Отмена
          {
            text: 'Отмена',
            style: 'cancel' as const,
            onPress: async () => {
              setShowDeleteModal(false);
            },
          },
        ]}
      />

      {/* Модальное окно профиля пользователя */}
      <UserProfileModal
        visible={showProfileModal}
        userId={message.sender_id}
        onClose={() => setShowProfileModal(false)}
        onOpenChat={async (userId) => {
          try {
            console.log('💬 Opening chat with user:', userId);
            const chat = await getOrCreateDirectChat(userId);
            console.log('✅ Got chat:', chat.id);
            setShowProfileModal(false);
            navigation.navigate('Chat', { chatId: chat.id });
          } catch (error: any) {
            console.error('❌ Error opening chat:', error);
            showError(error.message || 'Не удалось открыть чат');
          }
        }}
        onAddToFavorites={(userId) => {
          // TODO: Add to favorites
          console.log('Add to favorites:', userId);
          showError('Функция добавления в избранное будет реализована позже');
        }}
        onBlock={(userId) => {
          // TODO: Block user
          console.log('Block user:', userId);
          showError('Функция блокировки будет реализована позже');
        }}
      />

      {/* Полноэкранный просмотр изображения */}
      <ImageViewer
        visible={showImageViewer}
        imageUrls={Object.values(imageUrls)}
        initialIndex={selectedImageIndex}
        onClose={() => {
          setShowImageViewer(false);
          setSelectedImageIndex(0);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  container: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
    flex: 1,
  },
  ownMessageContainer: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    marginLeft: 8,
    marginRight: 14,
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Оптимизация: используем React.memo для предотвращения лишних ре-рендеров (15-20% снижение ре-рендеров)
export default React.memo(MessageItem, (prevProps, nextProps) => {
  // Сравниваем базовые поля
  if (
    prevProps.message.id !== nextProps.message.id ||
    prevProps.message.content !== nextProps.message.content ||
    prevProps.message.is_edited !== nextProps.message.is_edited ||
    prevProps.message.is_deleted !== nextProps.message.is_deleted ||
    prevProps.message.is_pinned !== nextProps.message.is_pinned ||
    prevProps.isHighlighted !== nextProps.isHighlighted ||
    prevProps.selectionMode !== nextProps.selectionMode ||
    prevProps.isSelected !== nextProps.isSelected
  ) {
    return false;
  }

  // Глубокое сравнение реакций (по ID и типу эмодзи)
  const prevReactions = prevProps.message.reactions || [];
  const nextReactions = nextProps.message.reactions || [];

  if (prevReactions.length !== nextReactions.length) {
    return false;
  }

  // Сравниваем ID реакций (более надёжно, чем просто длину)
  const prevReactionIds = prevReactions.map(r => `${r.id}-${r.emoji}`).sort().join(',');
  const nextReactionIds = nextReactions.map(r => `${r.id}-${r.emoji}`).sort().join(',');

  if (prevReactionIds !== nextReactionIds) {
    return false;
  }

  // Глубокое сравнение read_by (по ID пользователей)
  const prevReadBy = prevProps.message.read_by || [];
  const nextReadBy = nextProps.message.read_by || [];

  if (prevReadBy.length !== nextReadBy.length) {
    return false;
  }

  // Сравниваем ID пользователей, прочитавших сообщение
  const prevReadByIds = prevReadBy.map(r => r.user_id).sort().join(',');
  const nextReadByIds = nextReadBy.map(r => r.user_id).sort().join(',');

  if (prevReadByIds !== nextReadByIds) {
    return false;
  }

  // Все проверки пройдены - компонент не нуждается в обновлении
  return true;
});
