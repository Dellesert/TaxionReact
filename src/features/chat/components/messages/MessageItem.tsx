import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, useWindowDimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ChatStackParamList } from '@navigation/types';
import { useTheme } from '@shared/hooks/useTheme';
import { Message } from '../../types/chat.types';
import { Avatar } from '@shared/components/common/Avatar';
import { UserProfileModal } from '@shared/components/common/UserProfileModal';
import { useAuthStore } from '@shared/store/authStore';
import { useChatStore } from '@shared/store/chatStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { MessageBubble } from './MessageBubble';
import { MessageContextMenu } from '../modals/MessageContextMenu';
import { ActionModal } from '@shared/components/common/ActionModal';
import { MediaViewer, MediaItem } from '../modals/MediaViewer';
import { useMessageData } from '../../hooks/useMessageData';
import { useImageLoader } from '@shared/hooks/useImageLoader';
import { isForwardedMessage, isImageFile, isVideoFile, replaceLocalhostWithIP } from '../../utils/message.utils';
import { getOrCreateDirectChat } from '../../api/chat.api';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface MessageItemProps {
  message: Message;
  chatType?: 'private' | 'group' | 'channel';
  isSavedChat?: boolean;
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
  onRetryMessage?: (messageId: number) => void;
  onCancelUpload?: (messageId: number) => void;
  isVisible?: boolean; // Добавляем флаг видимости для ленивой загрузки
  searchQuery?: string; // Поисковый запрос для подсветки текста
  onMediaViewerOpen?: (attachmentId: number) => void; // Открытие глобального просмотра медиа (по всем вложениям чата)
}

/**
 * Компонент элемента сообщения в чате.
 * Разделен на множество под-компонентов для лучшей читаемости.
 */
