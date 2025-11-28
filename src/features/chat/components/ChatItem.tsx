import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Chat } from '../types/chat.types';
import { Avatar } from '@shared/components/common/Avatar';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { getChatDisplayName, getChatDisplayAvatar, getPersonalChatCompanion } from '../utils/chatUtils';
import { ActionSheet, ActionSheetOption } from '@shared/components/common/ActionSheet';

interface ChatItemProps {
  chat: Chat;
  onPress: (chat: Chat) => void;
  onLongPress?: (chat: Chat) => void;
  onMarkAsRead?: (chatId: number) => void;
  onDelete?: (chatId: number, clearHistory?: boolean) => void;
  onToggleFavorite?: (chatId: number) => void;
  onTogglePinned?: (chatId: number) => void;
  isEditMode?: boolean;
  isSelected?: boolean;
  itemIndex?: number;
}

const ChatItemComponent: React.FC<ChatItemProps> = ({ chat, onPress, onMarkAsRead, onDelete, onToggleFavorite, onTogglePinned, isEditMode, isSelected, itemIndex = 0 }) => {
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteActionSheet, setShowDeleteActionSheet] = useState(false);

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
    Animated.timing(checkboxAnimation, {
      toValue: isEditMode ? 1 : 0,
      duration: 250, // Плавная анимация 250ms
      useNativeDriver: true,
    }).start();
  }, [isEditMode, checkboxAnimation]);

  const getChatName = () => {
    return getChatDisplayName(chat, currentUser?.id);
  };

  const getChatAvatar = () => {
    return getChatDisplayAvatar(chat, currentUser?.id);
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
    if (!chat.last_message) return 'Нет сообщений';

    const message = chat.last_message;
    const isCurrentUser = message.sender_id === currentUser?.id;

    // Определяем префикс отправителя
    let senderPrefix = '';
    if (chat.type === 'private') {
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
    let messageText = message.content || '';

    // Если сообщение пустое но есть вложения
    if (!messageText && message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0];
      if (attachment.file_type?.startsWith('image')) {
        messageText = 'Фото';
      } else if (attachment.file_type?.startsWith('video')) {
        messageText = 'Видео';
      } else {
        messageText = 'Файл';
      }
    }

    return senderPrefix + (messageText || 'Нет сообщений');
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: chat.is_pinned
        ? (theme.isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)')
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
      setShowContextMenu(true);
    }
  };

  const handleMarkAsRead = () => {
    setShowContextMenu(false);
    onMarkAsRead?.(chat.id);
  };

  const handleDelete = () => {
    setShowContextMenu(false);
    setShowDeleteActionSheet(true);
  };

  const deleteActionOptions: ActionSheetOption[] = [
    {
      label: 'Удалить',
      onPress: () => {
        onDelete?.(chat.id, false);
      },
    },
    {
      label: 'Удалить и очистить историю',
      onPress: () => {
        onDelete?.(chat.id, true);
      },
      destructive: true,
    },
  ];

  const handleToggleFavorite = () => {
    setShowContextMenu(false);
    onToggleFavorite?.(chat.id);
  };

  const handleTogglePinned = () => {
    setShowContextMenu(false);
    onTogglePinned?.(chat.id);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, dynamicStyles.container]}
        onPress={() => onPress(chat)}
        onLongPress={handleLongPress}
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
              { borderColor: theme.border },
              isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
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
            <Avatar
              imageUrl={getChatAvatar()}
              name={getChatName()}
              size={50}
            />
            {getCompanionOnlineStatus() && (
              <View style={[styles.onlineIndicator, { borderColor: theme.backgroundSecondary }]} />
            )}
          </View>

          <View style={styles.content}>
          <View style={styles.header}>
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
                />
              )}
              {chat.is_pinned && (
                <Ionicons
                  name="pin"
                  size={16}
                  color={theme.primary}
                  style={styles.pinIcon}
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

              <Text style={[styles.preview, dynamicStyles.preview]} numberOfLines={1}>
                {getLastMessagePreview()}
              </Text>
            </View>

            <View style={styles.badges}>
              {chat.is_muted && (
                <Ionicons name="notifications-off" size={16} color={theme.textTertiary} style={styles.muteIcon} />
              )}
              {!!chat.unread_count && chat.unread_count > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.unreadText}>
                    {chat.unread_count > 99 ? '99+' : String(chat.unread_count)}
                  </Text>
                </View>
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
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <BlurView intensity={80} style={styles.blurOverlay} tint="dark">
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

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleToggleFavorite}
              >
                <Ionicons
                  name={chat.is_favorite ? "star" : "star-outline"}
                  size={22}
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
                  size={22}
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
                <Ionicons name="checkmark-done-outline" size={22} color={theme.text} />
                <Text style={[styles.menuText, { color: theme.text }]}>
                  Пометить как прочитанное
                </Text>
              </TouchableOpacity>

              {/* Удалить */}
              {onDelete && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleDelete}
                >
                  <Ionicons name="trash-outline" size={22} color={theme.error || '#FF3B30'} />
                  <Text style={[styles.menuText, { color: theme.error || '#FF3B30' }]}>
                    Удалить
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </BlurView>
      </Modal>

      {/* Delete ActionSheet */}
      <ActionSheet
        visible={showDeleteActionSheet}
        title="Удалить чат"
        options={deleteActionOptions}
        onCancel={() => setShowDeleteActionSheet(false)}
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
    marginTop: -1,
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
  preview: {
    fontSize: 14,
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  muteIcon: {
    marginRight: 4,
  },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
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
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  chatHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  chatName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  separator: {
    height: 1,
    marginHorizontal: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

// Оптимизация: используем React.memo для предотвращения лишних ре-рендеров
export const ChatItem = React.memo(ChatItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.last_message?.id === nextProps.chat.last_message?.id &&
    prevProps.chat.last_message?.content === nextProps.chat.last_message?.content &&
    prevProps.chat.unread_count === nextProps.chat.unread_count &&
    prevProps.chat.is_pinned === nextProps.chat.is_pinned &&
    prevProps.chat.is_favorite === nextProps.chat.is_favorite &&
    prevProps.chat.is_muted === nextProps.chat.is_muted &&
    prevProps.isEditMode === nextProps.isEditMode &&
    prevProps.isSelected === nextProps.isSelected
  );
});
