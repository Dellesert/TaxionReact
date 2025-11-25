/**
 * Custom Hook: useChatDetailData
 * Управление данными чата и сообщениями
 */

import { useEffect, useRef, useMemo } from 'react';
import { useChatStore } from '@store/chatStore';
import { useNotification } from '@contexts/NotificationContext';
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

  // Zustand selectors
  const loadMessages = useChatStore((state) => state.loadMessages);
  const chats = useChatStore((state) => state.chats);
  const isLoading = useChatStore((state) => state.isLoading);
  const chatMessages = useChatStore((state) => state.messages[chatId] || []);

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

  const shouldShowLoadingScreen = shouldShowLoading(isLoading, chatMessages.length);

  return {
    chat,
    messages: chatMessages,
    isLoading,
    shouldShowLoadingScreen,
  };
};
