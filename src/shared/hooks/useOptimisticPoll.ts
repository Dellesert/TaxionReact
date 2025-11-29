/**
 * Optimistic Poll Hook
 * Мгновенный UI response при операциях с опросами с откатом при ошибке
 */

import { useCallback } from 'react';
import { usePollStore } from '@shared/store/pollStore';
import { Poll, VoteDto, CreatePollDto, UpdatePollDto } from '@/features/polls/types/poll.types';
import * as pollApi from '@/features/polls/api/poll.api';
import { useAuthStore } from '@shared/store/authStore';

// Временный ID счётчик для оптимистичных опросов
let tempPollIdCounter = -1;

// Хранилище для отката
const pollSnapshots = new Map<number, Poll>();
const pendingOperations = new Map<number, {
  type: 'create' | 'update' | 'vote' | 'delete';
  originalData?: any;
  timestamp: number;
}>();

// Таймауты для автоматического rollback
const rollbackTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
const MAX_PENDING_TIME = 30000; // 30 секунд

interface UseOptimisticPollOptions {
  /** Таймаут для автоматического rollback (мс) */
  rollbackTimeout?: number;
  /** Callback при успехе */
  onSuccess?: (poll: Poll) => void;
  /** Callback при ошибке */
  onError?: (error: Error, pollId: number) => void;
}

/**
 * Хук для оптимистичных обновлений опросов
 */
