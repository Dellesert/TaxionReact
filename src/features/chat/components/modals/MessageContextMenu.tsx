import React from 'react';
import { Modal, Pressable, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useAuthStore } from '@shared/store/authStore';
import { Message } from '../../types/chat.types';
import { formatDateTime, isImageFile, isVideoFile } from '../../utils/message.utils';
import { decodeFileName } from '../../utils/file.utils';
import { getThumbnailUrl } from '../../utils/thumbnail.utils';
import { FileTypeIcon } from '@shared/components/common/FileTypeIcon';
import { stripFormatting } from '../../utils/formatting';
import { ReactionBar } from '../messages/ReactionBar';
import { FormattedText } from '../common/FormattedText';
import { useAnimationStore } from '@shared/store/animationStore';

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
  onDeletePermanent?: (messageId: number) => void;
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
  onDeletePermanent,
  onEnterSelectionMode,
  onReaction,
  currentUserId,
}) => {
  const { theme } = useTheme();
  const { showError } = useNotification();
  const reduceAnimations = useAnimationStore((s) => s.reduceAnimations);
  const sessionId = useAuthStore((s) => s.sessionId);

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

  // Превью вложений: миниатюры для фото/видео, иконка типа для документов
  const renderMessagePreview = () => {
    const hasText = message.content && message.content.trim().length > 0;
    const hasAttachments = message.attachments && message.attachments.length > 0;

    const mediaAttachments = hasAttachments
      ? message.attachments.filter(a => {
          const mt = a.mime_type || a.file_type || '';
          return isImageFile(mt) || isVideoFile(mt);
        })
      : [];
    const fileAttachments = hasAttachments
      ? message.attachments.filter(a => {
          const mt = a.mime_type || a.file_type || '';
          return !isImageFile(mt) && !isVideoFile(mt);
        })
      : [];

    const hasMedia = mediaAttachments.length > 0;
    const hasFiles = fileAttachments.length > 0;

    // Рендер миниатюр (вынесено для переиспользования)
    const maxThumbs = hasText ? 3 : 4;
    const thumbsToShow = mediaAttachments.slice(0, maxThumbs);
    const extraCount = mediaAttachments.length - maxThumbs;

    const renderThumbnails = () => (
      <View style={hasText ? styles.thumbnailRowCompact : styles.thumbnailRow}>
        {thumbsToShow.map((attachment, index) => {
          const thumbnailUri = getThumbnailUrl(attachment, 'small');
          const isPublicFile = thumbnailUri.includes('/files/public/');
          const mt = attachment.mime_type || attachment.file_type || '';
          const isVideo = isVideoFile(mt);
          const isLast = index === thumbsToShow.length - 1;

          return (
            <View key={attachment.id} style={styles.thumbnailContainer}>
              <Image
                source={{
                  uri: thumbnailUri,
                  headers: (!isPublicFile && sessionId) ? { 'X-Session-ID': sessionId } : undefined,
                }}
                style={styles.thumbnailImage}
                contentFit="cover"
                cachePolicy="disk"
              />
              {isVideo && !(isLast && extraCount > 0) && (
                <View style={styles.videoOverlay}>
                  <Ionicons name="play" size={12} color="#fff" />
                </View>
              )}
              {isLast && extraCount > 0 && (
                <View style={styles.extraCountOverlay}>
                  <Text style={styles.extraCountText}>+{extraCount}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );

    return (
      <>
        {/* Медиа + текст: горизонтальный layout */}
        {hasMedia && hasText && (
          <View style={styles.mediaTextRow}>
            {renderThumbnails()}
            <FormattedText
              text={message.content}
              style={[styles.previewText, { color: theme.text }]}
              numberOfLines={3}
            />
          </View>
        )}

        {/* Только медиа без текста */}
        {hasMedia && !hasText && renderThumbnails()}

        {/* Иконка типа документа (когда нет медиа) */}
        {!hasMedia && hasFiles && (
          <View style={styles.documentPreviewRow}>
            <FileTypeIcon fileName={fileAttachments[0].file_name} size={36} />
            <View style={styles.documentInfo}>
              <Text style={[styles.documentName, { color: theme.text }]} numberOfLines={1}>
                {(() => {
                  let name = decodeFileName(fileAttachments[0].file_name);
                  if (name.length > 30) {
                    const ext = name.split('.').pop();
                    const base = name.substring(0, name.lastIndexOf('.'));
                    name = base.substring(0, 25) + '...' + (ext ? `.${ext}` : '');
                  }
                  return name;
                })()}
              </Text>
              {fileAttachments.length > 1 && (
                <Text style={[styles.documentExtra, { color: theme.textSecondary }]}>
                  и ещё {fileAttachments.length - 1}
                </Text>
              )}
              {/* Текст рядом с документом */}
              {hasText && (
                <FormattedText
                  text={message.content}
                  style={[styles.previewText, { color: theme.text, marginTop: 4 }]}
                  numberOfLines={2}
                />
              )}
            </View>
          </View>
        )}

        {/* Только текст (без вложений) */}
        {!hasMedia && !hasFiles && hasText && (
          <FormattedText
            text={message.content}
            style={[styles.previewText, { color: theme.text }]}
            numberOfLines={3}
          />
        )}

        {/* Пустое сообщение */}
        {!hasText && !hasMedia && !hasFiles && (
          <Text style={[styles.previewText, { color: theme.textSecondary }]}>
            Сообщение без содержимого
          </Text>
        )}

        <Text style={[styles.previewTime, { color: theme.textSecondary }]}>
          {formatDateTime(message.created_at)}
        </Text>
      </>
    );
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
      animationType={Platform.OS === 'web' ? 'none' : 'fade'}
      onRequestClose={onClose}
    >
      {Platform.OS === 'web' ? (
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: 'transparent' }]}
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
                <View style={[styles.separator, { backgroundColor: theme.border + '40' }]} />
              </>
            )}

            {/* Превью выбранного сообщения */}
            <View style={styles.messagePreview}>
              {renderMessagePreview()}
            </View>

            {/* Разделитель */}
            <View style={[styles.separator, { backgroundColor: theme.border + '40' }]} />

            {/* Для удаленных сообщений показываем восстановить и удалить безвозвратно */}
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
                    <Ionicons name="reload-outline" size={18} color={theme.primary} />
                    <Text style={[styles.menuText, { color: theme.primary }]}>Восстановить</Text>
                  </TouchableOpacity>
                )}
                {/* Удалить безвозвратно (только админы) */}
                {isAdmin && onDeletePermanent && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onClose();
                      onDeletePermanent(message.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.error} />
                    <Text style={[styles.menuText, { color: theme.error }]}>Удалить безвозвратно</Text>
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
                    <Ionicons name="arrow-undo-outline" size={18} color={theme.text} />
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
                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.text} />
                    <Text style={[styles.menuText, { color: theme.text }]}>Выбрать</Text>
                  </TouchableOpacity>
                )}

                {/* Скопировать */}
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleCopyMessage}
                >
                  <Ionicons name="copy-outline" size={18} color={theme.text} />
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
                    <Ionicons name="create-outline" size={18} color={theme.text} />
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
                        <Ionicons name="pin" size={18} color={theme.text} />
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
                        <Ionicons name="pin-outline" size={18} color={theme.text} />
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
                    <Ionicons name="arrow-redo-outline" size={18} color={theme.text} />
                    <Text style={[styles.menuText, { color: theme.text }]}>Переслать</Text>
                  </TouchableOpacity>
                )}

                {/* Удалить — в каналах только для админов/владельцев */}
                {onDelete && !message.is_deleted && (chatType !== 'channel' || isAdmin || currentUserRole === 'owner') && (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onClose();
                      onDelete();
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.error} />
                    <Text style={[styles.menuText, { color: theme.error }]}>Удалить</Text>
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
            onPress={onClose}
          >
            <View style={[
              styles.contextMenuPosition,
              { top: menuPosition.top, left: menuPosition.left }
            ]}>
              <View style={[
                styles.contextMenuNative,
                { backgroundColor: theme.backgroundSecondary }
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
                  <View style={[styles.separator, { backgroundColor: theme.border + '40' }]} />
                </>
              )}

              {/* Превью выбранного сообщения */}
              <View style={styles.messagePreview}>
                {renderMessagePreview()}
              </View>

              {/* Разделитель */}
              <View style={[styles.separator, { backgroundColor: theme.border + '40' }]} />

              {message.is_deleted ? (
                <>
                  {isAdmin && onRestore && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        onClose();
                        onRestore(message.id);
                      }}
                    >
                      <Ionicons name="reload-outline" size={18} color={theme.primary} />
                      <Text style={[styles.menuText, { color: theme.primary }]}>Восстановить</Text>
                    </TouchableOpacity>
                  )}
                  {isAdmin && onDeletePermanent && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        onClose();
                        onDeletePermanent(message.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.error} />
                      <Text style={[styles.menuText, { color: theme.error }]}>Удалить безвозвратно</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  {onReply && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        onClose();
                        onReply(message);
                      }}
                    >
                      <Ionicons name="arrow-undo-outline" size={18} color={theme.text} />
                      <Text style={[styles.menuText, { color: theme.text }]}>Ответить</Text>
                    </TouchableOpacity>
                  )}

                  {onEnterSelectionMode && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        onClose();
                        onEnterSelectionMode(message.id);
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color={theme.text} />
                      <Text style={[styles.menuText, { color: theme.text }]}>Выбрать</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={handleCopyMessage}
                  >
                    <Ionicons name="copy-outline" size={18} color={theme.text} />
                    <Text style={[styles.menuText, { color: theme.text }]}>Скопировать</Text>
                  </TouchableOpacity>

                  {isOwnMessage && onEdit && !isForwardedMessage && message.message_type !== 'poll' && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        onClose();
                        onEdit(message);
                      }}
                    >
                      <Ionicons name="create-outline" size={18} color={theme.text} />
                      <Text style={[styles.menuText, { color: theme.text }]}>Изменить</Text>
                    </TouchableOpacity>
                  )}

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
                          <Ionicons name="pin" size={18} color={theme.text} />
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
                          <Ionicons name="pin-outline" size={18} color={theme.text} />
                          <Text style={[styles.menuText, { color: theme.text }]}>Закрепить</Text>
                        </TouchableOpacity>
                      )
                    )
                  )}

                  {onForward && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        onClose();
                        onForward(message);
                      }}
                    >
                      <Ionicons name="arrow-redo-outline" size={18} color={theme.text} />
                      <Text style={[styles.menuText, { color: theme.text }]}>Переслать</Text>
                    </TouchableOpacity>
                  )}

                  {/* Удалить — в каналах только для админов/владельцев */}
                  {onDelete && !message.is_deleted && (chatType !== 'channel' || isAdmin || currentUserRole === 'owner') && (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        onClose();
                        onDelete();
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.error} />
                      <Text style={[styles.menuText, { color: theme.error }]}>Удалить</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              </View>
            </View>
          </Pressable>
        </View>
      )}
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
    width: 260,
    borderRadius: 12,
    padding: 0,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  contextMenuPosition: {
    position: 'absolute',
    width: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  contextMenuNative: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  messagePreview: {
    padding: 12,
    paddingBottom: 8,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  // Медиа + текст в одну строку
  mediaTextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  // Миниатюры фото/видео
  thumbnailRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  thumbnailRowCompact: {
    flexDirection: 'row',
    gap: 4,
  },
  thumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  extraCountOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  extraCountText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Превью документов
  documentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  documentInfo: {
    flex: 1,
    marginLeft: 10,
  },
  documentName: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  documentExtra: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  previewTime: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 4,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    // @ts-ignore
    cursor: 'pointer',
  },
  menuText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    fontWeight: '500',
  },
});
