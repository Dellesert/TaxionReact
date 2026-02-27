import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationStore } from '@shared/store/animationStore';
import { Message } from '../../types/chat.types';
import { User } from '../../../../types/user.types';
import { MessageAttachments } from '../attachments/MessageAttachments';
import PollMessageCard from './PollMessageCard';
import TaskMessageCard from './TaskMessageCard';
import { MessageStatus } from '../common/MessageStatus';
import { formatTime, parseForwardedMessage, getDisplayContent, getOriginalSenderName, isVideoFile, isImageFile, replaceLocalhostWithIP } from '../../utils/message.utils';
import { FormattedText } from '../common/FormattedText';
import { stripFormatting } from '../../utils/formatting';
import { decodeFileName } from '../../utils/file.utils';
import { LinkPreviewCard } from './LinkPreviewCard';
import { MessageReactions } from './MessageReactions';
import { getThumbnailUrl } from '../../utils/thumbnail.utils';
import { Image } from 'expo-image';
import { useAuthStore } from '@shared/store/authStore';

// ─── Single emoji detection ──────────────────────────────────────────────────

const SINGLE_EMOJI_REGEX = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}][\u200D\uFE0F\u{1F3FB}-\u{1F3FF}\u{1F1E0}-\u{1F1FF}\u20E3\p{Emoji_Presentation}\p{Extended_Pictographic}]*$/u;

function isSingleEmoji(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > 20) return false;
  return SINGLE_EMOJI_REGEX.test(trimmed);
}

function getCommentsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'комментарий';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'комментария';
  return 'комментариев';
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  isHighlighted: boolean;
  sender: User | null;
  replySender: User | null;
  imageUrls: { [key: number]: string };
  currentUserId?: number;
  onLongPress?: () => void;
  onRightClick?: (position: { x: number; y: number }) => void;
  onDoubleTap?: () => void;
  onPollPress?: (pollId: number) => void;
  onTaskPress?: (taskId: number) => void;
  onReplyPress?: (messageId: number) => void;
  onImagePress: (imageUrl: string) => void;
  onVideoPress?: (videoUrl: string, thumbnailUrl?: string) => void;
  messageBubbleRef?: React.RefObject<View>;
  onRetryMessage?: (messageId: number) => void;
  onCancelUpload?: (messageId: number, attachmentIndex: number) => void;
  onReactionPress?: (emoji: string) => void;
  isVisible?: boolean;
  isSavedChat?: boolean;
  isForwarded?: boolean;
  searchQuery?: string;
  onThreadPress?: (messageId: number) => void;
  isChannel?: boolean;
}

/**
 * Компонент пузыря сообщения с контентом
 */
