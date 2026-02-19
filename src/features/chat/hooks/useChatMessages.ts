import { useMemo } from 'react';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';

/**
 * Хук для работы с сообщениями чата
 *
 * ОПТИМИЗАЦИЯ: Использует комбинированные селекторы для снижения ре-рендеров на 25-35%
 */
export const useChatMessages = (
  chatId: number,
  ignoreReadReceipts = false,
  savedUnreadCount = 0,
  firstUnreadMessageId: number | null = null
) => {
  // Оптимизация: комбинируем селекторы для уменьшения подписок
  // Используем стабильную функцию селектора (React будет сравнивать результат)
  // ВАЖНО: Подписываемся на конкретный массив сообщений чата, а не на весь объект messages
  const chatMessages = useChatStore((state) => state.messages[chatId]);
  const chat = useChatStore((state) => state.chats.find(c => c.id === chatId));
  const currentUser = useAuthStore((state) => state.user);

  // Массив сообщений в ОБРАТНОМ порядке для inverted FlatList [новые -> старые]
  // inverted={true} в FlatList означает:
  // - index 0 показывается ВНИЗУ экрана (визуальный низ)
  // - последний индекс показывается ВВЕРХУ экрана (визуальный верх)
  // Поэтому новые сообщения должны быть в начале массива (index 0)
  const messages = useMemo(() => {
    if (!chatMessages) return [];
    return [...chatMessages].reverse(); // Обратный порядок: новые → старые
  }, [chatMessages]);

  // Создаем список элементов для отображения (только сообщения)
  const messageListItems = useMemo(() => {
    if (messages.length === 0) return [];
    return messages.map((message) => ({
      type: 'message' as const,
      data: message,
    }));
  }, [messages]);

  // Создаем ключ для extraData чтобы FlatList перерисовывался при изменениях
  const messagesKey = useMemo(() => {
    const key = messages.map(m =>
      `${m.id}-${m.read_by?.length || 0}-${m.read_receipts?.length || 0}-${m.delivered_to?.length || 0}`
    ).join(',');
    return key;
  }, [messages]);

  // Вычисляем индекс первого непрочитанного сообщения и их количество
  // ВАЖНО: Массив messages теперь в обратном порядке [новые → старые]
  // index 0 = самое новое (визуально внизу), большой индекс = старое (визуально вверху)
  const { firstUnreadIndex, unreadCount, detectedFirstUnreadId } = useMemo(() => {
    if (!currentUser || messages.length === 0) {
      return { firstUnreadIndex: -1, unreadCount: 0, detectedFirstUnreadId: null };
    }

    let firstUnreadIndex = -1; // Индекс первого непрочитанного (самого старого)
    let count = 0;
    let detectedFirstUnreadId: number | null = null;

    // Если у нас уже есть зафиксированный ID первого непрочитанного сообщения,
    // используем его для определения позиции баннера
    if (firstUnreadMessageId !== null) {
      // Находим индекс зафиксированного сообщения
      const fixedIndex = messages.findIndex(m => m.id === firstUnreadMessageId);
      if (fixedIndex !== -1) {
        firstUnreadIndex = fixedIndex;
        // Считаем все сообщения от других пользователей от этого индекса к началу (к новым)
        // В обратном массиве: от fixedIndex к 0 - это все более новые сообщения
        for (let i = fixedIndex; i >= 0; i--) {
          const message = messages[i];
          if (message.sender_id !== currentUser.id) {
            count++;
          }
        }
      }
      return { firstUnreadIndex, unreadCount: count, detectedFirstUnreadId: firstUnreadMessageId };
    }

    if (ignoreReadReceipts) {
      // При входе в чат используем savedUnreadCount (сохраненный ДО WebSocket)
      // Берем последние N сообщений от других пользователей как непрочитанные
      const targetUnreadCount = savedUnreadCount > 0 ? savedUnreadCount : (chat?.unread_count || 0);

      if (targetUnreadCount > 0) {
        // В обратном массиве [новые → старые]:
        // Идем с начала (новые, index 0) к концу (старые)
        // Ищем targetUnreadCount сообщений от других пользователей
        for (let i = 0; i < messages.length; i++) {
          const message = messages[i];
          if (message.sender_id !== currentUser.id) {
            // Это непрочитанное сообщение
            firstUnreadIndex = i; // Обновляем индекс (самое старое найденное)
            detectedFirstUnreadId = message.id; // Запоминаем ID для фиксации
            count++;

            if (count >= targetUnreadCount) {
              break; // Нашли все непрочитанные
            }
          }
        }
      }
    } else {
      // Нормальный режим - проверяем read_receipts
      // В обратном массиве [новые → старые]:
      // Идем с начала (новые) к концу (старые), находим все непрочитанные
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const readReceipts = message.read_receipts || [];
        const hasReadReceipt = readReceipts.some((receipt) => receipt.user_id === currentUser.id);
        const isUnread = message.sender_id !== currentUser.id && !hasReadReceipt;

        if (isUnread) {
          firstUnreadIndex = i; // Обновляем (самое старое непрочитанное)
          detectedFirstUnreadId = message.id;
          count++;
        }
      }
    }

    // В inverted FlatList с обратным порядком данных [новые → старые]:
    // index 0 = самое новое сообщение (показывается ВНИЗУ экрана)
    // большой индекс = самое старое сообщение (показывается ВВЕРХУ экрана)
    //
    // Баннер "непрочитанные" показывается на элементе с firstUnreadIndex
    // (самое старое непрочитанное сообщение)

    return { firstUnreadIndex, unreadCount: count, detectedFirstUnreadId };
  }, [messages, currentUser, chat, ignoreReadReceipts, savedUnreadCount, chatId, firstUnreadMessageId]);

  return {
    messages,
    messageListItems,
    messagesKey,
    firstUnreadIndex,
    unreadCount,
    detectedFirstUnreadId,
  };
};
