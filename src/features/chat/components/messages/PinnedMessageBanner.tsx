/**
 * Pinned Message Banner
 * Баннер для отображения закрепленных сообщений в верхней части чата
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { Message } from '../../types/chat.types';
import { decodeFileName } from '../../utils/file.utils';
import { FileTypeIcon } from '@shared/components/common/FileTypeIcon';
import { isImageFile, isVideoFile, replaceLocalhostWithIP } from '../../utils/message.utils';
import { getThumbnailUrl } from '../../utils/thumbnail.utils';
import { stripFormatting } from '../../utils/formatting';
import Avatar from '@shared/components/common/Avatar';

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const isScrolling = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentIndexRef = useRef(currentIndex);
  const pendingIndexChange = useRef(false); // Флаг отложенной смены индекса
  const prevIsLoading = useRef(isLoading); // Предыдущее значение isLoading

  // Синхронизируем ref с state
  currentIndexRef.current = currentIndex;

  // Загружаем sessionId для авторизованных запросов к превью
  useEffect(() => {
    const loadSessionId = async () => {
      const id = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      setSessionId(id);
    };
    loadSessionId();
  }, []);

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

  const getMessagePreview = (message: Message): { text: string; icon?: string; thumbnailUrl?: string; attachmentFileName?: string } => {
    // Если есть текст, показываем его (без маркеров форматирования)
    if (message.content && message.content.trim().length > 0) {
      const stripped = stripFormatting(message.content);
      const text = stripped.length > 50
        ? stripped.substring(0, 50) + '...'
        : stripped;
      return { text };
    }

    // Если текста нет, но есть вложения
    if (message.attachments && message.attachments.length > 0) {
      const attachment = message.attachments[0];
      const mt = attachment.mime_type || attachment.file_type || '';
      const isImage = isImageFile(mt);
      const isVideo = isVideoFile(mt);

      // Для фото/видео показываем "Фото"/"Видео" и превью
      if (isImage || isVideo) {
        const label = isImage ? 'Фото' : 'Видео';
        const thumbnailUrl = getThumbnailUrl(attachment, 'small');
        const extra = message.attachments.length > 1 ? ` и ещё ${message.attachments.length - 1}` : '';
        return {
          text: label + extra,
          thumbnailUrl: replaceLocalhostWithIP(thumbnailUrl),
        };
      }

      // Для остальных файлов — иконка и имя файла
      let fileName = decodeFileName(attachment.file_name);
      if (fileName.length > 30) {
        const ext = fileName.split('.').pop();
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        fileName = nameWithoutExt.substring(0, 25) + '...' + (ext ? `.${ext}` : '');
      }

      if (message.attachments.length === 1) {
        return { text: fileName, attachmentFileName: attachment.file_name };
      } else {
        return { text: `${fileName} и ещё ${message.attachments.length - 1}`, attachmentFileName: attachment.file_name };
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

        <View style={styles.messageRow}>
          {(() => {
            const preview = getMessagePreview(currentMessage);
            return (
              <>
                {preview.thumbnailUrl ? (
                  <View style={styles.thumbnailWrapper}>
                    <Image
                      source={{
                        uri: preview.thumbnailUrl,
                        headers: sessionId ? { 'X-Session-ID': sessionId } : undefined,
                      }}
                      style={styles.thumbnail}
                    />
                    {currentMessage.sender && (
                      <Avatar
                        name={currentMessage.sender.name}
                        imageUrl={currentMessage.sender.avatar}
                        thumbnailUrl={currentMessage.sender.avatar_thumbnail}
                        userId={currentMessage.sender.id}
                        size={12}
                        style={styles.avatarOnThumbnail}
                      />
                    )}
                  </View>
                ) : (
                  <>
                    {preview.attachmentFileName ? (
                      <View style={styles.fileIcon}>
                        <FileTypeIcon fileName={preview.attachmentFileName} size={14} />
                      </View>
                    ) : preview.icon ? (
                      <Ionicons
                        name={preview.icon as any}
                        size={16}
                        color={theme.primary}
                        style={styles.fileIcon}
                      />
                    ) : null}
                    {currentMessage.sender && (
                      <Avatar
                        name={currentMessage.sender.name}
                        imageUrl={currentMessage.sender.avatar}
                        thumbnailUrl={currentMessage.sender.avatar_thumbnail}
                        userId={currentMessage.sender.id}
                        size={22}
                        style={styles.senderAvatar}
                      />
                    )}
                  </>
                )}
                <Text
                  style={[styles.messageText, dynamicStyles.messageText]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {preview.text}
                </Text>
              </>
            );
          })()}
          {hasMore && (
            <TouchableOpacity onPress={handleNext} style={styles.counterButton}>
              <Text style={[styles.counterText, dynamicStyles.counterText]}>
                {currentIndex + 1}/{sortedMessages.length}
              </Text>
              <Ionicons name="chevron-down" size={14} color={theme.textSecondary} style={styles.chevronIcon} />
            </TouchableOpacity>
          )}
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  counterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginLeft: 8,
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
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  thumbnail: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  avatarOnThumbnail: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderWidth: 1.5,
    borderColor: 'white',
    borderRadius: 8,
  },
  fileIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  senderAvatar: {
    marginRight: 6,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  unpinButton: {
    marginLeft: 8,
    padding: 4,
  },
});
