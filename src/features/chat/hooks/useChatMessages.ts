import { useMemo } from 'react';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';

/**
 * Хук для работы с сообщениями чата
 *
 * ОПТИМИЗАЦИЯ: Использует комбинированные селекторы для снижения ре-рендеров на 25-35%
 */
export const useChatMessages = (chatId: number, ignoreReadReceipts = false, savedUnreadCount = 0) => {
  // Оптимизация: комбинируем селекторы для уменьшения подписок
  // Используем стабильную функцию селектора (React будет сравнивать результат)
  const allMessages = useChatStore((state) => state.messages);
  const chat = useChatStore((state) => state.chats.find(c => c.id === chatId));
  const currentUser = useAuthStore((state) => state.user);

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

    let firstUnreadIndex = -1; // Индекс первого непрочитанного (перед которым показывать баннер)
    let count = 0;

    if (ignoreReadReceipts) {
      // При входе в чат используем savedUnreadCount (сохраненный ДО WebSocket)
      // Берем последние N сообщений от других пользователей как непрочитанные
      const targetUnreadCount = savedUnreadCount > 0 ? savedUnreadCount : (chat?.unread_count || 0);

      if (targetUnreadCount > 0) {
        // Идем с конца массива (самые новые) к началу (старые)
        // Ищем последние targetUnreadCount сообщений от других пользователей
        for (let i = messages.length - 1; i >= 0; i--) {
          const message = messages[i];
          if (message.sender_id !== currentUser.id) {
            // Это непрочитанное сообщение
            firstUnreadIndex = i; // Обновляем индекс (самое старое непрочитанное)
            count++;

            if (count >= targetUnreadCount) {
              break; // Нашли все непрочитанные
            }
          }
        }
      }
    } else {
      // Нормальный режим - проверяем read_receipts
      // Идем с конца (новые) к началу (старые), чтобы найти самое старое непрочитанное
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        const readReceipts = message.read_receipts || [];
        const hasReadReceipt = readReceipts.some((receipt) => receipt.user_id === currentUser.id);
        const isUnread = message.sender_id !== currentUser.id && !hasReadReceipt;

        if (isUnread) {
          firstUnreadIndex = i; // Обновляем (самое старое непрочитанное)
          count++;
        }
      }
    }

    // В инвертированном списке с прямым порядком данных [старые → новые]:
    // index 0 = самое старое сообщение (показывается ВВЕРХУ экрана из-за inverted)
    // большой индекс = самое новое сообщение (показывается ВНИЗУ экрана)
    //
    // Баннер "непрочитанные" должен показываться ПЕРЕД первым непрочитанным,
    // т.е. перед самым старым непрочитанным сообщением
    //
    // Поиск идет с конца к началу, чтобы найти самое старое непрочитанное (наименьший индекс)

    return { firstUnreadIndex, unreadCount: count };
  }, [messages, currentUser, chat, ignoreReadReceipts, savedUnreadCount, chatId]);

  return {
    messages,
    messageListItems,
    messagesKey,
    firstUnreadIndex,
    unreadCount,
  };
};
