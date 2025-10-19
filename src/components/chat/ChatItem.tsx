import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Chat } from '../../types/chat.types';
import { Avatar } from '@components/common/Avatar';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { InputDialog } from '@components/common/InputDialog';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';

interface ChatItemProps {
  chat: Chat;
  onPress: (chat: Chat) => void;
  onDelete?: (chatId: number) => void;
  onRename?: (chatId: number, newName: string) => void;
  onLeave?: (chatId: number) => void;
}

export const ChatItem: React.FC<ChatItemProps> = ({ chat, onPress, onDelete, onRename, onLeave }) => {
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);

  const getChatName = () => {
    return chat.name || 'Unnamed Chat';
  };

  const getChatAvatar = () => {
    return chat.avatar || chat.avatar_url;
  };

  const getLastMessagePreview = () => {
    if (!chat.last_message) return 'Нет сообщений';
    return chat.last_message.content || 'Нет сообщений';
  };

  // Проверка: создатель ли текущий пользователь
  const creatorId = chat.created_by || chat.creator_id;
  const isCreator = currentUser && creatorId === currentUser.id;

  // Отладка: логирование для проверки
  React.useEffect(() => {
    console.log(`Chat "${chat.name}": creator_id=${chat.creator_id}, created_by=${chat.created_by}, currentUser.id=${currentUser?.id}, isCreator=${isCreator}`);
  }, [chat.id, chat.creator_id, chat.created_by, currentUser?.id, isCreator]);

  const handleDelete = () => {
    if (!onDelete && !onLeave) return;

    if (isCreator) {
      // Создатель может удалить чат
      setShowDeleteDialog(true);
    } else {
      // Обычный участник может только выйти
      setShowLeaveDialog(true);
    }
  };

  const handleRename = () => {
    if (!onRename) return;
    setShowRenameDialog(true);
  };

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    if (onDelete) {
      onDelete(chat.id);
    }
  };

  const confirmLeave = () => {
    setShowLeaveDialog(false);
    if (onLeave) {
      onLeave(chat.id);
    }
  };

  const confirmRename = (newName: string) => {
    setShowRenameDialog(false);
    if (onRename) {
      onRename(chat.id, newName);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
  };

  const cancelLeave = () => {
    setShowLeaveDialog(false);
  };

  const cancelRename = () => {
    setShowRenameDialog(false);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary,
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

  return (
    <View style={[styles.wrapper]}>
      <TouchableOpacity
        style={[styles.container, dynamicStyles.container]}
        onPress={() => onPress(chat)}
        activeOpacity={0.7}
      >
        <Avatar
          imageUrl={getChatAvatar()}
          name={getChatName()}
          size={50}
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.name, dynamicStyles.name]} numberOfLines={1}>
              {getChatName()}
            </Text>
            {chat.last_message && (
              <Text style={[styles.time, dynamicStyles.time]}>
                {formatDistanceToNow(new Date(chat.last_message.created_at), {
                  addSuffix: false,
                  locale: ru,
                })}
              </Text>
            )}
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

      {onRename && isCreator && (
        <TouchableOpacity
          style={[styles.renameButton, { backgroundColor: theme.primary }]}
          onPress={handleRename}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {(onDelete || onLeave) && (
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: theme.error || '#FF3B30' }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name={isCreator ? "trash-outline" : "exit-outline"} size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Диалог удаления (для создателя) */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Удалить чат"
        message={`Вы уверены, что хотите удалить чат "${getChatName()}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        destructive
      />

      {/* Диалог выхода (для участников) */}
      <ConfirmDialog
        visible={showLeaveDialog}
        title="Выйти из чата"
        message={`Вы уверены, что хотите выйти из чата "${getChatName()}"?`}
        confirmText="Выйти"
        cancelText="Отмена"
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
        destructive
      />

      {/* Диалог переименования */}
      <InputDialog
        visible={showRenameDialog}
        title="Переименовать чат"
        placeholder="Введите новое название"
        initialValue={getChatName()}
        confirmText="Сохранить"
        cancelText="Отмена"
        onConfirm={confirmRename}
        onCancel={cancelRename}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 74,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  renameButton: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
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
  time: {
    fontSize: 12,
    marginLeft: 8,
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
});
