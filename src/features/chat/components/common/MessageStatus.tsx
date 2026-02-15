import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Message } from '../../types/chat.types';

interface MessageStatusProps {
  message: Message;
  isOwnMessage: boolean;
  currentUserId?: number;
  onRetry?: (messageId: number) => void;
  onDiscard?: (messageId: number) => void;
  compact?: boolean;
}

/**
 * Компонент для отображения статуса сообщения (отправка, доставлено, прочитано)
 * Поддерживает оптимистичные обновления с показом ошибок и повтором отправки
 */
export const MessageStatus: React.FC<MessageStatusProps> = ({
  message,
  isOwnMessage,
  currentUserId,
  onRetry,
  compact = false,
  // onDiscard - может быть использован для кнопки "Отмена" в будущем
}) => {
  const { theme } = useTheme();

  const iconSize = compact ? 12 : 12;
  const iconStyle = styles.compactStatusIcon;
  const iconColor = compact ? '#FFFFFF' : theme.textTertiary;

  if (!isOwnMessage || message.is_deleted) return null;

  // Если сообщение не удалось отправить
  if ((message as any).failed) {
    return (
      <View style={styles.failedContainer}>
        <TouchableOpacity
          onPress={() => onRetry?.(message.id)}
          style={styles.retryButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name="alert-circle"
            size={iconSize}
            color={theme.error || '#FF3B30'}
            style={styles.errorIcon}
          />
          {!compact && (
            <Text style={[styles.retryText, { color: theme.error || '#FF3B30' }]}>
              Повторить
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Если сообщение еще отправляется
  if (message.sending) {
    return (
      <ActivityIndicator
        size="small"
        color={compact ? '#FFFFFF' : theme.textTertiary}
        style={iconStyle}
      />
    );
  }

  // Определяем количество прочитавших (исключая себя)
  const readByArray = message.read_by || [];
  const readReceiptsArray = message.read_receipts || [];
  const deliveredToArray = message.delivered_to || [];

  const readByOthers = readByArray.filter(id => id !== currentUserId);
  const readReceiptsByOthers = readReceiptsArray.filter(r => r.user_id !== currentUserId);

  const hasRead = readByOthers.length > 0 || readReceiptsByOthers.length > 0;
  const hasDelivered = deliveredToArray.length > 0;

  // Если прочитано кем-то (две зелёные галочки)
  if (hasRead) {
    return (
      <Ionicons
        name="checkmark-done"
        size={iconSize}
        color={compact ? '#90EE90' : '#4CAF50'}
        style={iconStyle}
      />
    );
  }

  // Если доставлено хотя бы одному (две серые галочки)
  if (hasDelivered && message.id) {
    return (
      <Ionicons
        name="checkmark-done"
        size={iconSize}
        color={iconColor}
        style={iconStyle}
      />
    );
  }

  // Если отправлено на сервер (одна серая галочка)
  if (message.id) {
    return (
      <Ionicons
        name="checkmark"
        size={iconSize}
        color={iconColor}
        style={iconStyle}
      />
    );
  }

  return null;
};

const styles = StyleSheet.create({
  statusIcon: {
    marginLeft: 3,
    transform: [{ translateY: 2 }],
  },
  compactStatusIcon: {
    marginLeft: 2,
  },
  failedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  errorIcon: {
    marginRight: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
