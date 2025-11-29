/**
 * Poll Prefetch Hook
 * Предзагрузка данных опросов при навигации для мгновенного отображения
 */

import { useCallback, useRef } from 'react';
import { usePollStore } from '@shared/store/pollStore';
import * as pollApi from '@/features/polls/api/poll.api';
import { Poll } from '@/features/polls/types/poll.types';

// Кэш для отслеживания уже загруженных данных
const prefetchedPolls = new Set<number>();
const prefetchInProgress = new Map<number, Promise<Poll | null>>();

// Кэш опросов по ID для быстрого доступа
const pollCache = new Map<number, { poll: Poll; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

interface UsePollPrefetchOptions {
  /** Задержка перед началом предзагрузки (мс) */
  delay?: number;
  /** Предзагружать результаты опроса */
  prefetchResults?: boolean;
}

/**
 * Хук для предзагрузки данных опроса
 */
export const usePollPrefetch = (options: UsePollPrefetchOptions = {}) => {
  const {
    delay = 150,
    prefetchResults = false,
  } = options;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Получить опрос из кэша (если не устарел)
   */
  const getCachedPoll = useCallback((pollId: number): Poll | null => {
    const cached = pollCache.get(pollId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.poll;
    }
    return null;
  }, []);

  /**
   * Сохранить опрос в кэш
   */
  const cachePoll = useCallback((poll: Poll) => {
    pollCache.set(poll.id, { poll, timestamp: Date.now() });
  }, []);

  /**
   * Предзагрузка данных опроса
   */
  const prefetchPoll = useCallback(async (pollId: number): Promise<Poll | null> => {
    // Проверяем, загружен ли уже
    if (prefetchedPolls.has(pollId)) {
      return getCachedPoll(pollId);
    }

    // Проверяем, идёт ли уже загрузка
    if (prefetchInProgress.has(pollId)) {
      return prefetchInProgress.get(pollId) || null;
    }

    // Проверяем кэш
    const cached = getCachedPoll(pollId);
    if (cached) {
      prefetchedPolls.add(pollId);
      return cached;
    }

    const prefetchPromise = (async () => {
      try {
        // Загружаем опрос
        const poll = await pollApi.getPoll(pollId);

        // Кэшируем
        cachePoll(poll);
        prefetchedPolls.add(pollId);

        // Предзагружаем результаты если нужно
        if (prefetchResults && poll.show_results && poll.user_has_voted) {
          try {
            await pollApi.getPollResults(pollId);
          } catch (error) {
            console.warn(`[PollPrefetch] Failed to prefetch results for poll ${pollId}:`, error);
          }
        }

        return poll;
      } catch (error) {
        console.warn(`[PollPrefetch] Failed to prefetch poll ${pollId}:`, error);
        return null;
      } finally {
        prefetchInProgress.delete(pollId);
      }
    })();

    prefetchInProgress.set(pollId, prefetchPromise);
    return prefetchPromise;
  }, [getCachedPoll, cachePoll, prefetchResults]);

  /**
   * Предзагрузка с задержкой (для hover/focus)
   */
  const prefetchPollDelayed = useCallback((pollId: number) => {
    // Отменяем предыдущую задержку
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      prefetchPoll(pollId);
    }, delay);
  }, [prefetchPoll, delay]);

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
    prefetchedPolls.clear();
    pollCache.clear();
  }, []);

  /**
   * Инвалидация конкретного опроса в кэше
   */
  const invalidatePoll = useCallback((pollId: number) => {
    prefetchedPolls.delete(pollId);
    pollCache.delete(pollId);
  }, []);

  return {
    prefetchPoll,
    prefetchPollDelayed,
    cancelPrefetch,
    clearPrefetchCache,
    invalidatePoll,
    getCachedPoll,
    cachePoll,
  };
};

/**
 * Хук для предзагрузки следующих страниц списка опросов
 */
export const usePollListPrefetch = () => {
  const prefetchNextPageRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Предзагрузка следующей страницы списка опросов
   */
  const prefetchNextPollPage = useCallback(async (
    currentOffset: number,
    limit: number = 20
  ) => {
    const { polls, total, appendPolls } = usePollStore.getState();

    // Не загружаем если уже все загружено
    if (polls.length >= total) {
      return;
    }

    // Предзагружаем с задержкой
    if (prefetchNextPageRef.current) {
      clearTimeout(prefetchNextPageRef.current);
    }

    prefetchNextPageRef.current = setTimeout(async () => {
      try {
        const response = await pollApi.getPolls(
          undefined,
          limit,
          currentOffset + polls.length
        );

        if (response.polls && response.polls.length > 0) {
          appendPolls(response.polls);
        }
      } catch (error) {
        console.warn(`[PollListPrefetch] Failed to prefetch polls:`, error);
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
    prefetchNextPollPage,
    cancelPagePrefetch,
  };
};

/**
 * Получить опрос из глобального кэша
 */
export const getPollFromCache = (pollId: number): Poll | null => {
  const cached = pollCache.get(pollId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.poll;
  }
  return null;
};

/**
 * Очистить весь кэш опросов (для logout/cleanup)
 */
export const clearAllPollCache = () => {
  prefetchedPolls.clear();
  pollCache.clear();
  prefetchInProgress.clear();
};

export default usePollPrefetch;
