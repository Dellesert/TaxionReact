import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { Message } from '../../types/chat.types';
import { User } from '../../types/user.types';
import { MessageAttachments } from './MessageAttachments';
import PollMessageCard from './PollMessageCard';
import TaskMessageCard from './TaskMessageCard';
import { MessageStatus } from './MessageStatus';
import { formatTime, parseForwardedMessage } from '@utils/message.utils';
import { LinkifiedText } from './LinkifiedText';

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
}

/**
 * Компонент пузыря сообщения с контентом
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
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
}) => {
  const { theme } = useTheme();

  // Парсим пересланное сообщение
  const { header: forwardHeader, content: messageContent } = parseForwardedMessage(message.content);
  const isForwarded = forwardHeader !== null;

  // Проверяем, является ли сообщение задачей (встроенной в текст)
  const taskDataMatch = message.content.match(/\[TASK_DATA\](.*?)\[\/TASK_DATA\]/s);
  const isTaskMessage = taskDataMatch !== null;
  let parsedTaskData = null;

  if (isTaskMessage && taskDataMatch) {
    try {
      parsedTaskData = JSON.parse(taskDataMatch[1]);
    } catch (e) {
      console.error('Failed to parse task data from message:', e);
    }
  }

  const dynamicStyles = StyleSheet.create({
    messageBubble: {
      backgroundColor: theme.messageOther,
    },
    ownMessageBubble: {
      backgroundColor: theme.messageOwn,
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
      color: 'rgba(255, 255, 255, 0.7)',
    },
  });

  // Проверяем, является ли сообщение карточкой (опрос или задача)
  const isCardMessage = (message.message_type === 'poll' && message.poll_data) ||
                        (message.message_type === 'task' && message.task_data) ||
                        (isTaskMessage && parsedTaskData);

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
        isOwnMessage && !isCardMessage && [styles.ownMessageBubble, dynamicStyles.ownMessageBubble],
        isHighlighted && [styles.highlightedBubble, { backgroundColor: theme.primary + '40' }],
        isCardMessage && { backgroundColor: 'transparent', padding: 0 },
      ]}
    >
      {/* Уголок - просто используем ::before/::after эффект через позиционирование */}

      {/* Заголовок пересланного сообщения */}
      {forwardHeader && (
        <View style={[styles.forwardHeader, { backgroundColor: isOwnMessage ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)' }]}>
          <Ionicons name="arrow-redo-outline" size={14} color={theme.primary} style={{ marginRight: 6 }} />
          <Text style={[styles.forwardHeaderText, { color: theme.primary }]}>
            {forwardHeader.replace('📩 ', '')}
          </Text>
        </View>
      )}

      {/* Имя отправителя для чужих сообщений */}
      {!isOwnMessage && !forwardHeader && (
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
            <View style={styles.messageContent}>
              {messageContent && messageContent.length > 0 && (
                <LinkifiedText
                  text={messageContent}
                  style={[
                    styles.messageText,
                    dynamicStyles.messageText,
                    isOwnMessage && dynamicStyles.ownMessageText,
                  ]}
                />
              )}

              {/* Render attachments below text */}
              {!!(message.attachments && message.attachments.length > 0) && (
                <MessageAttachments
                  attachments={message.attachments}
                  imageUrls={imageUrls}
                  onImagePress={onImagePress}
                  onLongPress={onLongPress}
                />
              )}
            </View>
          </>
        )}
      </View>

      <View style={[styles.messageFooter, isCardMessage && styles.cardMessageFooter]}>
        <Text
          style={[
            styles.time,
            dynamicStyles.time,
            isOwnMessage && dynamicStyles.ownTime,
          ]}
        >
          {formatTime(message.created_at)}
        </Text>
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
        {!isCardMessage && (
          <MessageStatus
            message={message}
            isOwnMessage={isOwnMessage}
            currentUserId={currentUserId}
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
    marginLeft: 4,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
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
});
