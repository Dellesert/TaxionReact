/**
 * Custom Hook: useChatDetailData
 * Управление данными чата и сообщениями
 */

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useChatStore } from '@shared/store/chatStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { isValidChatId, shouldShowLoading } from '../utils/chatDetailHelpers';

interface UseChatDetailDataReturn {
  chat: any | undefined;
  messages: any[];
  isLoading: boolean;
  shouldShowLoadingScreen: boolean;
}

export const useChatDetailData = (chatId: number): UseChatDetailDataReturn => {
  const { showError } = useNotification();
  const hasLoadedRef = useRef(false);

  // Оптимизация: используем один селектор с мемоизацией для получения всех данных
  // Это снижает количество подписок и ре-рендеров
  const { loadMessages, chats, isLoading, chatMessages } = useChatStore(
    useCallback((state) => ({
      loadMessages: state.loadMessages,
      chats: state.chats,
      isLoading: state.isLoading,
      chatMessages: state.messages[chatId] || [],
    }), [chatId])
  );

  // Memoized chat object
  const chat = useMemo(
    () => chats.find((c) => c.id === chatId),
    [chats, chatId]
  );

  // Load messages on mount
  useEffect(() => {
    if (isValidChatId(chatId) && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadMessages(chatId).catch((error) => {
        console.error('Failed to load messages:', error);
        showError('Не удалось загрузить сообщения');
        hasLoadedRef.current = false;
      });
    }
  }, [chatId, loadMessages, showError]);

  // ОПТИМИЗАЦИЯ: Предзагрузка пользователей после загрузки сообщений
  // Вместо 50 отдельных запросов - загружаем батчем в кэш
  // ВАЖНО: Если бэкенд возвращает sender - эта логика не будет использоваться!
  useEffect(() => {
    if (chatMessages.length > 0) {
      // Импортируем кэш пользователей динамически
      import('@shared/store/userCache').then(({ useUserCache }) => {
        // Собираем все уникальные ID пользователей, которые нужно загрузить
        const userIds = new Set<number>();

        chatMessages.forEach((message) => {
          // Добавляем sender_id если sender не пришел с бэкенда
          if (message.sender_id && !message.sender) {
            userIds.add(message.sender_id);
          }

          // Добавляем reply sender_id если есть
          if (message.reply_to?.sender_id && !message.reply_to?.sender) {
            userIds.add(message.reply_to.sender_id);
          }
        });

        // Предзагружаем пользователей батчем (только если sender отсутствует)
        if (userIds.size > 0) {
          useUserCache.getState().preloadUsers(Array.from(userIds));
        }
      });
    }
  }, [chatMessages, chatId]);

  const shouldShowLoadingScreen = shouldShowLoading(isLoading, chatMessages.length);

  return {
    chat,
    messages: chatMessages,
    isLoading,
    shouldShowLoadingScreen,
  };
};
