import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Animated, Platform } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Chat, TypingIndicator } from '../../types/chat.types';
import { Avatar } from '@shared/components/common/Avatar';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { getChatDisplayName, getChatDisplayAvatar, getChatDisplayAvatarThumbnail, getPersonalChatCompanion } from '../../utils/chatUtils';
import { ActionModal } from '@shared/components/common/ActionModal';
import { useChatPrefetch } from '@shared/hooks/usePrefetch';
import { getTypingUserNames, formatTypingText } from '../../utils/chatScreenHelpers';
import { stripFormatting } from '../../utils/formatting';
import { getSystemMessagePreview } from '../messages/SystemMessageBanner';
import { getThumbnailUrl } from '../../utils/thumbnail.utils';
import { useAnimationStore } from '@shared/store/animationStore';
import * as Haptics from 'expo-haptics';

interface ChatItemProps {
  chat: Chat;
  onPress: (chat: Chat) => void;
  onLongPress?: (chat: Chat) => void;
  onMarkAsRead?: (chatId: number) => void;
  onDelete?: (chatId: number, clearHistory?: boolean) => void;
  onClearHistory?: (chatId: number) => void;
  onToggleFavorite?: (chatId: number) => void;
  onTogglePinned?: (chatId: number) => void;
  onMute?: (chatId: number, duration: '1h' | '12h' | 'forever') => void;
  onUnmute?: (chatId: number) => void;
  isEditMode?: boolean;
  isSelected?: boolean;
  itemIndex?: number;
  typingUsers?: TypingIndicator[];
}

