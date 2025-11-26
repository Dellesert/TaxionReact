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

  // ОПТИМИЗАЦИЯ: Удалена предзагрузка пользователей
  // Backend теперь всегда возвращает sender в сообщениях, поэтому кэш не нужен

  const shouldShowLoadingScreen = shouldShowLoading(isLoading, chatMessages.length);

  return {
    chat,
    messages: chatMessages,
    isLoading,
    shouldShowLoadingScreen,
  };
};
