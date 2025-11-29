/**
 * Optimistic Event Hook
 * Мгновенный UI response при операциях с событиями с откатом при ошибке
 */

import { useCallback } from 'react';
import { useCalendarStore } from '@shared/store/calendarStore';
import { Event, CreateEventDto, UpdateEventDto, EventParticipantStatus } from '@/features/calendar/types/calendar.types';
import * as calendarApi from '@/features/calendar/api/calendar.api';
import { useAuthStore } from '@shared/store/authStore';

// Временный ID счётчик для оптимистичных событий
let tempEventIdCounter = -1;

// Хранилище для отката
const eventSnapshots = new Map<number, { event: Event; rangeKey: string }>();
const pendingOperations = new Map<number, {
  type: 'create' | 'update' | 'status' | 'delete';
  originalData?: any;
  timestamp: number;
}>();

// Таймауты для автоматического rollback
const rollbackTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
const MAX_PENDING_TIME = 30000; // 30 секунд

interface UseOptimisticEventOptions {
  /** Таймаут для автоматического rollback (мс) */
  rollbackTimeout?: number;
  /** Callback при успехе */
  onSuccess?: (event: Event) => void;
  /** Callback при ошибке */
  onError?: (error: Error, eventId: number) => void;
}

/**
 * Генерирует ключ диапазона для события на основе даты начала
 */
const getRangeKeyForEvent = (event: Event | CreateEventDto): string => {
  const startDate = new Date(event.start_time);
  const year = startDate.getFullYear();
  const month = startDate.getMonth();
  // Используем месячный диапазон как ключ
  return `${year}-${month}`;
};

/**
 * Хук для оптимистичных обновлений событий
 */
