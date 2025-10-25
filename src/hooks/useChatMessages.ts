import { useMemo } from 'react';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';

/**
 * Хук для работы с сообщениями чата
 */
export const useChatMessages = (chatId: number) => {
  const allMessages = useChatStore((state) => state.messages);
  const currentUser = useAuthStore((state) => state.user);

  // Инвертируем массив для inverted FlatList [новые -> старые]
  const messages = useMemo(() => {
    const msgs = allMessages[chatId] || [];
    return [...msgs].reverse();
  }, [allMessages, chatId]);

  // Создаем список элементов для отображения (только сообщения)
  const messageListItems = useMemo(() => {
    if (messages.length === 0) return [];
    return messages.map((message) => ({ type: 'message' as const, data: message }));
  }, [messages]);

  // Создаем ключ для extraData чтобы FlatList перерисовывался при изменениях
  const messagesKey = useMemo(() => {
    return messages.map(m => `${m.id}-${m.read_receipts?.length || 0}-${m.delivered_to?.length || 0}`).join(',');
  }, [messages]);

  // Вычисляем индекс первого непрочитанного сообщения и их количество
  const { firstUnreadIndex, unreadCount } = useMemo(() => {
    if (!currentUser || messages.length === 0) {
      return { firstUnreadIndex: -1, unreadCount: 0 };
    }

    let firstIndex = -1;
    let count = 0;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const readReceipts = message.read_receipts || [];
      const hasReadReceipt = readReceipts.some((receipt) => receipt.user_id === currentUser.id);
      const isUnread = message.sender_id !== currentUser.id && !hasReadReceipt;

      if (isUnread) {
        if (firstIndex === -1) {
          firstIndex = i;
        }
        count++;
      }
    }

    return { firstUnreadIndex: firstIndex, unreadCount: count };
  }, [messages, currentUser]);

  return {
    messages,
    messageListItems,
    messagesKey,
    firstUnreadIndex,
    unreadCount,
  };
};
