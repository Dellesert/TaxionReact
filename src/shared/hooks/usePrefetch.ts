/**
 * Prefetch Hook
 * Предзагрузка данных при навигации для мгновенного отображения
 */

import { useCallback, useRef } from 'react';
import { useChatStore } from '@shared/store/chatStore';
import { useUserStore } from '@shared/store/userStore';
import * as chatApi from '@/features/chat/api/chat.api';
import { Message } from '@/features/chat/types/chat.types';

// Кэш для отслеживания уже загруженных данных
const prefetchedChats = new Set<number>();
const prefetchedMessages = new Set<number>();
const prefetchInProgress = new Map<number, Promise<void>>();

interface UsePrefetchOptions {
  /** Предзагружать сообщения при hover/focus на чате */
  prefetchMessages?: boolean;
  /** Количество сообщений для предзагрузки */
  messageLimit?: number;
  /** Задержка перед началом предзагрузки (мс) */
  delay?: number;
}

/**
 * Хук для предзагрузки данных чата
 */
export const useChatPrefetch = (options: UsePrefetchOptions = {}) => {
  const {
    messageLimit = 30,
    delay = 150,
  } = options;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheUsers = useUserStore((state) => state.cacheUsers);

  /**
   * Предзагрузка данных чата (сообщения + участники)
   */
  const prefetchChat = useCallback(async (chatId: number) => {
    // Проверяем, загружен ли уже
    if (prefetchedMessages.has(chatId)) {
      return;
    }

    // Проверяем, идёт ли уже загрузка
    if (prefetchInProgress.has(chatId)) {
      return prefetchInProgress.get(chatId);
    }

    // Проверяем, есть ли уже сообщения в store
    const existingMessages = useChatStore.getState().messages[chatId];
    if (existingMessages && existingMessages.length > 0) {
      prefetchedMessages.add(chatId);
      return;
    }

    const prefetchPromise = (async () => {
      try {
        // Загружаем сообщения в фоне
        const response = await chatApi.getLatestMessages(chatId, {
          limit: messageLimit,
          include_unread_marker: true,
        });

        // Сохраняем в store
        useChatStore.setState((state) => ({
          messages: {
            ...state.messages,
            [chatId]: response.messages,
          },
        }));

        // Кэшируем пользователей из сообщений
        const users = response.messages
          .filter((msg: Message) => msg.sender)
          .map((msg: Message) => msg.sender!);

        if (users.length > 0) {
          cacheUsers(users);
        }

        prefetchedMessages.add(chatId);
      } catch (error) {
        console.warn(`[Prefetch] Failed to prefetch chat ${chatId}:`, error);
      } finally {
        prefetchInProgress.delete(chatId);
      }
    })();

    prefetchInProgress.set(chatId, prefetchPromise);
    return prefetchPromise;
  }, [messageLimit, cacheUsers]);

  /**
   * Предзагрузка с задержкой (для hover/focus)
   */
  const prefetchChatDelayed = useCallback((chatId: number) => {
    // Отменяем предыдущую задержку
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      prefetchChat(chatId);
    }, delay);
  }, [prefetchChat, delay]);

  /**
   * Отмена предзагрузки (при быстром скролле)
   */
  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Очистка кэша предзагрузки (для refresh)
   */
  const clearPrefetchCache = useCallback(() => {
    prefetchedChats.clear();
    prefetchedMessages.clear();
  }, []);

  return {
    prefetchChat,
    prefetchChatDelayed,
    cancelPrefetch,
    clearPrefetchCache,
  };
};

/**
 * Хук для предзагрузки следующих страниц списка
 */
export const useListPrefetch = () => {
  const prefetchNextPageRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Предзагрузка следующей страницы списка чатов
   */
  const prefetchNextChatPage = useCallback(() => {
    const { tabs, currentTab, isLoadingMore } = useChatStore.getState();
    const tabData = tabs[currentTab];

    // Не загружаем если уже идёт загрузка или нет данных
    if (isLoadingMore || !tabData.hasMore || !tabData.loaded) {
      return;
    }

    // Предзагружаем с задержкой чтобы не мешать основному UI
    if (prefetchNextPageRef.current) {
      clearTimeout(prefetchNextPageRef.current);
    }

    prefetchNextPageRef.current = setTimeout(() => {
      const store = useChatStore.getState();
      // Повторная проверка состояния
      if (!store.isLoadingMore && store.tabs[store.currentTab].hasMore) {
        store.loadMoreChats();
      }
    }, 500);
  }, []);

  /**
   * Отмена предзагрузки страницы
   */
  const cancelPagePrefetch = useCallback(() => {
    if (prefetchNextPageRef.current) {
      clearTimeout(prefetchNextPageRef.current);
      prefetchNextPageRef.current = null;
    }
  }, []);

  return {
    prefetchNextChatPage,
    cancelPagePrefetch,
  };
};

/**
 * Хук для предзагрузки данных при скролле к определённой позиции
 */
export const useScrollPrefetch = (threshold: number = 0.7) => {
  const { prefetchNextChatPage, cancelPagePrefetch } = useListPrefetch();

  /**
   * Обработчик скролла - начинает предзагрузку когда пользователь
   * проскроллил 70% списка
   */
  const handleScrollProgress = useCallback((
    visibleIndex: number,
    totalItems: number
  ) => {
    if (totalItems === 0) return;

    const progress = visibleIndex / totalItems;

    if (progress >= threshold) {
      prefetchNextChatPage();
    }
  }, [threshold, prefetchNextChatPage]);

  return {
    handleScrollProgress,
    cancelPagePrefetch,
  };
};

export default useChatPrefetch;
