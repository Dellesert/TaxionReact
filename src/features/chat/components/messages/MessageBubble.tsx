import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Message } from '../../types/chat.types';
import { User } from '../../../../types/user.types';
import { MessageAttachments } from '../attachments/MessageAttachments';
import PollMessageCard from './PollMessageCard';
import TaskMessageCard from './TaskMessageCard';
import { MessageStatus } from '../common/MessageStatus';
import { formatTime, parseForwardedMessage, getDisplayContent, getOriginalSenderName } from '../../utils/message.utils';
import { LinkifiedText } from '../common/LinkifiedText';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  isHighlighted: boolean;
  sender: User | null;
  replySender: User | null;
  imageUrls: { [key: number]: string };
  currentUserId?: number;
  onLongPress: () => void;
  onPollPress?: (pollId: number) => void;
  onTaskPress?: (taskId: number) => void;
  onReplyPress?: (messageId: number) => void;
  onImagePress: (imageUrl: string) => void;
  messageBubbleRef: React.RefObject<View>;
  onRetryMessage?: (messageId: number) => void;
  isVisible?: boolean;
  isSavedChat?: boolean;
  isForwarded?: boolean;
  searchQuery?: string;
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
  onPollPress,
  onTaskPress,
  onReplyPress,
  onImagePress,
  messageBubbleRef,
  onRetryMessage,
  isVisible = true,
  isSavedChat = false,
  isForwarded = false,
  searchQuery,
}) => {
  const { theme } = useTheme();

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

  // Проверяем, есть ли файловые вложения (не изображения)
  const hasFileAttachments = message.attachments?.some(a => {
    const mimeType = a.mime_type || a.file_type || '';
    return !mimeType.startsWith('image/');
  });

  return (
    <TouchableOpacity
      ref={messageBubbleRef}
      activeOpacity={0.9}
      onPress={() => {
        // Если это опрос - открываем его
        if (message.message_type === 'poll' && message.poll_data) {
          onPollPress?.(message.poll_data.poll_id);
        }
        // Если это задача (из message_type) - открываем её
        if (message.message_type === 'task' && message.task_data) {
          onTaskPress?.(message.task_data.task_id);
        }
        // Если это задача (встроенная в текст) - открываем её
        if (isTaskMessage && parsedTaskData) {
          onTaskPress?.(parsedTaskData.task_id);
        }
      }}
      onLongPress={onLongPress}
      style={[
        styles.messageBubble,
        !isCardMessage && dynamicStyles.messageBubble,
        // В Избранном: свои сообщения как "own", пересланные как "other"
        isSavedChat && !isForwarded && !isCardMessage && [styles.ownMessageBubble, dynamicStyles.ownMessageBubble],
        isSavedChat && isForwarded && styles.savedForwardedBubble,
        !isSavedChat && isOwnMessage && !isCardMessage && [styles.ownMessageBubble, dynamicStyles.ownMessageBubble],
        isHighlighted && [styles.highlightedBubble, dynamicStyles.highlightedBubble],
        isCardMessage && { backgroundColor: 'transparent', padding: 0 },
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
        <Text style={[styles.senderName, dynamicStyles.senderName]}>
          {sender?.name || `User ${message.sender_id}`}
        </Text>
      )}

      {/* Цитируемое сообщение (если это ответ) */}
      {message.reply_to && (
        <TouchableOpacity
          style={[styles.replyContainer, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)', borderLeftColor: theme.primary }]}
          onPress={() => onReplyPress?.(message.reply_to_id!)}
          activeOpacity={0.7}
        >
          <Text style={[styles.replySender, { color: theme.primary }]} numberOfLines={1}>
            {replySender?.name || message.reply_to.sender?.name || `User ${message.reply_to.sender_id}`}
          </Text>
          <Text style={[styles.replyText, { color: theme.textSecondary }]} numberOfLines={2}>
            {message.reply_to.content}
          </Text>
        </TouchableOpacity>
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
            <View style={[styles.messageContent, hasFileAttachments && styles.messageContentWithFiles]}>
              {messageContent && messageContent.length > 0 && (
                <LinkifiedText
                  text={messageContent}
                  style={[
                    styles.messageText,
                    dynamicStyles.messageText,
                    isOwnMessage && dynamicStyles.ownMessageText,
                  ]}
                  searchQuery={searchQuery}
                />
              )}

              {/* Render attachments below text */}
              {!!(message.attachments && message.attachments.length > 0) && (
                <MessageAttachments
                  attachments={message.attachments}
                  imageUrls={imageUrls}
                  onImagePress={onImagePress}
                  onLongPress={onLongPress}
                  isVisible={isVisible}
                />
              )}
            </View>
          </>
        )}
      </View>

      <View style={[styles.messageFooter, isCardMessage && styles.cardMessageFooter]}>
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  messageBubble: {
    maxWidth: '70%',
    minWidth: '35%',
    borderRadius: 18,
    borderBottomLeftRadius: 3,
    padding: 12,
  },
  ownMessageBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 3,
    borderBottomLeftRadius: 23,

  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
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
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  cardMessageFooter: {
    justifyContent: 'flex-end',
    marginTop: 4,
    marginLeft: 0,
  },
  time: {
    fontSize: 11,
    color: '#ccc',
    transform: [{ translateY: 3 }],
  },
  edited: {
    fontSize: 11,
    marginRight: 4,
    fontStyle: 'italic',
    color: '#aaa',
    transform: [{ translateY: 3 }],
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
    prevProps.searchQuery !== nextProps.searchQuery
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
      prevProps.sender?.name !== nextProps.sender?.name) {
    return false;
  }

  // Сравниваем replySender
  if (prevProps.replySender?.id !== nextProps.replySender?.id) {
    return false;
  }

  // Проверяем статусы отправки (для MessageStatus)
  if ((prevProps.message as any).sending !== (nextProps.message as any).sending ||
      (prevProps.message as any).failed !== (nextProps.message as any).failed) {
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

  // Все проверки пройдены - не нужно обновлять
  return true;
});
