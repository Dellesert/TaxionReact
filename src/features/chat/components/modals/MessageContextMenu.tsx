import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { Message } from '../../types/chat.types';
import { formatTime, isImageFile, isVideoFile } from '../../utils/message.utils';
import { getFileIcon, decodeFileName } from '../../utils/file.utils';
import { stripFormatting } from '../../utils/formatting';
import { ReactionBar } from '../messages/ReactionBar';
import { FormattedText } from '../common/FormattedText';

interface MessageContextMenuProps {
  visible: boolean;
  message: Message;
  menuPosition: { top: number; left: number };
  isOwnMessage: boolean;
  isAdmin: boolean;
  isForwardedMessage: boolean;
  chatType?: 'private' | 'group' | 'channel';
  currentUserRole?: 'owner' | 'admin' | 'member';
  onClose: () => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onPin?: (messageId: number) => void;
  onUnpin?: (messageId: number) => void;
  onForward?: (message: Message) => void;
  onDelete?: () => void;
  onRestore?: (messageId: number) => void;
  onEnterSelectionMode?: (messageId: number) => void;
  onReaction?: (emoji: string) => void;
  currentUserId?: number;
}

/**
 * Контекстное меню для сообщения (долгое нажатие)
 */
export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  visible,
  message,
  menuPosition,
  isOwnMessage,
  isAdmin,
  isForwardedMessage,
  chatType,
  currentUserRole,
  onClose,
  onReply,
  onEdit,
  onPin,
  onUnpin,
  onForward,
  onDelete,
  onRestore,
  onEnterSelectionMode,
  onReaction,
  currentUserId,
}) => {
  const { theme } = useTheme();
  const { showError } = useNotification();

  const userReactionEmojis = React.useMemo(() => {
    if (!currentUserId) return [];
    return message.reactions
      .filter(r => r.user_id === currentUserId)
      .map(r => r.emoji);
  }, [message.reactions, currentUserId]);

  // Check if user can pin/unpin messages
  const canPinUnpin = React.useMemo(() => {
    // In private chats, anyone can pin/unpin
    if (chatType === 'private') {
      return true;
    }
    // In group chats, only owner and admin can pin/unpin
    if (chatType === 'group') {
      return currentUserRole === 'owner' || currentUserRole === 'admin';
    }
    // Default to false if chat type is unknown
    return false;
  }, [chatType, currentUserRole]);

  // Получить превью сообщения (текст и/или информация о файле)
  const getMessagePreview = (): { text: string; icon?: string; attachmentText?: string } => {
    const hasText = message.content && message.content.trim().length > 0;
    const hasAttachments = message.attachments && message.attachments.length > 0;

    // Вспомогательная функция: получить label для вложения
    const getAttachmentLabel = (truncateLen: number): { label: string; icon: string } => {
      const attachment = message.attachments[0];
      const mt = attachment.mime_type || attachment.file_type || '';
      const isImage = isImageFile(mt);
      const isVideo = isVideoFile(mt);

      if (isImage || isVideo) {
        const mediaLabel = isImage ? 'Фото' : 'Видео';
        const extra = message.attachments.length > 1 ? ` и ещё ${message.attachments.length - 1}` : '';
        return { label: mediaLabel + extra, icon: isImage ? 'image-outline' : 'videocam-outline' };
      }

      const icon = getFileIcon(mt, attachment.file_name);
      let fileName = decodeFileName(attachment.file_name);
      if (fileName.length > truncateLen) {
        const ext = fileName.split('.').pop();
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        fileName = nameWithoutExt.substring(0, truncateLen - 5) + '...' + (ext ? `.${ext}` : '');
      }
      const extra = message.attachments.length > 1 ? ` и ещё ${message.attachments.length - 1}` : '';
      return { label: fileName + extra, icon };
    };

    // Если есть и текст, и вложения
    if (hasText && hasAttachments) {
      const { label, icon } = getAttachmentLabel(30);
      return {
        text: message.content,
        icon,
        attachmentText: label,
      };
    }

    // Если только текст
    if (hasText) {
      return { text: message.content };
    }

    // Если только вложения
    if (hasAttachments) {
      const { label, icon } = getAttachmentLabel(40);
      return { text: label, icon };
    }

    // Если ни текста, ни вложений нет
    return { text: 'Сообщение без содержимого' };
  };

  const handleCopyMessage = async () => {
    try {
      await Clipboard.setStringAsync(stripFormatting(message.content));
    } catch (error) {
      console.error('Failed to copy message:', error);
      showError('Не удалось скопировать текст');
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={80} style={styles.blurOverlay} tint="dark">
        <Pressable
          style={styles.modalOverlay}
          onPress={onClose}
        >
          <View style={[
            styles.contextMenu,
            { backgroundColor: theme.backgroundSecondary, top: menuPosition.top, left: menuPosition.left }
          ]}>
            {/* Панель быстрых реакций */}
            {!message.is_deleted && onReaction && (
              <>
                <ReactionBar
                  onSelectEmoji={(emoji) => {
                    onReaction(emoji);
                    onClose();
                  }}
                  existingReactions={userReactionEmojis}
                />
                <View style={[styles.separator, { backgroundColor: theme.border }]} />
              </>
            )}

            {/* Превью выбранного сообщения */}
            <View style={[styles.messagePreview, { backgroundColor: theme.background }]}>
              {(() => {
                const preview = getMessagePreview();
                return (
                  <>
                    {/* Если есть текст И вложение - показываем текст отдельно */}
                    {preview.attachmentText ? (
                      <>
                        <FormattedText
                          text={preview.text}
                          style={[styles.previewText, { color: theme.text }]}
                          numberOfLines={2}
                        />
                        <View style={[styles.previewContent, { marginTop: 6 }]}>
                          {preview.icon && (
                            <Ionicons
                              name={preview.icon as any}
                              size={16}
                              color={theme.primary}
                              style={styles.previewIcon}
                            />
                          )}
                          <Text style={[styles.attachmentText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {preview.attachmentText}
                          </Text>
                        </View>
                      </>
                    ) : (
                      /* Если только текст или только вложение - показываем с иконкой */
                      <View style={styles.previewContent}>
                        {preview.icon && (
                          <Ionicons
                            name={preview.icon as any}
                            size={18}
                            color={theme.primary}
                            style={styles.previewIcon}
                          />
                        )}
                        <FormattedText
                          text={preview.text}
                          style={[styles.previewText, { color: theme.text }]}
                          numberOfLines={3}
                        />
                      </View>
                    )}

                    <Text style={[styles.previewTime, { color: theme.textSecondary }]}>
                      {formatTime(message.created_at)}
                    </Text>
                  </>
                );
              })()}
            </View>

            {/* Разделитель */}
            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            {/* Для удаленных сообщений показываем только восстановить */}
            {message.is_deleted ? (
              <>
                {/* Восстановить (только админы) */}
                {isAdmin && onRestore && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onClose();
                      onRestore(message.id);
                    }}
                  >
                    <Ionicons name="reload-outline" size={20} color={theme.primary} />
                    <Text style={[styles.menuText, { color: theme.primary }]}>Восстановить</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {/* Ответить */}
                {onReply && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onClose();
                      onReply(message);
                    }}
                  >
                    <Ionicons name="arrow-undo-outline" size={20} color={theme.text} />
                    <Text style={[styles.menuText, { color: theme.text }]}>Ответить</Text>
                  </TouchableOpacity>
                )}

                {/* Выбрать */}
                {onEnterSelectionMode && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onClose();
                      onEnterSelectionMode(message.id);
                    }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color={theme.text} />
                    <Text style={[styles.menuText, { color: theme.text }]}>Выбрать</Text>
                  </TouchableOpacity>
                )}

                {/* Скопировать */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleCopyMessage}
                >
                  <Ionicons name="copy-outline" size={20} color={theme.text} />
                  <Text style={[styles.menuText, { color: theme.text }]}>Скопировать</Text>
                </TouchableOpacity>

                {/* Изменить (только свои сообщения, не пересланные и не опросы) */}
                {isOwnMessage && onEdit && !isForwardedMessage && message.message_type !== 'poll' && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onClose();
                      onEdit(message);
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color={theme.text} />
                    <Text style={[styles.menuText, { color: theme.text }]}>Изменить</Text>
                  </TouchableOpacity>
                )}

                {/* Закрепить / Открепить (только для пользователей с правами) */}
                {canPinUnpin && (
                  message.is_pinned ? (
                    onUnpin && (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          onClose();
                          onUnpin(message.id);
                        }}
                      >
                        <Ionicons name="pin" size={20} color={theme.text} />
                        <Text style={[styles.menuText, { color: theme.text }]}>Открепить</Text>
                      </TouchableOpacity>
                    )
                  ) : (
                    onPin && (
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                          onClose();
                          onPin(message.id);
                        }}
                      >
                        <Ionicons name="pin-outline" size={20} color={theme.text} />
                        <Text style={[styles.menuText, { color: theme.text }]}>Закрепить</Text>
                      </TouchableOpacity>
                    )
                  )
                )}

                {/* Переслать */}
                {onForward && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onClose();
                      onForward(message);
                    }}
                  >
                    <Ionicons name="arrow-redo-outline" size={20} color={theme.text} />
                    <Text style={[styles.menuText, { color: theme.text }]}>Переслать</Text>
                  </TouchableOpacity>
                )}

                {/* Удалить */}
                {onDelete && !message.is_deleted && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onClose();
                      onDelete();
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#E94444" />
                    <Text style={[styles.menuText, { color: '#E94444' }]}>Удалить</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </Pressable>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  previewContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  previewIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  previewText: {
    fontSize: 15,
    lineHeight: 20,
    flex: 1,
  },
  attachmentText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
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
