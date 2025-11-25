import { useMemo } from 'react';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';

/**
 * Хук для работы с сообщениями чата
 */
export const useChatMessages = (chatId: number, ignoreReadReceipts = false, savedUnreadCount = 0) => {
  const allMessages = useChatStore((state) => state.messages);
  const currentUser = useAuthStore((state) => state.user);
  const chat = useChatStore((state) => state.chats.find(c => c.id === chatId));

  // Массив сообщений в прямом порядке для inverted списка [старые -> новые]
  // inverted={true} переворачивает ВИЗУАЛЬНО, поэтому:
  // - индекс 0 (старое сообщение) показывается ВВЕРХУ
  // - последний индекс (новое сообщение) показывается ВНИЗУ
  const messages = useMemo(() => {
    const msgs = allMessages[chatId] || [];
    return [...msgs]; // Прямой порядок: старые → новые
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

    let firstIndex = -1; // Самое новое непрочитанное (наименьший индекс)
    let lastIndex = -1;  // Самое старое непрочитанное (наибольший индекс)
    let count = 0;

    if (ignoreReadReceipts) {
      // При входе в чат используем savedUnreadCount (сохраненный ДО WebSocket)
      // Берем последние N сообщений от других пользователей как непрочитанные
      const targetUnreadCount = savedUnreadCount > 0 ? savedUnreadCount : (chat?.unread_count || 0);

      if (targetUnreadCount > 0) {
        let foundUnread = 0;
        // Идем с начала (самые новые сообщения)
        for (let i = 0; i < messages.length && foundUnread < targetUnreadCount; i++) {
          const message = messages[i];
          if (message.sender_id !== currentUser.id) {
            if (firstIndex === -1) {
              firstIndex = i;
            }
            lastIndex = i;
            foundUnread++;
            count++;
          }
        }
      }
    } else {
      // Нормальный режим - проверяем read_receipts
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const readReceipts = message.read_receipts || [];
        const hasReadReceipt = readReceipts.some((receipt) => receipt.user_id === currentUser.id);
        const isUnread = message.sender_id !== currentUser.id && !hasReadReceipt;

        if (isUnread) {
          if (firstIndex === -1) {
            firstIndex = i;
          }
          lastIndex = i;
          count++;
        }
      }
    }

    // В инвертированном списке с прямым порядком данных [старые → новые]:
    // index 0 = самое старое сообщение (показывается ВВЕРХУ экрана)
    // большой индекс = самое новое сообщение (показывается ВНИЗУ экрана)
    // firstIndex = первое встреченное непрочитанное (меньший индекс, старое)
    // lastIndex = последнее встреченное непрочитанное (больший индекс, новое)
    // Для скролла к баннеру "непрочитанные" нужен firstIndex (самое старое непрочитанное)
    return { firstUnreadIndex: firstIndex, unreadCount: count };
  }, [messages, currentUser, chat, ignoreReadReceipts, savedUnreadCount, chatId]);

  return {
    messages,
    messageListItems,
    messagesKey,
    firstUnreadIndex,
    unreadCount,
  };
};
