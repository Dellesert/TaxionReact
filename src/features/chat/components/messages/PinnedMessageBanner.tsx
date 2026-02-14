/**
 * Pinned Message Banner
 * Баннер для отображения закрепленных сообщений в верхней части чата
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Message } from '../../types/chat.types';
import { getFileIcon } from '../../utils/file.utils';

interface PinnedMessageBannerProps {
  pinnedMessages: Message[];
  chatType?: 'private' | 'group' | 'channel';
  currentUserRole?: 'owner' | 'admin' | 'member';
  onPress: (messageId: number) => void;
  onUnpin: (messageId: number) => void;
  isLoading?: boolean;
}

export const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({
  pinnedMessages,
  chatType,
  currentUserRole,
  onPress,
  onUnpin,
  isLoading,
}) => {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const isScrolling = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(currentIndex);
  const pendingIndexChange = useRef(false); // Флаг отложенной смены индекса
  const prevIsLoading = useRef(isLoading); // Предыдущее значение isLoading

  // Синхронизируем ref с state
  currentIndexRef.current = currentIndex;

  // Переключаем на следующее сообщение когда загрузка завершена (isLoading: true → false)
  useEffect(() => {
    // Если загрузка завершилась и есть отложенная смена индекса
    if (prevIsLoading.current === true && isLoading === false && pendingIndexChange.current) {
      pendingIndexChange.current = false;
      setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
    }
    prevIsLoading.current = isLoading;
  }, [isLoading, pinnedMessages.length]);

  // Check if user can unpin messages
  const canUnpin = React.useMemo(() => {
    // In private chats, anyone can unpin
    if (chatType === 'private') {
      return true;
    }
    // In group chats, only owner and admin can unpin
    if (chatType === 'group') {
      return currentUserRole === 'owner' || currentUserRole === 'admin';
    }
    // Default to false if chat type is unknown
    return false;
  }, [chatType, currentUserRole]);

  // Не показываем баннер если нет закрепленных сообщений
  if (pinnedMessages.length === 0) {
    return null;
  }

  // Сортируем по дате создания (новые первыми)
  const sortedMessages = [...pinnedMessages].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Показываем текущее закрепленное сообщение
  const currentMessage = sortedMessages[currentIndex] || sortedMessages[0];
  const hasMore = sortedMessages.length > 1;

  // Переключение на следующее закрепленное сообщение
  const handleNext = useCallback((e: any) => {
    e.stopPropagation();
    if (hasMore) {
      setCurrentIndex((prev) => (prev + 1) % sortedMessages.length);
    }
  }, [hasMore, sortedMessages.length]);

  // Обработка клика на баннер: показать текущее сообщение и переключить на следующее после завершения
  const handleBannerPress = useCallback(() => {
    // Если уже идёт скролл - игнорируем повторные нажатия
    if (isScrolling.current) {
      return;
    }

    // Получаем актуальное текущее сообщение через ref
    const actualIndex = currentIndexRef.current;
    const actualMessage = sortedMessages[actualIndex] || sortedMessages[0];
    const messageIdToScrollTo = actualMessage.id;

    console.log('[PinnedBanner] Press:', {
      actualIndex,
      messageIdToScrollTo,
      sortedMessagesIds: sortedMessages.map(m => m.id),
      currentIndexRef: currentIndexRef.current,
    });

    // Устанавливаем флаг блокировки
    isScrolling.current = true;

    // Очищаем предыдущий таймаут если был
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Прокручиваем к сообщению
    onPress(messageIdToScrollTo);

    // Отмечаем что нужно переключить на следующее сообщение после завершения скролла
    if (hasMore) {
      pendingIndexChange.current = true;
    }

    // Снимаем блокировку через 800мс (время на анимацию скролла)
    // Также переключаем индекс если isLoading не используется (fallback)
    scrollTimeoutRef.current = setTimeout(() => {
      isScrolling.current = false;
      // Fallback: если pendingIndexChange всё ещё true (isLoading не сработал),
      // переключаем здесь
      if (pendingIndexChange.current && hasMore) {
        pendingIndexChange.current = false;
        setCurrentIndex((prev) => (prev + 1) % sortedMessages.length);
      }
    }, 1000);
  }, [hasMore, sortedMessages, onPress]);

  // Открепить текущее сообщение
  const handleUnpin = (e: any) => {
    e.stopPropagation();
    onUnpin(currentMessage.id);
    // Если это было последнее сообщение в списке, возвращаемся к началу
    if (currentIndex >= sortedMessages.length - 1) {
      setCurrentIndex(0);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    messageText: {
      color: theme.text,
    },
    senderText: {
      color: theme.primary,
    },
    counterText: {
      color: theme.textSecondary,
    },
  });

  const getMessagePreview = (message: Message): { text: string; icon?: string } => {
    // Если есть текст, показываем его
    if (message.content && message.content.trim().length > 0) {
      const text = message.content.length > 50
        ? message.content.substring(0, 50) + '...'
        : message.content;
      return { text };
    }

    // Если текста нет, но есть вложения, показываем информацию о файле
    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0];
      const icon = getFileIcon(attachment.mime_type || attachment.file_type || '', attachment.file_name);

      // Обрезаем длинное название файла
      let fileName = attachment.file_name;
      if (fileName.length > 30) {
        const ext = fileName.split('.').pop();
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        fileName = nameWithoutExt.substring(0, 25) + '...' + (ext ? `.${ext}` : '');
      }

      if (message.attachments.length === 1) {
        return {
          text: fileName,
          icon
        };
      } else {
        return {
          text: `${fileName} и ещё ${message.attachments.length - 1}`,
          icon
        };
      }
    }

    // Если ни текста, ни вложений нет
    return { text: 'Сообщение без содержимого' };
  };

  return (
    <TouchableOpacity
      style={[styles.container, dynamicStyles.container]}
      onPress={handleBannerPress}
      activeOpacity={0.7}
      disabled={isLoading}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.primary} style={styles.icon} />
        ) : (
          <Ionicons name="pin" size={20} color={theme.primary} style={styles.icon} />
        )}

        <View style={styles.textContainer}>
          <View style={styles.header}>
            <Text style={[styles.titleText, dynamicStyles.senderText]} numberOfLines={1}>
              Закреплённое сообщение
            </Text>
            {hasMore && (
              <TouchableOpacity onPress={handleNext} style={styles.counterButton}>
                <Text style={[styles.counterText, dynamicStyles.counterText]}>
                  {currentIndex + 1}/{sortedMessages.length}
                </Text>
                <Ionicons name="chevron-down" size={14} color={theme.textSecondary} style={styles.chevronIcon} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.messageRow}>
            {(() => {
              const preview = getMessagePreview(currentMessage);
              return (
                <>
                  {preview.icon && (
                    <Ionicons
                      name={preview.icon as any}
                      size={16}
                      color={theme.primary}
                      style={styles.fileIcon}
                    />
                  )}
                  <Text
                    style={[styles.messageText, dynamicStyles.messageText]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {currentMessage.sender?.name ? `${currentMessage.sender.name}: ` : ''}{preview.text}
                  </Text>
                </>
              );
            })()}
          </View>
        </View>

        {/* Кнопка открепления (только для пользователей с правами) */}
        {canUnpin && (
          <TouchableOpacity
            onPress={handleUnpin}
            style={styles.unpinButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    minHeight: 60,
    zIndex: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  counterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chevronIcon: {
    marginLeft: 4,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  unpinButton: {
    marginLeft: 12,
    padding: 4,
    marginTop: 2,
  },
});
