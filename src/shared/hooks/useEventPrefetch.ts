/**
 * Event Prefetch Hook
 * Предзагрузка данных событий при навигации для мгновенного отображения
 */

import { useCallback, useRef } from 'react';
import * as calendarApi from '@/features/calendar/api/calendar.api';
import { Event } from '@/features/calendar/types/calendar.types';

// Кэш для отслеживания уже загруженных данных
const prefetchedEvents = new Set<number>();
const prefetchInProgress = new Map<number, Promise<Event | null>>();

// Кэш событий по ID для быстрого доступа
const eventCache = new Map<number, { event: Event; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

interface UseEventPrefetchOptions {
  /** Задержка перед началом предзагрузки (мс) */
  delay?: number;
}

/**
 * Хук для предзагрузки данных события
 */
export const useEventPrefetch = (options: UseEventPrefetchOptions = {}) => {
  const { delay = 150 } = options;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Получить событие из кэша (если не устарело)
   */
  const getCachedEvent = useCallback((eventId: number): Event | null => {
    const cached = eventCache.get(eventId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.event;
    }
    return null;
  }, []);

  /**
   * Сохранить событие в кэш
   */
  const cacheEvent = useCallback((event: Event) => {
    eventCache.set(event.id, { event, timestamp: Date.now() });
  }, []);

  /**
   * Предзагрузка данных события
   */
  const prefetchEvent = useCallback(async (eventId: number): Promise<Event | null> => {
    // Проверяем, загружено ли уже
    if (prefetchedEvents.has(eventId)) {
      return getCachedEvent(eventId);
    }

    // Проверяем, идёт ли уже загрузка
    if (prefetchInProgress.has(eventId)) {
      return prefetchInProgress.get(eventId) || null;
    }

    // Проверяем кэш
    const cached = getCachedEvent(eventId);
    if (cached) {
      prefetchedEvents.add(eventId);
      return cached;
    }

    const prefetchPromise = (async () => {
      try {
        // Загружаем событие
        const event = await calendarApi.getEvent(eventId);

        // Кэшируем
        cacheEvent(event);
        prefetchedEvents.add(eventId);

        return event;
      } catch (error) {
        console.warn(`[EventPrefetch] Failed to prefetch event ${eventId}:`, error);
        return null;
      } finally {
        prefetchInProgress.delete(eventId);
      }
    })();

    prefetchInProgress.set(eventId, prefetchPromise);
    return prefetchPromise;
  }, [getCachedEvent, cacheEvent]);

  /**
   * Предзагрузка с задержкой (для hover/focus)
   */
  const prefetchEventDelayed = useCallback((eventId: number) => {
    // Отменяем предыдущую задержку
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      prefetchEvent(eventId);
    }, delay);
  }, [prefetchEvent, delay]);

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
    prefetchedEvents.clear();
    eventCache.clear();
  }, []);

  /**
   * Инвалидация конкретного события в кэше
   */
  const invalidateEvent = useCallback((eventId: number) => {
    prefetchedEvents.delete(eventId);
    eventCache.delete(eventId);
  }, []);

  return {
    prefetchEvent,
    prefetchEventDelayed,
    cancelPrefetch,
    clearPrefetchCache,
    invalidateEvent,
    getCachedEvent,
    cacheEvent,
  };
};

/**
 * Получить событие из глобального кэша
 */
export const getEventFromCache = (eventId: number): Event | null => {
  const cached = eventCache.get(eventId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.event;
  }
  return null;
};

/**
 * Очистить весь кэш событий (для logout/cleanup)
 */
export const clearAllEventCache = () => {
  prefetchedEvents.clear();
  eventCache.clear();
  prefetchInProgress.clear();
};

export default useEventPrefetch;