const ChatItemComponent: React.FC<ChatItemProps> = ({ chat, onPress, onMarkAsRead, onDelete, onClearHistory, onToggleFavorite, onTogglePinned, onMute, onUnmute, isEditMode, isSelected, itemIndex = 0, typingUsers = [] }) => {
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearSavedModal, setShowClearSavedModal] = useState(false);
  const [clearHistory, setClearHistory] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);

  // Prefetch hook for preloading chat messages
  const { prefetchChatDelayed, cancelPrefetch } = useChatPrefetch();

  const reduceAnimations = useAnimationStore((s) => s.reduceAnimations);

  // Простая плавная анимация без bounce эффекта
  const checkboxAnimation = useRef(new Animated.Value(isEditMode ? 1 : 0)).current;

  const checkboxTranslateX = checkboxAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-32, 0], // Выезжает слева
  });

  const checkboxOpacity = checkboxAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Анимация сдвига контента чата для освобождения места под чекбокс
  const contentTranslateX = checkboxAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8], // 24px чекбокс + 8px margin
  });

  // Запускаем плавную анимацию при изменении isEditMode
  useEffect(() => {
    if (reduceAnimations) {
      checkboxAnimation.setValue(isEditMode ? 1 : 0);
    } else {
      Animated.timing(checkboxAnimation, {
        toValue: isEditMode ? 1 : 0,
        duration: 250, // Плавная анимация 250ms
        useNativeDriver: true,
      }).start();
    }
  }, [isEditMode, checkboxAnimation]);

  const getChatName = () => {
    return getChatDisplayName(chat, currentUser?.id);
  };

  const getChatAvatar = () => {
    return getChatDisplayAvatar(chat, currentUser?.id);
  };

  const getChatAvatarThumbnail = () => {
    return getChatDisplayAvatarThumbnail(chat, currentUser?.id);
  };

  const getCompanionOnlineStatus = () => {
    if (chat.type !== 'private') return false;
    const companion = getPersonalChatCompanion(chat, currentUser?.id);
    return companion?.status === 'online';
  };

  // Получаем статус последнего сообщения (только для сообщений текущего пользователя)
  const getMessageStatus = () => {
    if (!chat.last_message || chat.last_message.sender_id !== currentUser?.id) {
      return null; // Не показываем статус для чужих сообщений
    }

    const message = chat.last_message;

    // Если сообщение в процессе отправки
    if (message.sending) {
      return 'sending';
    }

    // Подсчитываем количество участников (кроме отправителя)
    const otherMembersCount = (chat.members?.length || 1) - 1;

    // Фильтруем read_by, исключая отправителя (на случай если сервер включает его)
    const readByOthers = (message.read_by || []).filter(userId => userId !== message.sender_id);

    // Если все прочитали (кроме отправителя)
    if (readByOthers.length >= otherMembersCount && otherMembersCount > 0) {
      return 'read';
    }

    // Если доставлено хотя бы кому-то
    if (message.delivered_to && message.delivered_to.length > 0) {
      return 'delivered';
    }

    // Отправлено (но еще не доставлено)
    return 'sent';
  };

  const getLastMessagePreview = () => {
    // Check if someone is typing (takes priority over last message)
    if (typingUsers.length > 0) {
      const typingNames = getTypingUserNames(typingUsers, currentUser?.id);
      if (typingNames.length > 0) {
        return formatTypingText(typingNames, chat.type === 'private');
      }
    }

    if (!chat.last_message) return 'Нет сообщений';

    const message = chat.last_message;

    // Системное сообщение — показываем текст события без префикса отправителя
    if (message.message_type === 'system') {
      return getSystemMessagePreview(message);
    }

    const isCurrentUser = message.sender_id === currentUser?.id;

    // Определяем префикс отправителя
    let senderPrefix = '';
    if (chat.type === 'saved') {
      // В избранном не показываем префикс отправителя
      senderPrefix = '';
    } else if (chat.type === 'private') {
      // В личных чатах показываем только "Вы:" для своих сообщений
      senderPrefix = isCurrentUser ? 'Вы: ' : '';
    } else {
      // В групповых чатах показываем "Вы:" или "Имя:"
      if (isCurrentUser) {
        senderPrefix = 'Вы: ';
      } else {
        // Пытаемся получить имя отправителя из разных источников
        let senderName = '';

        // 1. Из объекта sender сообщения
        if (message.sender?.name) {
          senderName = message.sender.name;
        }
        // 2. Из email отправителя
        else if (message.sender?.email) {
          senderName = message.sender.email.split('@')[0];
        }
        // 3. Из участников чата
        else if (chat.members && chat.members.length > 0) {
          const member = chat.members.find(m => m.user_id === message.sender_id);
          if (member?.user) {
            senderName = member.user.name || member.user.email?.split('@')[0] || '';
          }
        }

        // Запасной вариант
        if (!senderName) {
          senderName = 'Пользователь';
        }

        senderPrefix = `${senderName}: `;
      }
    }

    // Формируем текст сообщения
    let messageText = stripFormatting(message.content || '');

    // Если сообщение пустое но есть вложения
    // Проверяем и attachments и любое поле которое может содержать файлы
    const attachments = message.attachments || (message as any).files || [];
    if (!messageText && attachments && Array.isArray(attachments) && attachments.length > 0) {
      const count = attachments.length;
      const firstAttachment = attachments[0];

      // Проверяем file_type или mime_type для определения типа
      const fileType = firstAttachment.file_type || firstAttachment.mime_type || '';

      if (fileType.includes('image') || fileType.startsWith('image')) {
        // Если одно фото - просто "Фото", если несколько - "3 фото"
        messageText = count === 1 ? 'Фото' : `${count} фото`;
      } else if (fileType.includes('video') || fileType.startsWith('video')) {
        messageText = count === 1 ? 'Видео' : `${count} видео`;
      } else {
        messageText = count === 1 ? 'Файл' : `${count} файла`;
      }
    }

    return senderPrefix + (messageText || 'Нет сообщений');
  };

  const getMediaPreview = (): { type: 'image' | 'video'; thumbUrl: string | null } | null => {
    if (!chat.last_message || typingUsers.length > 0) return null;
    const msg = chat.last_message;
    if (msg.message_type === 'system') return null;

    // Modern: check attachments array
    const attachments = msg.attachments || (msg as any).files || [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      const first = attachments[0];
      const fileType = first.file_type || first.mime_type || '';
      const isImage = fileType.includes('image');
      const isVideo = fileType.includes('video');
      if (isImage || isVideo) {
        const url = getThumbnailUrl(first, 'small');
        return { type: isVideo ? 'video' : 'image', thumbUrl: url ? replaceLocalhostWithIP(url) : null };
      }
    }

    // Legacy: check fields directly on the message
    const legacyMsg = msg as any;
    const legacyMime = legacyMsg.mime_type || '';
    const legacyType = msg.message_type;
    const isLegacyImage = legacyType === 'image' || legacyMime.includes('image');
    const isLegacyVideo = legacyType === 'video' || legacyMime.includes('video');
    if (isLegacyImage || isLegacyVideo) {
      const raw = legacyMsg.thumbnail_url || legacyMsg.file_url || null;
      return { type: isLegacyVideo ? 'video' : 'image', thumbUrl: raw ? replaceLocalhostWithIP(raw) : null };
    }

    return null;
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: chat.is_pinned
        ? theme.backgroundTertiary || theme.backgroundSecondary
        : theme.backgroundSecondary,
      borderBottomColor: theme.borderLight,
    },
    name: {
      color: theme.text,
    },
    time: {
      color: theme.textTertiary,
    },
    preview: {
      color: theme.textSecondary,
    },
  });

  const handleLongPress = () => {
    if (!isEditMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setMenuPosition(null);
      setShowContextMenu(true);
    }
  };

  // Правый клик для Electron / web
  const chatItemRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && chatItemRef.current) {
      const node = chatItemRef.current as unknown as HTMLElement;
      const handler = (e: MouseEvent) => {
        e.preventDefault();
        if (!isEditMode) {
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;
          const menuWidth = 300;
          const menuHeight = 280;

          let left = e.pageX;
          let top = e.pageY;

          if (left + menuWidth > screenWidth) {
            left = screenWidth - menuWidth - 10;
          }
          if (top + menuHeight > screenHeight) {
            top = screenHeight - menuHeight - 10;
          }
          left = Math.max(10, left);
          top = Math.max(10, top);

          setMenuPosition({ top, left });
          setShowContextMenu(true);
        }
      };
      node.addEventListener('contextmenu', handler);
      return () => node.removeEventListener('contextmenu', handler);
    }
    return undefined;
  }, [isEditMode]);

  const handleMarkAsRead = () => {
    setShowContextMenu(false);
    onMarkAsRead?.(chat.id);
  };

  const handleDelete = () => {
    setShowContextMenu(false);
    setClearHistory(false); // Сбрасываем чекбокс при открытии
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    onDelete?.(chat.id, clearHistory);
  };

  const handleClearSaved = () => {
    setShowContextMenu(false);
    setShowClearSavedModal(true);
  };

  const handleConfirmClearSaved = () => {
    setShowClearSavedModal(false);
    onClearHistory?.(chat.id);
  };

  const handleToggleFavorite = () => {
    setShowContextMenu(false);
    onToggleFavorite?.(chat.id);
  };

  const handleTogglePinned = () => {
    setShowContextMenu(false);
    onTogglePinned?.(chat.id);
  };

  const handleMutePress = () => {
    setShowContextMenu(false);
    if (chat.is_muted) {
      onUnmute?.(chat.id);
    } else {
      setShowMuteModal(true);
    }
  };

  const handleMuteAction = (duration: '1h' | '12h' | 'forever') => {
    setShowMuteModal(false);
    onMute?.(chat.id, duration);
  };

  // Handle press in - start prefetch
  const handlePressIn = useCallback(() => {
    if (!isEditMode) {
      prefetchChatDelayed(chat.id);
    }
  }, [chat.id, isEditMode, prefetchChatDelayed]);

  // Handle press out - cancel prefetch if user didn't navigate
  const handlePressOut = useCallback(() => {
    // Don't cancel - let prefetch continue even if touch ends
    // This ensures data is ready when user taps
  }, []);

  return (
    <>
      <TouchableOpacity
        ref={chatItemRef as any}
        style={[styles.container, dynamicStyles.container]}
        onPress={() => onPress(chat)}
        onLongPress={Platform.OS === 'web' ? undefined : handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        {/* Анимированный чекбокс в режиме редактирования */}
        {isEditMode && (
          <Animated.View style={[
            styles.checkboxContainer,
            {
              opacity: checkboxOpacity,
              transform: [{ translateX: checkboxTranslateX }],
            }
          ]}>
            <View style={[
              styles.checkbox,
              {
                borderColor: theme.border,
                backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary
              },
              isSelected && { borderColor: theme.primary }
            ]}>
              {isSelected && <Ionicons name="checkmark" size={18} color="#FFF" />}
            </View>
          </Animated.View>
        )}

        {/* Анимированный контент чата */}
        <Animated.View
          style={[
            styles.chatContent,
            {
              transform: [{ translateX: contentTranslateX }]
            }
          ]}
        >
          <View style={styles.avatarContainer}>
            {chat.type === 'saved' ? (
              <View style={styles.savedChatAvatar}>
                <Ionicons name="bookmark" size={24} color="#FFFFFF" />
              </View>
            ) : (
              <Avatar
                imageUrl={getChatAvatar()}
                thumbnailUrl={getChatAvatarThumbnail()}
                name={getChatName()}
                size={50}
              />
            )}
            {getCompanionOnlineStatus() && (
              <View style={[styles.onlineIndicator, { borderColor: theme.backgroundSecondary }]} />
            )}
          </View>

          <View style={styles.content}>
          <View style={styles.header}>
            {chat.type === 'group' && (
              <Ionicons name="people" size={16} color={theme.textTertiary} style={styles.chatTypeIcon} />
            )}
            {chat.type === 'channel' && (
              <Ionicons name="megaphone" size={16} color={theme.textTertiary} style={styles.chatTypeIcon} />
            )}
            <Text style={[styles.name, dynamicStyles.name]} numberOfLines={1}>
              {getChatName()}
            </Text>
            <View style={styles.headerRight}>
              {chat.is_favorite && (
                <Ionicons
                  name="star"
                  size={16}
                  color={theme.warning || '#FFB800'}
                  style={styles.favoriteIcon}
                  testID={`favorite-star-${chat.id}`}
                />
              )}
              {chat.is_muted && (
                <Ionicons
                  name="notifications-off"
                  size={14}
                  color={theme.textTertiary}
                  style={styles.mutedTimeIcon}
                />
              )}
              {chat.last_message && (
                <Text style={[styles.time, dynamicStyles.time]}>
                  {formatDistanceToNow(new Date(chat.last_message.created_at), {
                    addSuffix: false,
                    locale: ru,
                  })}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <View style={styles.previewContainer}>
              {/* Индикатор статуса сообщения (только для своих сообщений) */}
              {(() => {
                const status = getMessageStatus();
                if (!status) return null;

                let iconName: keyof typeof Ionicons.glyphMap = 'checkmark';
                let iconColor = theme.textTertiary;

                if (status === 'sending') {
                  iconName = 'time-outline';
                  iconColor = theme.textTertiary;
                } else if (status === 'sent') {
                  iconName = 'checkmark';
                  iconColor = theme.textTertiary;
                } else if (status === 'delivered') {
                  iconName = 'checkmark-done';
                  iconColor = theme.textTertiary;
                } else if (status === 'read') {
                  iconName = 'checkmark-done';
                  iconColor = theme.primary;
                }

                return (
                  <Ionicons
                    name={iconName}
                    size={14}
                    color={iconColor}
                    style={styles.statusIcon}
                  />
                );
              })()}

              {chat.last_message?.is_forwarded && !typingUsers.length && (
                <Ionicons
                  name="arrow-redo"
                  size={14}
                  color={theme.textTertiary}
                  style={styles.statusIcon}
                />
              )}
              {(() => {
                const media = getMediaPreview();
                if (!media) return null;
                return media.thumbUrl ? (
                  <Image
                    source={{ uri: media.thumbUrl }}
                    style={styles.mediaThumbnail}
                    contentFit="cover"
                    recyclingKey={`chat-thumb-${chat.last_message?.id}`}
                  />
                ) : (
                  <Ionicons
                    name={media.type === 'video' ? 'videocam' : 'camera'}
                    size={16}
                    color={theme.textTertiary}
                  />
                );
              })()}
              <Text style={[styles.preview, dynamicStyles.preview]} numberOfLines={1}>
                {getLastMessagePreview()}
              </Text>
            </View>

            <View style={styles.badges}>
              {!!chat.unread_count && chat.unread_count > 0 && (
                <View style={[
                  styles.unreadBadge,
                  { backgroundColor: theme.primary },
                  chat.unread_count > 99 && styles.unreadBadgeLarge,
                ]} testID={`unread-badge-${chat.id}`}>
                  <Text style={styles.unreadText}>
                    {chat.unread_count > 99 ? '99+' : String(chat.unread_count)}
                  </Text>
                </View>
              )}
              {chat.is_pinned && (
                <Ionicons
                  name="pin"
                  size={14}
                  color={theme.textTertiary}
                  style={styles.pinIcon}
                  testID={`pin-icon-${chat.id}`}
                />
              )}
            </View>
          </View>
        </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Контекстное меню */}
      <Modal
        visible={showContextMenu}
        transparent
        animationType={Platform.OS === 'web' ? 'none' : 'fade'}
        onRequestClose={() => setShowContextMenu(false)}
      >
        {Platform.OS === 'web' ? (
          <Pressable
            style={[styles.modalOverlay, { backgroundColor: 'transparent' }, menuPosition && { justifyContent: 'flex-start', alignItems: 'flex-start' }]}
            onPress={() => setShowContextMenu(false)}
          >
            <View style={[
              styles.contextMenu,
              { backgroundColor: theme.backgroundSecondary },
              menuPosition && { position: 'absolute', top: menuPosition.top, left: menuPosition.left },
            ]}>
              {/* Название чата */}
              <View style={[styles.chatHeader, { backgroundColor: theme.background }]}>
                <Text style={[styles.chatName, { color: theme.text }]} numberOfLines={1}>
                  {getChatName()}
                </Text>
              </View>

              {/* Разделитель */}
              <View style={[styles.separator, { backgroundColor: theme.border }]} />

              {/* Для saved чата - только очистить */}
              {chat.type === 'saved' ? (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleClearSaved}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.error} />
                  <Text style={[styles.menuText, { color: theme.error }]}>
                    Очистить избранное
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  {/* Избранное */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleToggleFavorite}
                  >
                    <Ionicons
                      name={chat.is_favorite ? "star" : "star-outline"}
                      size={18}
                      color={chat.is_favorite ? theme.warning : theme.text}
                    />
                    <Text style={[styles.menuText, { color: theme.text }]}>
                      {chat.is_favorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                    </Text>
                  </TouchableOpacity>

                  {/* Закрепить/открепить */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleTogglePinned}
                  >
                    <Ionicons
                      name={chat.is_pinned ? "pin" : "pin-outline"}
                      size={18}
                      color={chat.is_pinned ? theme.primary : theme.text}
                    />
                    <Text style={[styles.menuText, { color: theme.text }]}>
                      {chat.is_pinned ? 'Открепить' : 'Закрепить'}
                    </Text>
                  </TouchableOpacity>

                  {/* Пометить как прочитанное */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleMarkAsRead}
                  >
                    <Ionicons name="checkmark-done-outline" size={18} color={theme.text} />
                    <Text style={[styles.menuText, { color: theme.text }]}>
                      Пометить как прочитанное
                    </Text>
                  </TouchableOpacity>

                  {/* Уведомления (mute/unmute) */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleMutePress}
                  >
                    <Ionicons
                      name={chat.is_muted ? "notifications-outline" : "notifications-off-outline"}
                      size={18}
                      color={theme.text}
                    />
                    <Text style={[styles.menuText, { color: theme.text }]}>
                      {chat.is_muted ? 'Включить уведомления' : 'Отключить уведомления'}
                    </Text>
                  </TouchableOpacity>

                  {/* Удалить */}
                  {onDelete && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={handleDelete}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.error} />
                      <Text style={[styles.menuText, { color: theme.error }]}>
                        Удалить
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </Pressable>
        ) : (
        <View style={styles.blurOverlay}>
          {reduceAnimations ? (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]} />
          ) : (
            <BlurView intensity={80} style={StyleSheet.absoluteFillObject} tint="dark" />
          )}
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowContextMenu(false)}
          >
            <View style={[styles.contextMenu, { backgroundColor: theme.backgroundSecondary }]}>
              {/* Название чата */}
              <View style={[styles.chatHeader, { backgroundColor: theme.background }]}>
                <Text style={[styles.chatName, { color: theme.text }]} numberOfLines={1}>
                  {getChatName()}
                </Text>
              </View>

              {/* Разделитель */}
              <View style={[styles.separator, { backgroundColor: theme.border }]} />

              {/* Для saved чата - только очистить */}
              {chat.type === 'saved' ? (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleClearSaved}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.error} />
                  <Text style={[styles.menuText, { color: theme.error }]}>
                    Очистить избранное
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  {/* Избранное */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleToggleFavorite}
                  >
                    <Ionicons
                      name={chat.is_favorite ? "star" : "star-outline"}
                      size={18}
                      color={chat.is_favorite ? theme.warning : theme.text}
                    />
                    <Text style={[styles.menuText, { color: theme.text }]}>
                      {chat.is_favorite ? 'Удалить из избранного' : 'Добавить в избранное'}
                    </Text>
                  </TouchableOpacity>

                  {/* Закрепить/открепить */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleTogglePinned}
                  >
                    <Ionicons
                      name={chat.is_pinned ? "pin" : "pin-outline"}
                      size={18}
                      color={chat.is_pinned ? theme.primary : theme.text}
                    />
                    <Text style={[styles.menuText, { color: theme.text }]}>
                      {chat.is_pinned ? 'Открепить' : 'Закрепить'}
                    </Text>
                  </TouchableOpacity>

                  {/* Пометить как прочитанное */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleMarkAsRead}
                  >
                    <Ionicons name="checkmark-done-outline" size={18} color={theme.text} />
                    <Text style={[styles.menuText, { color: theme.text }]}>
                      Пометить как прочитанное
                    </Text>
                  </TouchableOpacity>

                  {/* Уведомления (mute/unmute) */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleMutePress}
                  >
                    <Ionicons
                      name={chat.is_muted ? "notifications-outline" : "notifications-off-outline"}
                      size={18}
                      color={theme.text}
                    />
                    <Text style={[styles.menuText, { color: theme.text }]}>
                      {chat.is_muted ? 'Включить уведомления' : 'Отключить уведомления'}
                    </Text>
                  </TouchableOpacity>

                  {/* Удалить */}
                  {onDelete && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={handleDelete}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.error} />
                      <Text style={[styles.menuText, { color: theme.error }]}>
                        Удалить
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </Pressable>
        </View>
        )}
      </Modal>

      {/* Mute Duration Modal */}
      <ActionModal
        visible={showMuteModal}
        title="Отключить уведомления"
        onDismiss={() => setShowMuteModal(false)}
        actions={[
          {
            text: 'На 1 час',
            icon: 'time-outline',
            style: 'default',
            onPress: () => handleMuteAction('1h'),
          },
          {
            text: 'На 12 часов',
            icon: 'time-outline',
            style: 'default',
            onPress: () => handleMuteAction('12h'),
          },
          {
            text: 'Навсегда',
            icon: 'notifications-off-outline',
            style: 'default',
            onPress: () => handleMuteAction('forever'),
          },
          {
            text: 'Отмена',
            style: 'cancel',
            onPress: () => setShowMuteModal(false),
          },
        ]}
      />

      {/* Delete Modal */}
      <ActionModal
        visible={showDeleteModal}
        title="Удалить чат"
        message="Вы уверены, что хотите удалить этот чат?"
        checkbox={{
          label: 'Также удалить историю сообщений',
          checked: clearHistory,
          onChange: setClearHistory,
        }}
        actions={[
          {
            text: 'Отмена',
            style: 'cancel',
            onPress: () => setShowDeleteModal(false),
          },
          {
            text: 'Удалить',
            style: 'destructive',
            icon: 'trash-outline',
            onPress: handleConfirmDelete,
          },
        ]}
        onDismiss={() => setShowDeleteModal(false)}
      />

      {/* Clear Saved Chat Modal */}
      <ActionModal
        visible={showClearSavedModal}
        title="Очистить избранное"
        message="Вы уверены, что хотите удалить все сообщения из избранного?"
        actions={[
          {
            text: 'Отмена',
            style: 'cancel',
            onPress: () => setShowClearSavedModal(false),
          },
          {
            text: 'Очистить',
            style: 'destructive',
            icon: 'trash-outline',
            onPress: handleConfirmClearSaved,
          },
        ]}
        onDismiss={() => setShowClearSavedModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  checkboxContainer: {
    width: 24,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  savedChatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatTypeIcon: {
    marginRight: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  favoriteIcon: {
    marginTop: -1,
  },
  pinIcon: {
    marginLeft: 4,
    transform: [{ rotate: '45deg' }],
  },
  time: {
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIcon: {
    marginTop: 1,
  },
  mediaThumbnail: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  preview: {
    fontSize: 14,
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  mutedTimeIcon: {
    marginTop: -1,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeLarge: {
    minWidth: 32,
  },
  unreadText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  blurOverlay: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  contextMenu: {
    minWidth: 280,
    maxWidth: 320,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  chatHeader: {
    padding: 12,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  separator: {
    height: 1,
    marginHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
    // @ts-ignore
    cursor: 'pointer',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});

// Helper function to get member statuses hash for comparison
const getMemberStatusHash = (members: any[] | undefined): string => {
  if (!members) return '';
  return members.map(m => `${m.user_id}:${m.user?.status || 'unknown'}`).join(',');
};

// Оптимизация: используем React.memo для предотвращения лишних ре-рендеров
export const ChatItem = React.memo(ChatItemComponent, (prevProps, nextProps) => {
  // Check if typing users changed
  const prevTypingCount = prevProps.typingUsers?.length || 0;
  const nextTypingCount = nextProps.typingUsers?.length || 0;
  const typingChanged = prevTypingCount !== nextTypingCount ||
    (prevTypingCount > 0 && nextTypingCount > 0 &&
      JSON.stringify(prevProps.typingUsers) !== JSON.stringify(nextProps.typingUsers));

  // Check if member online status changed (for online indicator)
  const prevMemberStatus = getMemberStatusHash(prevProps.chat.members);
  const nextMemberStatus = getMemberStatusHash(nextProps.chat.members);
  const memberStatusChanged = prevMemberStatus !== nextMemberStatus;

  // Check if read status of last message changed (для галочек прочтения)
  const prevReadByLength = prevProps.chat.last_message?.read_by?.length || 0;
  const nextReadByLength = nextProps.chat.last_message?.read_by?.length || 0;
  const readStatusChanged = prevReadByLength !== nextReadByLength;

  // Check if delivered status changed
  const prevDeliveredLength = prevProps.chat.last_message?.delivered_to?.length || 0;
  const nextDeliveredLength = nextProps.chat.last_message?.delivered_to?.length || 0;
  const deliveredStatusChanged = prevDeliveredLength !== nextDeliveredLength;

  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.name === nextProps.chat.name &&
    prevProps.chat.avatar === nextProps.chat.avatar &&
    prevProps.chat.last_message?.id === nextProps.chat.last_message?.id &&
    prevProps.chat.last_message?.content === nextProps.chat.last_message?.content &&
    prevProps.chat.unread_count === nextProps.chat.unread_count &&
    prevProps.chat.is_pinned === nextProps.chat.is_pinned &&
    prevProps.chat.is_favorite === nextProps.chat.is_favorite &&
    prevProps.chat.is_muted === nextProps.chat.is_muted &&
    prevProps.isEditMode === nextProps.isEditMode &&
    prevProps.isSelected === nextProps.isSelected &&
    !typingChanged &&
    !memberStatusChanged &&
    !readStatusChanged &&
    !deliveredStatusChanged
  );
});