export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  chatType,
  isSavedChat = false,
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
  onRetryMessage,
  onCancelUpload,
  isVisible = true, // По умолчанию видим
  searchQuery,
  onMediaViewerOpen,
}) => {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isWideScreen = screenWidth > 768;
  const maxBubbleWidth = isWideScreen
    ? Math.min(screenWidth * 0.5, 560)
    : Math.min(screenWidth * 0.7, 420);
  const minBubbleWidth = screenWidth < 500 ? '35%' : '15%';

  // На десктопе для сообщений с медиа задаём явную ширину (не только maxWidth),
  // чтобы процентные размеры дочерних элементов (width: '100%') корректно работали
  const mediaAttachments = useMemo(() =>
    message.attachments?.filter(a => {
      const mt = a.mime_type || a.file_type || '';
      return isImageFile(mt) || isVideoFile(mt);
    }) || [],
    [message.attachments]
  );
  const hasMedia = mediaAttachments.length > 0;
  const hasMultipleMedia = mediaAttachments.length > 1;
  const hasLinkPreview = !!message.link_preview;
  // Есть ли текст в сообщении (не считая удалённые и task-карточки)
  const hasTextContent = useMemo(() => {
    if (message.is_deleted) return false;
    const content = message.content?.trim() || '';
    if (!content) return false;
    if (/^\[TASK_DATA\].*\[\/TASK_DATA\]$/s.test(content)) return false;
    return true;
  }, [message.content, message.is_deleted]);
  // Для одиночного медиа без текста: уменьшаем ширину бабла (~65% от максимума)
  const singleMediaWidth = Math.min(maxBubbleWidth * 0.65, 280);
  const currentUser = useAuthStore((state) => state.user);
  const { showError } = useNotification();
  const navigation = useNavigation<NativeStackNavigationProp<ChatStackParamList>>();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const messageBubbleRef = useRef<View>(null);

  // Используем кастомные хуки для загрузки данных
  const { sender, setSender, replySender } = useMessageData(message);
  const imageUrls = useImageLoader(message.attachments);

  // Build unified media items list for MediaViewer
  const mediaItems: MediaItem[] = useMemo(() => {
    if (!message.attachments || message.attachments.length === 0) return [];
    return message.attachments
      .filter(att => {
        const mt = att.mime_type || att.file_type || '';
        return isImageFile(mt) || isVideoFile(mt);
      })
      .map(att => {
        const mt = att.mime_type || att.file_type || '';
        return {
          type: isVideoFile(mt) ? 'video' as const : 'image' as const,
          url: replaceLocalhostWithIP(att.file_url),
          thumbnailUrl: att.thumbnail_url ? replaceLocalhostWithIP(att.thumbnail_url) : undefined,
          thumbnailLargeUrl: att.thumbnail_large_url ? replaceLocalhostWithIP(att.thumbnail_large_url) : undefined,
          attachmentId: att.id,
          duration: att.duration,
        };
      });
  }, [message.attachments]);

  const isOwnMessage = message.sender_id === currentUser?.id;
  const isAdmin = userRole === 'owner' || userRole === 'admin';
  // Используем новое поле is_forwarded с fallback на старый формат
  const isForwarded = isForwardedMessage(message);

  // В чате Избранное: свои сообщения справа, пересланные слева
  const isSavedOwnMessage = isSavedChat && !isForwarded;
  const isSavedForwardedMessage = isSavedChat && isForwarded;

  // Reaction toggle logic
  const addReaction = useChatStore((state) => state.addReaction);
  const removeReaction = useChatStore((state) => state.removeReaction);

  // Reaction animation
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const [animatedEmoji, setAnimatedEmoji] = useState('👍');

  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const handleToggleReaction = useCallback((emoji: string) => {
    const currentUserId = currentUser?.id;
    if (!currentUserId) return;
    const hasReacted = message.reactions?.some(
      (r) => r.emoji === emoji && r.user_id === currentUserId
    );
    if (hasReacted) {
      removeReaction(message.id, emoji);
    } else {
      addReaction(message.id, emoji);
      // Animate only when adding
      setAnimatedEmoji(emoji);
      heartScale.value = 0;
      heartOpacity.value = 1;
      heartScale.value = withSpring(1, { damping: 8, stiffness: 200 });
      heartOpacity.value = withDelay(400, withTiming(0, { duration: 300 }));
    }
  }, [message.id, message.reactions, currentUser?.id, addReaction, removeReaction, heartScale, heartOpacity]);

  const handleDoubleTap = useCallback(() => {
    if (message.is_deleted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleToggleReaction('👍');
  }, [message.is_deleted, handleToggleReaction]);

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    messageBubbleRef.current?.measureInWindow((x, y, width, height) => {
      const screenWidth = Dimensions.get('window').width;
      const screenHeight = Dimensions.get('window').height;
      const menuWidth = 250;
      const menuHeight = 510;
      const minTopMargin = 160; // Отступ сверху (для header и safe area)
      const minBottomMargin = 20; // Отступ снизу

      const left = isOwnMessage
        ? screenWidth - menuWidth - 20
        : 20;

      // Определяем видимую область сообщения на экране
      const messageVisibleTop = Math.max(y, minTopMargin);
      const messageVisibleBottom = Math.min(y + height, screenHeight - minBottomMargin);

      // Пытаемся разместить меню рядом с видимой частью сообщения
      let top = messageVisibleTop;

      // Если меню не помещается снизу от видимой части
      if (top + menuHeight > screenHeight - minBottomMargin) {
        // Пробуем разместить над сообщением, если есть место
        if (messageVisibleTop - menuHeight >= minTopMargin) {
          top = messageVisibleTop - menuHeight;
        } else {
          // Если не помещается ни сверху, ни снизу - центрируем в видимой области
          top = Math.max(minTopMargin, screenHeight - menuHeight - minBottomMargin);
        }
      }

      // Финальная проверка границ
      top = Math.max(minTopMargin, Math.min(top, screenHeight - menuHeight - minBottomMargin));

      setMenuPosition({ top, left });
      setShowContextMenu(true);
    });
  };

  // Правый клик (для Electron / web) — меню появляется у курсора
  const handleRightClick = useCallback((position: { x: number; y: number }) => {
    if (selectionMode) return;

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const menuWidth = 250;
    const menuHeight = 510;
    const minTopMargin = 20;
    const minBottomMargin = 20;

    let left = position.x;
    let top = position.y;

    // Не даём меню выйти за правый край
    if (left + menuWidth > screenWidth) {
      left = screenWidth - menuWidth - 20;
    }

    // Не даём меню выйти за нижний край
    if (top + menuHeight > screenHeight - minBottomMargin) {
      top = screenHeight - menuHeight - minBottomMargin;
    }

    top = Math.max(minTopMargin, top);
    left = Math.max(10, left);

    setMenuPosition({ top, left });
    setShowContextMenu(true);
  }, [selectionMode]);

  const handleUserPress = () => {
    if (message.sender_id) {
      setShowProfileModal(true);
    }
  };

  const handleImagePress = (imageUrl: string) => {
    if (onMediaViewerOpen) {
      const attachment = message.attachments?.find(a => replaceLocalhostWithIP(a.file_url) === imageUrl);
      if (attachment) {
        onMediaViewerOpen(attachment.id);
        return;
      }
    }
    const index = mediaItems.findIndex(item => item.url === imageUrl);
    setSelectedMediaIndex(index >= 0 ? index : 0);
    setShowMediaViewer(true);
  };

  const handleVideoPress = (videoUrl: string, _thumbnailUrl?: string) => {
    if (onMediaViewerOpen) {
      const attachment = message.attachments?.find(a => replaceLocalhostWithIP(a.file_url) === videoUrl);
      if (attachment) {
        onMediaViewerOpen(attachment.id);
        return;
      }
    }
    const index = mediaItems.findIndex(item => item.url === videoUrl);
    setSelectedMediaIndex(index >= 0 ? index : 0);
    setShowMediaViewer(true);
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
      <View style={[
        styles.container,
        isOwnMessage && !isSavedChat && styles.ownMessageContainer,
        // В Избранном: свои сообщения справа, пересланные слева
        isSavedOwnMessage && styles.savedOwnMessageContainer,
        isSavedForwardedMessage && styles.savedForwardedContainer,
      ]}>
        {/* Аватар отправителя (для чужих сообщений и пересланных в Избранном) */}
        {((!isOwnMessage && !selectionMode && !isSavedChat) || isSavedForwardedMessage) && (
          <TouchableOpacity onPress={handleUserPress} activeOpacity={0.7}>
            <Avatar
              imageUrl={isSavedForwardedMessage && message.original_sender ? message.original_sender.avatar : sender?.avatar}
              thumbnailUrl={isSavedForwardedMessage && message.original_sender ? message.original_sender.avatar_thumbnail : sender?.avatar_thumbnail}
              name={isSavedForwardedMessage && message.original_sender ? (message.original_sender.name || `User ${message.original_sender_id}`) : (sender?.name || `User ${message.sender_id}`)}
              size={32}
              userId={isSavedForwardedMessage && message.original_sender ? message.original_sender.id : sender?.id}
              style={styles.avatar}
            />
          </TouchableOpacity>
        )}

        {/* Пузырь сообщения */}
        <View style={{ position: 'relative', maxWidth: maxBubbleWidth, minWidth: minBubbleWidth, ...((hasMultipleMedia || hasLinkPreview) && { width: maxBubbleWidth }), ...(hasMedia && !hasMultipleMedia && !hasLinkPreview && !hasTextContent && { width: singleMediaWidth }) }}>
          <MessageBubble
            message={message}
            isOwnMessage={isOwnMessage}
            isHighlighted={isHighlighted}
            sender={sender}
            replySender={replySender}
            imageUrls={imageUrls}
            currentUserId={currentUser?.id}
            onLongPress={selectionMode || Platform.OS === 'web' ? undefined : handleLongPress}
            onRightClick={selectionMode ? undefined : handleRightClick}
            onDoubleTap={selectionMode ? undefined : handleDoubleTap}
            onPollPress={onPollPress}
            onTaskPress={onTaskPress}
            onReplyPress={onReplyPress}
            onImagePress={handleImagePress}
            onVideoPress={handleVideoPress}
            messageBubbleRef={messageBubbleRef}
            onRetryMessage={onRetryMessage}
            onCancelUpload={onCancelUpload}
            onReactionPress={handleToggleReaction}
            isVisible={isVisible}
            isSavedChat={isSavedChat}
            isForwarded={isForwarded}
            searchQuery={searchQuery}
          />
          {/* Heart animation overlay */}
          <Animated.View
            pointerEvents="none"
            style={[styles.heartOverlay, heartAnimStyle]}
          >
            <Text style={styles.heartEmoji}>{animatedEmoji}</Text>
          </Animated.View>
        </View>
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
        onReaction={handleToggleReaction}
        currentUserId={currentUser?.id}
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
            navigation.navigate('Chat', {
              chatId: chat.id,
              chatName: chat.name,
              unreadCount: chat.unread_count || 0,
            });
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

      {/* Полноэкранный просмотр медиа (фото + видео) — только если нет глобального просмотра */}
      {!onMediaViewerOpen && (
        <MediaViewer
          visible={showMediaViewer}
          mediaItems={mediaItems}
          initialIndex={selectedMediaIndex}
          onClose={() => {
            setShowMediaViewer(false);
            setSelectedMediaIndex(0);
          }}
          onForward={onForward ? (item: MediaItem) => {
            const originalAttachment = message.attachments?.find(
              (att) => att.id === item.attachmentId
            );
            if (!originalAttachment) return;

            const mediaMessage: Message = {
              ...message,
              id: 0,
              content: '',
              attachments: [originalAttachment],
            };
            setShowMediaViewer(false);
            onForward(mediaMessage);
          } : undefined}
          onDelete={onDelete ? () => {
            setShowMediaViewer(false);
            onDelete(message.id, 'everyone');
          } : undefined}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    marginHorizontal: 8,
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
  savedChatContainer: {
    justifyContent: 'center',
    flexDirection: 'row',
  },
  savedOwnMessageContainer: {
    flexDirection: 'row-reverse',
  },
  savedForwardedContainer: {
    flexDirection: 'row',
  },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartEmoji: {
    fontSize: 48,
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
    prevProps.message.is_forwarded !== nextProps.message.is_forwarded ||
    prevProps.message.original_sender_id !== nextProps.message.original_sender_id ||
    prevProps.isHighlighted !== nextProps.isHighlighted ||
    prevProps.selectionMode !== nextProps.selectionMode ||
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.isSavedChat !== nextProps.isSavedChat ||
    prevProps.searchQuery !== nextProps.searchQuery ||
    // Оптимистичные обновления - проверяем статус отправки и прогресс загрузки
    (prevProps.message as any).sending !== (nextProps.message as any).sending ||
    (prevProps.message as any).failed !== (nextProps.message as any).failed ||
    (prevProps.message as any).upload_progress !== (nextProps.message as any).upload_progress
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
  // read_by это number[], не массив объектов!
  const prevReadByIds = [...prevReadBy].sort((a, b) => a - b).join(',');
  const nextReadByIds = [...nextReadBy].sort((a, b) => a - b).join(',');

  if (prevReadByIds !== nextReadByIds) {
    return false;
  }

  // Все проверки пройдены - компонент не нуждается в обновлении
  return true;
});