export const useOptimisticEvent = (options: UseOptimisticEventOptions = {}) => {
  const {
    rollbackTimeout = MAX_PENDING_TIME,
    onSuccess,
    onError,
  } = options;

  const { user } = useAuthStore();

  /**
   * Сохранить снэпшот события для отката
   */
  const saveSnapshot = useCallback((event: Event, rangeKey: string) => {
    eventSnapshots.set(event.id, { event: { ...event }, rangeKey });
  }, []);

  /**
   * Откатить изменения события
   */
  const rollbackEvent = useCallback((eventId: number) => {
    const snapshot = eventSnapshots.get(eventId);
    if (!snapshot) return;

    const { event, rangeKey } = snapshot;

    useCalendarStore.setState((state) => {
      const events = state.eventsByRange[rangeKey] || [];
      const eventIndex = events.findIndex(e => e.id === eventId);

      if (eventIndex === -1) {
        // Событие было удалено - восстанавливаем
        return {
          eventsByRange: {
            ...state.eventsByRange,
            [rangeKey]: [...events, event],
          },
        };
      }

      // Восстанавливаем оригинальное состояние
      const updatedEvents = [...events];
      updatedEvents[eventIndex] = event;

      return {
        eventsByRange: {
          ...state.eventsByRange,
          [rangeKey]: updatedEvents,
        },
      };
    });

    // Очистка
    eventSnapshots.delete(eventId);
    pendingOperations.delete(eventId);
    const timeout = rollbackTimeouts.get(eventId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeouts.delete(eventId);
    }
  }, []);

  /**
   * Оптимистичное обновление статуса участия
   */
  const updateStatusOptimistic = useCallback(async (
    event: Event,
    newStatus: EventParticipantStatus
  ): Promise<Event | null> => {
    const rangeKey = getRangeKeyForEvent(event);

    // Сохраняем снэпшот
    saveSnapshot(event, rangeKey);

    // Оптимистично обновляем UI
    useCalendarStore.setState((state) => {
      const events = state.eventsByRange[rangeKey] || [];
      const eventIndex = events.findIndex(e => e.id === event.id);

      if (eventIndex === -1) return state;

      const updatedEvent: Event = {
        ...event,
        user_status: newStatus,
        participants: event.participants?.map(p =>
          p.user_id === user?.id
            ? { ...p, status: newStatus, responded_at: new Date().toISOString() }
            : p
        ),
        updated_at: new Date().toISOString(),
      };

      const updatedEvents = [...events];
      updatedEvents[eventIndex] = updatedEvent;

      return {
        eventsByRange: {
          ...state.eventsByRange,
          [rangeKey]: updatedEvents,
        },
      };
    });

    // Устанавливаем таймаут для rollback
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticEvent] Timeout for event ${event.id}, rolling back`);
      rollbackEvent(event.id);
      onError?.(new Error('Timeout'), event.id);
    }, rollbackTimeout);
    rollbackTimeouts.set(event.id, timeout);

    // Отправляем на сервер
    try {
      const updatedEvent = await calendarApi.updateParticipantStatus(event.id, { status: newStatus });

      // Очищаем таймаут
      clearTimeout(timeout);
      rollbackTimeouts.delete(event.id);
      eventSnapshots.delete(event.id);

      // Обновляем store реальными данными
      useCalendarStore.setState((state) => {
        const events = state.eventsByRange[rangeKey] || [];
        const eventIndex = events.findIndex(e => e.id === updatedEvent.id);

        if (eventIndex !== -1) {
          const updatedEvents = [...events];
          updatedEvents[eventIndex] = updatedEvent;
          return {
            eventsByRange: {
              ...state.eventsByRange,
              [rangeKey]: updatedEvents,
            },
          };
        }
        return state;
      });

      onSuccess?.(updatedEvent);
      return updatedEvent;
    } catch (error: any) {
      console.error('[OptimisticEvent] Failed to update status:', error);

      // Откатываем
      rollbackEvent(event.id);
      onError?.(error, event.id);
      return null;
    }
  }, [user, saveSnapshot, rollbackEvent, rollbackTimeout, onSuccess, onError]);

  /**
   * Оптимистичное обновление события
   */
  const updateEventOptimistic = useCallback(async (
    event: Event,
    updates: UpdateEventDto
  ): Promise<Event | null> => {
    const rangeKey = getRangeKeyForEvent(event);

    // Сохраняем снэпшот
    saveSnapshot(event, rangeKey);

    // Оптимистично обновляем UI
    useCalendarStore.setState((state) => {
      const events = state.eventsByRange[rangeKey] || [];
      const eventIndex = events.findIndex(e => e.id === event.id);

      if (eventIndex === -1) return state;

      const updatedEvent: Event = {
        ...event,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const updatedEvents = [...events];
      updatedEvents[eventIndex] = updatedEvent;

      return {
        eventsByRange: {
          ...state.eventsByRange,
          [rangeKey]: updatedEvents,
        },
      };
    });

    // Устанавливаем таймаут для rollback
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticEvent] Timeout for event ${event.id}, rolling back`);
      rollbackEvent(event.id);
      onError?.(new Error('Timeout'), event.id);
    }, rollbackTimeout);
    rollbackTimeouts.set(event.id, timeout);

    // Отправляем на сервер
    try {
      const updatedEvent = await calendarApi.updateEvent(event.id, updates);

      // Очищаем таймаут
      clearTimeout(timeout);
      rollbackTimeouts.delete(event.id);
      eventSnapshots.delete(event.id);

      // Обновляем store реальными данными
      const newRangeKey = getRangeKeyForEvent(updatedEvent);
      useCalendarStore.setState((state) => {
        // Если диапазон изменился - удаляем из старого и добавляем в новый
        if (newRangeKey !== rangeKey) {
          const oldEvents = (state.eventsByRange[rangeKey] || []).filter(e => e.id !== updatedEvent.id);
          const newEvents = state.eventsByRange[newRangeKey] || [];
          return {
            eventsByRange: {
              ...state.eventsByRange,
              [rangeKey]: oldEvents,
              [newRangeKey]: [updatedEvent, ...newEvents],
            },
          };
        }

        const events = state.eventsByRange[rangeKey] || [];
        const eventIndex = events.findIndex(e => e.id === updatedEvent.id);

        if (eventIndex !== -1) {
          const updatedEvents = [...events];
          updatedEvents[eventIndex] = updatedEvent;
          return {
            eventsByRange: {
              ...state.eventsByRange,
              [rangeKey]: updatedEvents,
            },
          };
        }
        return state;
      });

      onSuccess?.(updatedEvent);
      return updatedEvent;
    } catch (error: any) {
      console.error('[OptimisticEvent] Failed to update event:', error);

      // Откатываем
      rollbackEvent(event.id);
      onError?.(error, event.id);
      return null;
    }
  }, [saveSnapshot, rollbackEvent, rollbackTimeout, onSuccess, onError]);

  /**
   * Оптимистичное создание события
   */
  const createEventOptimistic = useCallback(async (
    data: CreateEventDto
  ): Promise<Event | null> => {
    const tempId = tempEventIdCounter--;
    const rangeKey = getRangeKeyForEvent(data);

    // Создаём временное событие
    const tempEvent: Event = {
      id: tempId,
      title: data.title,
      description: data.description,
      start_time: data.start_time,
      end_time: data.end_time,
      all_day: data.all_day || false,
      location: data.location,
      type: data.type || 'personal',
      color: data.color || '#3B82F6',
      is_private: data.is_private || false,
      is_recurring: data.is_recurring || false,
      recurrence_rule: data.recurrence_rule,
      created_by: user?.id || 0,
      creator: user || undefined,
      participant_count: data.participant_ids?.length || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Оптимистично добавляем в UI
    useCalendarStore.setState((state) => {
      const events = state.eventsByRange[rangeKey] || [];
      return {
        eventsByRange: {
          ...state.eventsByRange,
          [rangeKey]: [tempEvent, ...events],
        },
      };
    });

    // Устанавливаем таймаут для удаления временного события
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticEvent] Timeout for temp event ${tempId}, removing`);
      useCalendarStore.setState((state) => {
        const events = state.eventsByRange[rangeKey] || [];
        return {
          eventsByRange: {
            ...state.eventsByRange,
            [rangeKey]: events.filter(e => e.id !== tempId),
          },
        };
      });
      onError?.(new Error('Timeout'), tempId);
    }, rollbackTimeout);
    rollbackTimeouts.set(tempId, timeout);

    // Отправляем на сервер
    try {
      const createdEvent = await calendarApi.createEvent(data);

      // Очищаем таймаут
      clearTimeout(timeout);
      rollbackTimeouts.delete(tempId);

      // Заменяем временное событие реальным
      const finalRangeKey = getRangeKeyForEvent(createdEvent);
      useCalendarStore.setState((state) => {
        // Удаляем временное событие
        const oldEvents = (state.eventsByRange[rangeKey] || []).filter(e => e.id !== tempId);

        // Если диапазон изменился
        if (finalRangeKey !== rangeKey) {
          const newEvents = state.eventsByRange[finalRangeKey] || [];
          return {
            eventsByRange: {
              ...state.eventsByRange,
              [rangeKey]: oldEvents,
              [finalRangeKey]: [createdEvent, ...newEvents],
            },
          };
        }

        return {
          eventsByRange: {
            ...state.eventsByRange,
            [rangeKey]: [createdEvent, ...oldEvents],
          },
        };
      });

      onSuccess?.(createdEvent);
      return createdEvent;
    } catch (error: any) {
      console.error('[OptimisticEvent] Failed to create event:', error);

      // Удаляем временное событие
      clearTimeout(timeout);
      rollbackTimeouts.delete(tempId);
      useCalendarStore.setState((state) => {
        const events = state.eventsByRange[rangeKey] || [];
        return {
          eventsByRange: {
            ...state.eventsByRange,
            [rangeKey]: events.filter(e => e.id !== tempId),
          },
        };
      });

      onError?.(error, tempId);
      return null;
    }
  }, [user, rollbackTimeout, onSuccess, onError]);

  /**
   * Оптимистичное удаление события
   */
  const deleteEventOptimistic = useCallback(async (event: Event): Promise<boolean> => {
    const rangeKey = getRangeKeyForEvent(event);

    // Сохраняем снэпшот
    saveSnapshot(event, rangeKey);

    // Оптимистично удаляем из UI
    useCalendarStore.setState((state) => {
      const events = state.eventsByRange[rangeKey] || [];
      return {
        eventsByRange: {
          ...state.eventsByRange,
          [rangeKey]: events.filter(e => e.id !== event.id),
        },
      };
    });

    // Устанавливаем таймаут для rollback
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticEvent] Timeout for delete event ${event.id}, rolling back`);
      rollbackEvent(event.id);
      onError?.(new Error('Timeout'), event.id);
    }, rollbackTimeout);
    rollbackTimeouts.set(event.id, timeout);

    // Отправляем на сервер
    try {
      await calendarApi.deleteEvent(event.id);

      // Очищаем
      clearTimeout(timeout);
      rollbackTimeouts.delete(event.id);
      eventSnapshots.delete(event.id);

      return true;
    } catch (error: any) {
      console.error('[OptimisticEvent] Failed to delete event:', error);

      // Откатываем
      rollbackEvent(event.id);
      onError?.(error, event.id);
      return false;
    }
  }, [saveSnapshot, rollbackEvent, rollbackTimeout, onError]);

  return {
    updateStatusOptimistic,
    updateEventOptimistic,
    createEventOptimistic,
    deleteEventOptimistic,
    rollbackEvent,
  };
};

/**
 * Очистка всех pending операций (для logout/cleanup)
 */
export const clearAllPendingEventOperations = () => {
  eventSnapshots.clear();
  pendingOperations.clear();
  rollbackTimeouts.forEach((timeout) => clearTimeout(timeout));
  rollbackTimeouts.clear();
};

export default useOptimisticEvent;