const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  isHighlighted,
  sender,
  replySender,
  imageUrls,
  currentUserId,
  onLongPress,
  onRightClick,
  onDoubleTap,
  onPollPress,
  onTaskPress,
  onReplyPress,
  onImagePress,
  onVideoPress,
  messageBubbleRef,
  onRetryMessage,
  onCancelUpload,
  onReactionPress,
  isVisible = true,
  isSavedChat = false,
  isForwarded = false,
  searchQuery,
  onThreadPress,
  isChannel = false,
}) => {
  const { theme } = useTheme();
  const reduceAnimations = useAnimationStore((s) => s.reduceAnimations);

  // Высота блока ответа — для абсолютного позиционирования (чтобы reply не расширял пузырь)
  const [replyHeight, setReplyHeight] = useState(50);

  // SessionId для авторизованных запросов к превью
  const sessionId = useAuthStore((s) => s.sessionId);

  // ⚠️ ВАЖНО: Фильтруем контент удалённых сообщений!
  // Бэкенд больше НЕ фильтрует контент в WebSocket
  const displayContent = getDisplayContent(message, currentUserId);

  // Парсим пересланное сообщение (поддерживает как новый, так и старый формат)
  const { header: forwardHeader, content: messageContent } = parseForwardedMessage(message);

  // Получаем имя оригинального отправителя для нового формата
  const originalSenderName = message.is_forwarded ? getOriginalSenderName(message) : null;

  // Проверяем, является ли сообщение задачей (встроенной в текст)
  const taskDataMatch = displayContent.match(/\[TASK_DATA\](.*?)\[\/TASK_DATA\]/s);
  const isTaskMessage = taskDataMatch !== null;
  let parsedTaskData = null;

  if (isTaskMessage && taskDataMatch) {
    try {
      parsedTaskData = JSON.parse(taskDataMatch[1]);
    } catch (e) {
      console.error('Failed to parse task data from message:', e);
    }
  }

  // Вычисляем цвет фона с учетом подсветки (для Android нужен непрозрачный цвет)
  const getHighlightedBgColor = () => {
    // На Android полупрозрачные цвета накладываются некорректно,
    // поэтому используем более насыщенный цвет
    if (Platform.OS === 'android') {
      return theme.primary + '60';
    }
    return theme.primary + '40';
  };

  // Мемоизируем динамические стили для снижения ре-рендеров на 10-15%
  const dynamicStyles = useMemo(() => StyleSheet.create({
    messageBubble: {
      backgroundColor: theme.messageOther,
    },
    ownMessageBubble: {
      backgroundColor: theme.messageOwn,
    },
    highlightedBubble: {
      backgroundColor: getHighlightedBgColor(),
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
      color: theme.textTertiary,
    },
  }), [theme]);

  // Проверяем, является ли сообщение карточкой (опрос или задача)
  const isCardMessage = (message.message_type === 'poll' && message.poll_data) ||
                        (message.message_type === 'task' && message.task_data) ||
                        (isTaskMessage && parsedTaskData);

  // Одиночный эмодзи без текста → крупное отображение без пузыря
  const isEmojiOnly = useMemo(() => {
    if (message.is_deleted || isCardMessage) return false;
    if (message.attachments && message.attachments.length > 0) return false;
    return isSingleEmoji(messageContent);
  }, [messageContent, message.is_deleted, message.attachments, isCardMessage]);

  // Медиа без текста (фото/видео) → убираем фон пузыря, время и галочки на медиа
  const isMediaOnly = useMemo(() => {
    if (message.is_deleted || isCardMessage) return false;
    if (!message.attachments || message.attachments.length === 0) return false;
    const hasText = messageContent && messageContent.trim().length > 0;
    if (hasText) return false;
    return message.attachments.every(a => {
      const mt = a.mime_type || a.file_type || '';
      return isVideoFile(mt) || isImageFile(mt);
    });
  }, [message.attachments, message.is_deleted, messageContent, isCardMessage]);

  // Анимация подсветки для медиа/эмодзи (пульсация масштаба + рамка вместо фона)
  const isMediaHighlight = isHighlighted && (isMediaOnly || isEmojiOnly);
  const highlightProgress = useSharedValue(0);

  useEffect(() => {
    if (isMediaHighlight) {
      if (reduceAnimations) {
        highlightProgress.value = 0;
      } else {
        highlightProgress.value = withSequence(
          withTiming(1, { duration: 250 }),
          withTiming(0.2, { duration: 250 }),
          withTiming(0.8, { duration: 200 }),
          withTiming(0, { duration: 500 }),
        );
      }
    } else {
      highlightProgress.value = 0;
    }
  }, [isMediaHighlight]);

  const mediaScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + highlightProgress.value * 0.04 }],
  }));


  // Right-click context menu for web/Electron
  const handleContextMenu = useCallback((e: any) => {
    e.preventDefault();
    if (onRightClick) {
      onRightClick({ x: e.pageX ?? e.nativeEvent?.pageX ?? 0, y: e.pageY ?? e.nativeEvent?.pageY ?? 0 });
    }
  }, [onRightClick]);

  const bubbleRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && onRightClick && bubbleRef.current) {
      const node = bubbleRef.current as unknown as HTMLElement;
      node.addEventListener('contextmenu', handleContextMenu);
      return () => node.removeEventListener('contextmenu', handleContextMenu);
    }
    return undefined;
  }, [onRightClick, handleContextMenu]);

  // Double-tap detection
  const lastTapRef = useRef(0);

  const handlePress = useCallback(() => {
    const now = Date.now();
    if (onDoubleTap && now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      onDoubleTap();
      return;
    }
    lastTapRef.current = now;

    // Normal press logic
    if (message.message_type === 'poll' && message.poll_data) {
      onPollPress?.(message.poll_data.poll_id);
    }
    if (message.message_type === 'task' && message.task_data) {
      onTaskPress?.(message.task_data.task_id);
    }
    if (isTaskMessage && parsedTaskData) {
      onTaskPress?.(parsedTaskData.task_id);
    }
  }, [onDoubleTap, message.message_type, message.poll_data, message.task_data, onPollPress, onTaskPress, isTaskMessage, parsedTaskData]);

  // Проверяем, есть ли вложения (любого типа) — для width: 100% контейнера
  const hasAttachments = message.attachments && message.attachments.length > 0;

  const bubble = (
    <TouchableOpacity
      ref={(node: any) => {
        if (messageBubbleRef) (messageBubbleRef as any).current = node;
        (bubbleRef as any).current = node;
      }}
      activeOpacity={0.9}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[
        styles.messageBubble,
        !isCardMessage && dynamicStyles.messageBubble,
        // В Избранном: свои сообщения как "own", пересланные как "other"
        isSavedChat && !isForwarded && !isCardMessage && [styles.ownMessageBubble, dynamicStyles.ownMessageBubble],
        isSavedChat && isForwarded && styles.savedForwardedBubble,
        !isSavedChat && isOwnMessage && !isCardMessage && [styles.ownMessageBubble, dynamicStyles.ownMessageBubble],
        isHighlighted && !isMediaOnly && !isEmojiOnly && [styles.highlightedBubble, dynamicStyles.highlightedBubble],
        isCardMessage && { backgroundColor: 'transparent', padding: 0 },
        isEmojiOnly && { backgroundColor: 'transparent', padding: 0 },
        isMediaOnly && { backgroundColor: 'transparent', padding: 0 },
      ]}
    >
      {/* Уголок - просто используем ::before/::after эффект через позиционирование */}

      {/* Заголовок пересланного сообщения (скрыт в Избранном) */}
      {(message.is_forwarded || forwardHeader) && !isSavedChat && (
        <View style={[
          styles.forwardHeader,
          { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)' }
        ]}>
          <Ionicons name="arrow-redo-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.forwardHeaderText, { color: theme.primary }]}>
            {originalSenderName ? `Переслано от ${originalSenderName}` : forwardHeader?.replace('📩 ', '')}
          </Text>
        </View>
      )}

      {/* Имя отправителя для чужих сообщений (не показываем если уже показан заголовок пересылки) */}
      {!isOwnMessage && !forwardHeader && !message.is_forwarded && (
        <View style={styles.senderNameRow}>
          <Text style={[styles.senderName, dynamicStyles.senderName]}>
            {sender?.name || `User ${message.sender_id}`}
          </Text>
          {(sender?.role === 'admin' || sender?.role === 'super_admin') && (
            <Ionicons name="shield-checkmark" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
          )}
          {sender?.role === 'department_head' && (
            <Ionicons name="shield-checkmark" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />
          )}
        </View>
      )}

      {/* Цитируемое сообщение (если это ответ) — абсолютное позиционирование,
           чтобы reply не определял ширину пузыря */}
      {message.reply_to && (
        <View style={{ position: 'relative', minHeight: replyHeight, minWidth: 150, marginBottom: 8, overflow: 'hidden', borderRadius: 8 }}>
          <TouchableOpacity
            style={[styles.replyContainer, { position: 'absolute', top: 0, left: 0, right: 0, marginBottom: 0, backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)', borderLeftColor: theme.primary }]}
            onLayout={(e) => setReplyHeight(e.nativeEvent.layout.height)}
            onPress={() => onReplyPress?.(message.reply_to_id!)}
            activeOpacity={0.7}
          >
            <View style={styles.replyContentRow}>
              <View style={styles.replyTextBlock}>
                <Text style={[styles.replySender, { color: theme.primary }]} numberOfLines={1}>
                  {replySender?.name || message.reply_to.sender?.name || `User ${message.reply_to.sender_id}`}
                </Text>
                {message.reply_to.content && message.reply_to.content.trim().length > 0 ? (
                  <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={2}>
                    {stripFormatting(message.reply_to.content)}
                  </Text>
                ) : message.reply_to.attachments && message.reply_to.attachments.length > 0 ? (
                  <View style={styles.replyMediaLabel}>
                    {(() => {
                      const att = message.reply_to.attachments[0];
                      const mt = att.mime_type || att.file_type || '';
                      const isImage = isImageFile(mt);
                      const isVideo = isVideoFile(mt);
                      const count = message.reply_to.attachments.length;
                      const label = isVideo ? 'Видео' : isImage ? 'Фото' : decodeFileName(att.file_name);
                      const extra = count > 1 ? ` и ещё ${count - 1}` : '';
                      return (
                        <>
                          <Ionicons
                            name={isVideo ? 'videocam' : isImage ? 'image' : 'document'}
                            size={14}
                            color={theme.textSecondary}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {label}{extra}
                          </Text>
                        </>
                      );
                    })()}
                  </View>
                ) : (
                  <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={1}>
                    Сообщение
                  </Text>
                )}
              </View>
              {/* Превью фото/видео справа */}
              {message.reply_to.attachments && message.reply_to.attachments.length > 0 && (() => {
                const att = message.reply_to.attachments[0];
                const mt = att.mime_type || att.file_type || '';
                if (!isImageFile(mt) && !isVideoFile(mt)) return null;
                const thumbUrl = replaceLocalhostWithIP(getThumbnailUrl(att, 'small'));
                return (
                  <Image
                    source={{
                      uri: thumbUrl,
                      headers: sessionId ? { 'X-Session-ID': sessionId } : undefined,
                    }}
                    style={styles.replyThumbnail}
                    contentFit="cover"
                  />
                );
              })()}
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Контент сообщения */}
      <View style={styles.messageContentRow}>
        {message.is_deleted ? (
          <>
            <View style={styles.deletedMessageContainer}>
              <Ionicons name="trash-outline" size={16} color={theme.textTertiary} style={{ opacity: 0.6, marginRight: 6 }} />
              <Text style={[styles.deletedText, { color: theme.textTertiary, opacity: 0.6 }]}>
                Сообщение удалено
              </Text>
            </View>
          </>
        ) : message.message_type === 'poll' && message.poll_data ? (
          <>
            <PollMessageCard
              pollData={message.poll_data}
              onPress={() => onPollPress?.(message.poll_data!.poll_id)}
            />
          </>
        ) : message.message_type === 'task' && message.task_data ? (
          <>
            <TaskMessageCard
              taskData={message.task_data}
              onPress={() => onTaskPress?.(message.task_data!.task_id)}
            />
          </>
        ) : isTaskMessage && parsedTaskData ? (
          <>
            <TaskMessageCard
              taskData={parsedTaskData}
              onPress={() => onTaskPress?.(parsedTaskData.task_id)}
            />
          </>
        ) : (
          <>
            <View style={[styles.messageContent, hasAttachments && styles.messageContentWithFiles]}>
              {/* Render attachments (photos/videos) above text */}
              {!!(message.attachments && message.attachments.length > 0) && (
                <MessageAttachments
                  attachments={message.attachments}
                  imageUrls={imageUrls}
                  onImagePress={onImagePress}
                  onVideoPress={onVideoPress}
                  onLongPress={onLongPress}
                  isVisible={isVisible}
                  isMediaOnly={isMediaOnly}
                  chatMessage={message}
                  isOwnMessage={isOwnMessage}
                  currentUserId={currentUserId}
                  onRetryMessage={onRetryMessage}
                  onCancelUpload={onCancelUpload}
                />
              )}

              {messageContent && messageContent.length > 0 && (
                <FormattedText
                  text={messageContent}
                  style={[
                    styles.messageText,
                    dynamicStyles.messageText,
                    isOwnMessage && dynamicStyles.ownMessageText,
                    isEmojiOnly && { fontSize: 96, lineHeight: 110 },
                  ]}
                  searchQuery={searchQuery}
                />
              )}

              {/* Link preview card */}
              {message.link_preview && !message.is_deleted && (
                <LinkPreviewCard
                  linkPreview={message.link_preview}
                  isOwnMessage={isOwnMessage}
                />
              )}
            </View>
          </>
        )}
      </View>

      {/* Footer: скрываем полностью для video-only без реакций */}
      {(!isMediaOnly || (!message.is_deleted && message.reactions && message.reactions.length > 0)) && (
        <View style={[styles.messageFooter, isCardMessage && styles.cardMessageFooter, isMediaOnly && { marginTop: 4 }]}>
          {/* Reactions on the left */}
          {!message.is_deleted && message.reactions && message.reactions.length > 0 && onReactionPress && (
            <MessageReactions
              reactions={message.reactions}
              currentUserId={currentUserId}
              isOwnMessage={isOwnMessage}
              onReactionPress={onReactionPress}
            />
          )}

          {!isMediaOnly && (
            <View style={styles.footerRight}>
              {!!(message.is_edited && !message.is_deleted) && (
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
              <Text
                style={[
                  styles.time,
                  dynamicStyles.time,
                  isOwnMessage && dynamicStyles.ownTime,
                ]}
              >
                {formatTime(message.created_at)}
              </Text>
              {!isCardMessage && (
                <MessageStatus
                  message={message}
                  isOwnMessage={isOwnMessage}
                  currentUserId={currentUserId}
                  onRetry={onRetryMessage}
                />
              )}
            </View>
          )}
        </View>
      )}

      {/* Thread comment badge for channel root posts */}
      {isChannel && !message.thread_root_id && !message.is_deleted && onThreadPress && (
        <TouchableOpacity
          style={styles.threadBadge}
          activeOpacity={0.7}
          onPress={() => onThreadPress(message.id)}
        >
          <Ionicons name="chatbubble-outline" size={16} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.threadBadgeText, { color: theme.primary }]}>
            {`${message.thread_reply_count || 0} ${getCommentsLabel(message.thread_reply_count || 0)}`}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  // Для медиа/эмодзи: анимированная обёртка с пульсацией масштаба + рамка
  if (isMediaOnly || isEmojiOnly) {
    return (
      <Animated.View style={mediaScaleStyle}>
        {bubble}
      </Animated.View>
    );
  }

  return bubble;
};

const styles = StyleSheet.create({
  messageBubble: {
    borderRadius: 18,
    borderBottomLeftRadius: 3,
    padding: 12,
  },
  ownMessageBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 3,
    borderBottomLeftRadius: 23,

  },
  senderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  messageContent: {
    flexShrink: 1,
  },
  messageContentWithFiles: {
    width: '100%',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 14,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
    marginLeft: 'auto',
  },
  cardMessageFooter: {
    justifyContent: 'flex-end',
    marginTop: 4,
    marginLeft: 0,
  },
  time: {
    fontSize: 11,
    color: '#ccc',
  },
  edited: {
    fontSize: 11,
    marginRight: 4,
    fontStyle: 'italic',
    color: '#aaa',
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
  replyContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  replyTextBlock: {
    flex: 1,
    marginRight: 8,
  },
  replyMediaLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 4,
  },
  highlightedBubble: {
    // Тень только для iOS, на Android elevation создает белый фон
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        // Без elevation - используем только цвет фона для подсветки
      },
    }),
  },
  forwardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  forwardHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  deletedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  savedMessageBubble: {
    maxWidth: '100%',
    width: '100%',
    borderRadius: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  savedForwardedBubble: {
    // Пересланные сообщения в Избранном - стиль "чужого" сообщения
    borderRadius: 18,
    borderBottomLeftRadius: 3,
  },
  savedForwardHeader: {
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  threadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  threadBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

// Мемоизация MessageBubble для оптимизации производительности
export const MessageBubble = React.memo(MessageBubbleComponent, (prevProps, nextProps) => {
  // Основные поля сообщения
  if (
    prevProps.message.id !== nextProps.message.id ||
    prevProps.message.content !== nextProps.message.content ||
    prevProps.message.is_edited !== nextProps.message.is_edited ||
    prevProps.message.is_deleted !== nextProps.message.is_deleted ||
    prevProps.message.is_forwarded !== nextProps.message.is_forwarded ||
    prevProps.message.original_sender_id !== nextProps.message.original_sender_id ||
    prevProps.isHighlighted !== nextProps.isHighlighted ||
    prevProps.isOwnMessage !== nextProps.isOwnMessage ||
    prevProps.isSavedChat !== nextProps.isSavedChat ||
    prevProps.isForwarded !== nextProps.isForwarded ||
    prevProps.searchQuery !== nextProps.searchQuery ||
    prevProps.message.link_preview?.url !== nextProps.message.link_preview?.url ||
    prevProps.message.thread_reply_count !== nextProps.message.thread_reply_count ||
    prevProps.message.thread_root_id !== nextProps.message.thread_root_id ||
    prevProps.isChannel !== nextProps.isChannel ||
    prevProps.onThreadPress !== nextProps.onThreadPress
  ) {
    return false;
  }

  // Сравниваем вложения
  const prevAttachments = prevProps.message.attachments || [];
  const nextAttachments = nextProps.message.attachments || [];

  if (prevAttachments.length !== nextAttachments.length) {
    return false;
  }

  // Сравниваем ID вложений
  const prevAttachmentIds = prevAttachments.map(a => a.id).join(',');
  const nextAttachmentIds = nextAttachments.map(a => a.id).join(',');

  if (prevAttachmentIds !== nextAttachmentIds) {
    return false;
  }

  // Сравниваем sender
  if (prevProps.sender?.id !== nextProps.sender?.id ||
      prevProps.sender?.name !== nextProps.sender?.name ||
      prevProps.sender?.role !== nextProps.sender?.role) {
    return false;
  }

  // Сравниваем replySender
  if (prevProps.replySender?.id !== nextProps.replySender?.id) {
    return false;
  }

  // Проверяем статусы отправки и прогресс загрузки
  if ((prevProps.message as any).sending !== (nextProps.message as any).sending ||
      (prevProps.message as any).failed !== (nextProps.message as any).failed ||
      (prevProps.message as any).upload_progress !== (nextProps.message as any).upload_progress) {
    return false;
  }

  // Проверяем read_by (для зелёных галочек "прочитано")
  const prevReadBy = prevProps.message.read_by || [];
  const nextReadBy = nextProps.message.read_by || [];
  if (prevReadBy.length !== nextReadBy.length) {
    return false;
  }

  // Проверяем read_receipts
  const prevReceipts = prevProps.message.read_receipts || [];
  const nextReceipts = nextProps.message.read_receipts || [];
  if (prevReceipts.length !== nextReceipts.length) {
    return false;
  }

  // Проверяем delivered_to (для серых галочек "доставлено")
  const prevDelivered = prevProps.message.delivered_to || [];
  const nextDelivered = nextProps.message.delivered_to || [];
  if (prevDelivered.length !== nextDelivered.length) {
    return false;
  }

  // Сравниваем реакции
  const prevReactions = prevProps.message.reactions || [];
  const nextReactions = nextProps.message.reactions || [];
  if (prevReactions.length !== nextReactions.length) {
    return false;
  }
  const prevReactionKey = prevReactions.map(r => `${r.id}-${r.emoji}`).sort().join(',');
  const nextReactionKey = nextReactions.map(r => `${r.id}-${r.emoji}`).sort().join(',');
  if (prevReactionKey !== nextReactionKey) {
    return false;
  }

  // Все проверки пройдены - не нужно обновлять
  return true;
});
