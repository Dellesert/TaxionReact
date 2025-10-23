import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { Chat } from '../../types/chat.types';
import { Avatar } from '@components/common/Avatar';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { getChatDisplayName, getChatDisplayAvatar, getPersonalChatCompanion } from '@utils/chatUtils';

interface ChatItemProps {
  chat: Chat;
  onPress: (chat: Chat) => void;
  onLongPress?: (chat: Chat) => void;
  onMarkAsRead?: (chatId: number) => void;
  onDelete?: (chatId: number) => void;
  onToggleFavorite?: (chatId: number) => void;
  onTogglePinned?: (chatId: number) => void;
  isEditMode?: boolean;
  isSelected?: boolean;
}

export const ChatItem: React.FC<ChatItemProps> = ({ chat, onPress, onLongPress, onMarkAsRead, onDelete, onToggleFavorite, onTogglePinned, isEditMode, isSelected }) => {
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const [showContextMenu, setShowContextMenu] = useState(false);

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
      onLongPress?.(chat);
    }
  };

  const handleMarkAsRead = () => {
    setShowContextMenu(false);
    onMarkAsRead?.(chat.id);
  };

  const handleDelete = () => {
    setShowContextMenu(false);
    onDelete?.(chat.id);
  };

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
        {/* Чекбокс в режиме редактирования */}
        {isEditMode && (
          <View style={styles.checkboxContainer}>
            <View style={[
              styles.checkbox,
              { borderColor: theme.border },
              isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}>
              {isSelected && <Ionicons name="checkmark" size={18} color="#FFF" />}
            </View>
          </View>
        )}

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
            <Text style={[styles.preview, dynamicStyles.preview]} numberOfLines={1}>
              {getLastMessagePreview()}
            </Text>

            <View style={styles.badges}>
              {chat.is_muted && (
                <Ionicons name="notifications-off" size={16} color={theme.textTertiary} style={styles.muteIcon} />
              )}
              {chat.unread_count > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.unreadText}>
                    {chat.unread_count > 99 ? '99+' : chat.unread_count}
                  </Text>
                </View>
              )}
            </View>
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
      </Modal >
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
    marginRight: 12,
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
