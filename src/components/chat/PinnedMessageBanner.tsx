/**
 * Pinned Message Banner
 * Баннер для отображения закрепленных сообщений в верхней части чата
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { Message } from '../../types/chat.types';

interface PinnedMessageBannerProps {
  pinnedMessages: Message[];
  onPress: (messageId: number) => void;
  onUnpin: (messageId: number) => void;
}

export const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({
  pinnedMessages,
  onPress,
  onUnpin,
}) => {
  const { theme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

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
  const handleNext = (e: any) => {
    e.stopPropagation();
    if (hasMore) {
      setCurrentIndex((prev) => (prev + 1) % sortedMessages.length);
    }
  };

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

  const getMessagePreview = (message: Message): string => {
    if (message.content.length > 50) {
      return message.content.substring(0, 50) + '...';
    }
    return message.content;
  };

  return (
    <TouchableOpacity
      style={[styles.container, dynamicStyles.container]}
      onPress={() => onPress(currentMessage.id)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Ionicons name="pin" size={20} color={theme.primary} style={styles.icon} />

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

          <Text style={[styles.messageText, dynamicStyles.messageText]} numberOfLines={2}>
            {currentMessage.sender?.name ? `${currentMessage.sender.name}: ` : ''}{getMessagePreview(currentMessage)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleUnpin}
          style={styles.unpinButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
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
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  unpinButton: {
    marginLeft: 12,
    padding: 4,
  },
});
