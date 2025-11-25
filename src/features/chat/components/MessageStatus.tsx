import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { Message } from '../types/chat.types';

interface MessageStatusProps {
  message: Message;
  isOwnMessage: boolean;
  currentUserId?: number;
}

/**
 * Компонент для отображения статуса сообщения (отправка, доставлено, прочитано)
 */
export const MessageStatus: React.FC<MessageStatusProps> = ({
  message,
  isOwnMessage,
  currentUserId,
}) => {
  const { theme } = useTheme();

  if (!isOwnMessage || message.is_deleted) return null;

  // Если сообщение еще отправляется
  if (message.sending) {
    return (
      <ActivityIndicator
        size="small"
        color={theme.textTertiary}
        style={styles.statusIcon}
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
        size={16}
        color="#4CAF50"
        style={styles.statusIcon}
      />
    );
  }

  // Если доставлено хотя бы одному (две серые галочки)
  if (hasDelivered && message.id) {
    return (
      <Ionicons
        name="checkmark-done"
        size={16}
        color={theme.textTertiary}
        style={styles.statusIcon}
      />
    );
  }

  // Если отправлено на сервер (одна серая галочка)
  if (message.id) {
    return (
      <Ionicons
        name="checkmark"
        size={16}
        color={theme.textTertiary}
        style={styles.statusIcon}
      />
    );
  }

  return null;
};

const styles = StyleSheet.create({
  statusIcon: {
    marginLeft: 4,
    transform: [{ translateY: 5 }],
  },
});