export const useOptimisticPoll = (options: UseOptimisticPollOptions = {}) => {
  const {
    rollbackTimeout = MAX_PENDING_TIME,
    onSuccess,
    onError,
  } = options;

  const { user } = useAuthStore();

  /**
   * Сохранить снэпшот опроса для отката
   */
  const saveSnapshot = useCallback((poll: Poll) => {
    pollSnapshots.set(poll.id, { ...poll, options: [...poll.options] });
  }, []);

  /**
   * Откатить изменения опроса
   */
  const rollbackPoll = useCallback((pollId: number) => {
    const snapshot = pollSnapshots.get(pollId);
    if (!snapshot) return;

    usePollStore.setState((state) => {
      const pollIndex = state.polls.findIndex(p => p.id === pollId);

      if (pollIndex === -1) {
        // Опрос был удалён - восстанавливаем
        return {
          polls: [...state.polls, snapshot],
        };
      }

      // Восстанавливаем оригинальное состояние
      const updatedPolls = [...state.polls];
      updatedPolls[pollIndex] = snapshot;

      return {
        polls: updatedPolls,
      };
    });

    // Очистка
    pollSnapshots.delete(pollId);
    pendingOperations.delete(pollId);
    const timeout = rollbackTimeouts.get(pollId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeouts.delete(pollId);
    }
  }, []);

  /**
   * Оптимистичное голосование в опросе
   */
  const voteOptimistic = useCallback(async (
    poll: Poll,
    voteData: VoteDto
  ): Promise<Poll | null> => {
    // Сохраняем снэпшот
    saveSnapshot(poll);

    // Оптимистично обновляем UI
    usePollStore.setState((state) => {
      const pollIndex = state.polls.findIndex(p => p.id === poll.id);
      if (pollIndex === -1) return state;

      // Обновляем опрос оптимистично
      const updatedPoll: Poll = {
        ...poll,
        user_has_voted: true,
        total_voters: poll.total_voters + (poll.user_has_voted ? 0 : 1),
        total_votes: poll.total_votes + 1,
        options: poll.options.map(opt => {
          // Для single_choice
          if (voteData.option_id && opt.id === voteData.option_id) {
            return {
              ...opt,
              vote_count: (opt.vote_count || 0) + 1,
            };
          }
          // Для multiple_choice
          if (voteData.option_ids && voteData.option_ids.includes(opt.id)) {
            return {
              ...opt,
              vote_count: (opt.vote_count || 0) + 1,
            };
          }
          return opt;
        }),
        updated_at: new Date().toISOString(),
      };

      const updatedPolls = [...state.polls];
      updatedPolls[pollIndex] = updatedPoll;

      return {
        polls: updatedPolls,
      };
    });

    // Устанавливаем таймаут для rollback
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticPoll] Timeout for vote on poll ${poll.id}, rolling back`);
      rollbackPoll(poll.id);
      onError?.(new Error('Timeout'), poll.id);
    }, rollbackTimeout);
    rollbackTimeouts.set(poll.id, timeout);

    // Отправляем на сервер
    try {
      const updatedPoll = await pollApi.vote(poll.id, voteData);

      // Очищаем таймаут
      clearTimeout(timeout);
      rollbackTimeouts.delete(poll.id);
      pollSnapshots.delete(poll.id);

      // Обновляем store реальными данными
      usePollStore.setState((state) => {
        const pollIndex = state.polls.findIndex(p => p.id === updatedPoll.id);
        if (pollIndex !== -1) {
          const updatedPolls = [...state.polls];
          updatedPolls[pollIndex] = updatedPoll;
          return { polls: updatedPolls };
        }
        return state;
      });

      onSuccess?.(updatedPoll);
      return updatedPoll;
    } catch (error: any) {
      console.error('[OptimisticPoll] Failed to vote:', error);

      // Откатываем
      rollbackPoll(poll.id);
      onError?.(error, poll.id);
      return null;
    }
  }, [saveSnapshot, rollbackPoll, rollbackTimeout, onSuccess, onError]);

  /**
   * Оптимистичное обновление опроса
   */
  const updatePollOptimistic = useCallback(async (
    poll: Poll,
    updates: UpdatePollDto
  ): Promise<Poll | null> => {
    // Сохраняем снэпшот
    saveSnapshot(poll);

    // Оптимистично обновляем UI
    usePollStore.setState((state) => {
      const pollIndex = state.polls.findIndex(p => p.id === poll.id);
      if (pollIndex === -1) return state;

      // Исключаем options из updates, так как их тип отличается
      const { options: _, ...updatesWithoutOptions } = updates;

      const updatedPoll: Poll = {
        ...poll,
        ...updatesWithoutOptions,
        // Сохраняем оригинальные options (реальные изменения придут от сервера)
        options: poll.options,
        updated_at: new Date().toISOString(),
      };

      const updatedPolls = [...state.polls];
      updatedPolls[pollIndex] = updatedPoll;

      return {
        polls: updatedPolls,
      };
    });

    // Устанавливаем таймаут для rollback
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticPoll] Timeout for poll ${poll.id}, rolling back`);
      rollbackPoll(poll.id);
      onError?.(new Error('Timeout'), poll.id);
    }, rollbackTimeout);
    rollbackTimeouts.set(poll.id, timeout);

    // Отправляем на сервер
    try {
      const updatedPoll = await pollApi.updatePoll(poll.id, updates);

      // Очищаем таймаут
      clearTimeout(timeout);
      rollbackTimeouts.delete(poll.id);
      pollSnapshots.delete(poll.id);

      // Обновляем store реальными данными
      usePollStore.setState((state) => {
        const pollIndex = state.polls.findIndex(p => p.id === updatedPoll.id);
        if (pollIndex !== -1) {
          const updatedPolls = [...state.polls];
          updatedPolls[pollIndex] = updatedPoll;
          return { polls: updatedPolls };
        }
        return state;
      });

      onSuccess?.(updatedPoll);
      return updatedPoll;
    } catch (error: any) {
      console.error('[OptimisticPoll] Failed to update poll:', error);

      // Откатываем
      rollbackPoll(poll.id);
      onError?.(error, poll.id);
      return null;
    }
  }, [saveSnapshot, rollbackPoll, rollbackTimeout, onSuccess, onError]);

  /**
   * Оптимистичное создание опроса
   */
  const createPollOptimistic = useCallback(async (
    data: CreatePollDto
  ): Promise<Poll | null> => {
    const tempId = tempPollIdCounter--;

    // Создаём временный опрос
    const tempPoll: Poll = {
      id: tempId,
      title: data.title,
      description: data.description,
      type: data.type,
      status: data.status || 'draft',
      visibility: data.visibility || 'public',
      start_time: data.start_time,
      end_time: data.end_time,
      allow_anonymous: data.allow_anonymous || false,
      allow_multiple_vote: data.allow_multiple_vote || false,
      require_comment: data.require_comment || false,
      show_results: data.show_results !== false,
      show_results_after: data.show_results_after || false,
      created_by: user?.id || 0,
      creator: user || undefined,
      options: (data.options || []).map((opt, index) => ({
        id: -(index + 1),
        poll_id: tempId,
        text: opt.text,
        description: opt.description,
        position: opt.position || index,
        color: opt.color,
        image_url: opt.image_url,
        vote_count: 0,
        vote_percent: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      total_votes: 0,
      total_voters: 0,
      user_has_voted: false,
      category: data.category,
      department_id: data.department_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Оптимистично добавляем в UI
    usePollStore.setState((state) => ({
      polls: [tempPoll, ...state.polls],
      total: state.total + 1,
    }));

    // Устанавливаем таймаут для удаления временного опроса
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticPoll] Timeout for temp poll ${tempId}, removing`);
      usePollStore.setState((state) => ({
        polls: state.polls.filter(p => p.id !== tempId),
        total: Math.max(0, state.total - 1),
      }));
      onError?.(new Error('Timeout'), tempId);
    }, rollbackTimeout);
    rollbackTimeouts.set(tempId, timeout);

    // Отправляем на сервер
    try {
      const createdPoll = await pollApi.createPoll(data);

      // Очищаем таймаут
      clearTimeout(timeout);
      rollbackTimeouts.delete(tempId);

      // Заменяем временный опрос реальным
      usePollStore.setState((state) => ({
        polls: [createdPoll, ...state.polls.filter(p => p.id !== tempId)],
      }));

      onSuccess?.(createdPoll);
      return createdPoll;
    } catch (error: any) {
      console.error('[OptimisticPoll] Failed to create poll:', error);

      // Удаляем временный опрос
      clearTimeout(timeout);
      rollbackTimeouts.delete(tempId);
      usePollStore.setState((state) => ({
        polls: state.polls.filter(p => p.id !== tempId),
        total: Math.max(0, state.total - 1),
      }));

      onError?.(error, tempId);
      return null;
    }
  }, [user, rollbackTimeout, onSuccess, onError]);

  /**
   * Оптимистичное удаление опроса
   */
  const deletePollOptimistic = useCallback(async (poll: Poll): Promise<boolean> => {
    // Сохраняем снэпшот
    saveSnapshot(poll);

    // Оптимистично удаляем из UI
    usePollStore.setState((state) => ({
      polls: state.polls.filter(p => p.id !== poll.id),
      total: Math.max(0, state.total - 1),
    }));

    // Устанавливаем таймаут для rollback
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticPoll] Timeout for delete poll ${poll.id}, rolling back`);
      rollbackPoll(poll.id);
      onError?.(new Error('Timeout'), poll.id);
    }, rollbackTimeout);
    rollbackTimeouts.set(poll.id, timeout);

    // Отправляем на сервер
    try {
      await pollApi.deletePoll(poll.id);

      // Очищаем
      clearTimeout(timeout);
      rollbackTimeouts.delete(poll.id);
      pollSnapshots.delete(poll.id);

      return true;
    } catch (error: any) {
      console.error('[OptimisticPoll] Failed to delete poll:', error);

      // Откатываем
      rollbackPoll(poll.id);
      onError?.(error, poll.id);
      return false;
    }
  }, [saveSnapshot, rollbackPoll, rollbackTimeout, onError]);

  return {
    voteOptimistic,
    updatePollOptimistic,
    createPollOptimistic,
    deletePollOptimistic,
    rollbackPoll,
  };
};

/**
 * Очистка всех pending операций (для logout/cleanup)
 */
export const clearAllPendingPollOperations = () => {
  pollSnapshots.clear();
  pendingOperations.clear();
  rollbackTimeouts.forEach((timeout) => clearTimeout(timeout));
  rollbackTimeouts.clear();
};

export default useOptimisticPoll;
