import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatStackParamList } from '@navigation/types';
import { Message } from '../../types/chat.types';
import { Avatar } from '@components/common/Avatar';
import { UserProfileModal } from '@components/common/UserProfileModal';
import { useAuthStore } from '@store/authStore';
import { MessageBubble } from './MessageBubble';
import { MessageContextMenu } from './MessageContextMenu';
import { DeleteMessageModal } from './DeleteMessageModal';
import { ImageViewer } from './ImageViewer';
import { useMessageData } from '@hooks/useMessageData';
import { useImageLoader } from '@hooks/useImageLoader';
import { isForwardedMessage } from '@utils/message.utils';
import { getUser } from '@api/user.api';
import { getOrCreateDirectChat } from '@api/chat.api';

interface MessageItemProps {
  message: Message;
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
}

/**
 * Компонент элемента сообщения в чате.
 * Разделен на множество под-компонентов для лучшей читаемости.
 */
export const MessageItem: React.FC<MessageItemProps> = ({
  message,
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
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const navigation = useNavigation<NativeStackNavigationProp<ChatStackParamList>>();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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

  const handleUserPress = async () => {
    let senderData = sender || message.sender;

    if (!senderData && message.sender_id) {
      try {
        senderData = await getUser(message.sender_id);
        setSender(senderData);
      } catch (error) {
        // Silent error handling
      }
    }

    if (senderData) {
      setShowProfileModal(true);
    }
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageViewer(true);
  };

  return (
    <View style={[styles.container, isOwnMessage && styles.ownMessageContainer]}>
      {/* Аватар отправителя (только для чужих сообщений) */}
      {!isOwnMessage && (
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
        onLongPress={handleLongPress}
        onPollPress={onPollPress}
        onTaskPress={onTaskPress}
        onReplyPress={onReplyPress}
        onImagePress={handleImagePress}
        messageBubbleRef={messageBubbleRef}
      />

      {/* Контекстное меню */}
      <MessageContextMenu
        visible={showContextMenu}
        message={message}
        menuPosition={menuPosition}
        isOwnMessage={isOwnMessage}
        isAdmin={isAdmin}
        isForwardedMessage={isForwarded}
        onClose={() => setShowContextMenu(false)}
        onReply={onReply}
        onEdit={onEdit}
        onPin={onPin}
        onUnpin={onUnpin}
        onForward={onForward}
        onDelete={() => setShowDeleteModal(true)}
        onRestore={onRestore}
      />

      {/* Модальное окно удаления */}
      <DeleteMessageModal
        visible={showDeleteModal}
        messageContent={message.content}
        isOwnMessage={isOwnMessage}
        isAdmin={isAdmin}
        onClose={() => setShowDeleteModal(false)}
        onDeleteForEveryone={() => {
          setShowDeleteModal(false);
          onDelete?.(message.id, 'everyone');
        }}
        onDeleteForMe={() => {
          setShowDeleteModal(false);
          onDelete?.(message.id, 'me');
        }}
      />

      {/* Модальное окно профиля пользователя */}
      <UserProfileModal
        visible={showProfileModal}
        user={sender}
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
            Alert.alert('Ошибка', error.message || 'Не удалось открыть чат');
          }
        }}
        onAddToFavorites={(userId) => {
          // TODO: Add to favorites
          console.log('Add to favorites:', userId);
          Alert.alert('В разработке', 'Функция добавления в избранное будет реализована позже');
        }}
        onBlock={(userId) => {
          // TODO: Block user
          console.log('Block user:', userId);
          Alert.alert('В разработке', 'Функция блокировки будет реализована позже');
        }}
      />

      {/* Полноэкранный просмотр изображения */}
      <ImageViewer
        visible={showImageViewer}
        imageUrl={selectedImage}
        onClose={() => {
          setShowImageViewer(false);
          setSelectedImage(null);
        }}
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
});

export default MessageItem;
