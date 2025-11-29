/**
 * Task Prefetch Hook
 * Предзагрузка данных задач при навигации для мгновенного отображения
 */

import { useCallback, useRef } from 'react';
import { useTaskStore } from '@shared/store/taskStore';
import * as taskApi from '@/features/tasks/api/task.api';
import { Task } from '@/features/tasks/types/task.types';

// Кэш для отслеживания уже загруженных данных
const prefetchedTasks = new Set<number>();
const prefetchInProgress = new Map<number, Promise<Task | null>>();

// Кэш задач по ID для быстрого доступа
const taskCache = new Map<number, { task: Task; timestamp: number }>();
// Кэш подзадач по parent_task_id
const subtasksCache = new Map<number, { subtasks: Task[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

interface UseTaskPrefetchOptions {
  /** Задержка перед началом предзагрузки (мс) */
  delay?: number;
  /** Предзагружать подзадачи */
  prefetchSubtasks?: boolean;
}

/**
 * Хук для предзагрузки данных задачи
 */
export const useTaskPrefetch = (options: UseTaskPrefetchOptions = {}) => {
  const {
    delay = 150,
    prefetchSubtasks = true,
  } = options;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Получить задачу из кэша (если не устарела)
   */
  const getCachedTask = useCallback((taskId: number): Task | null => {
    const cached = taskCache.get(taskId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.task;
    }
    return null;
  }, []);

  /**
   * Сохранить задачу в кэш
   */
  const cacheTask = useCallback((task: Task) => {
    taskCache.set(task.id, { task, timestamp: Date.now() });
  }, []);

  /**
   * Предзагрузка данных задачи
   */
  const prefetchTask = useCallback(async (taskId: number): Promise<Task | null> => {
    // Проверяем, загружена ли уже
    if (prefetchedTasks.has(taskId)) {
      return getCachedTask(taskId);
    }

    // Проверяем, идёт ли уже загрузка
    if (prefetchInProgress.has(taskId)) {
      return prefetchInProgress.get(taskId) || null;
    }

    // Проверяем кэш
    const cached = getCachedTask(taskId);
    if (cached) {
      prefetchedTasks.add(taskId);
      return cached;
    }

    const prefetchPromise = (async () => {
      try {
        // Загружаем задачу
        const task = await taskApi.getTask(taskId);

        // Кэшируем
        cacheTask(task);
        prefetchedTasks.add(taskId);

        // Предзагружаем подзадачи
        if (prefetchSubtasks && task.subtask_count && task.subtask_count > 0) {
          try {
            const subtasks = await taskApi.getSubtasks(taskId);
            // Кэшируем подзадачи индивидуально
            subtasks.forEach(cacheTask);
            // Кэшируем список подзадач для parent
            subtasksCache.set(taskId, { subtasks, timestamp: Date.now() });
          } catch (error) {
            console.warn(`[TaskPrefetch] Failed to prefetch subtasks for task ${taskId}:`, error);
          }
        }

        return task;
      } catch (error) {
        console.warn(`[TaskPrefetch] Failed to prefetch task ${taskId}:`, error);
        return null;
      } finally {
        prefetchInProgress.delete(taskId);
      }
    })();

    prefetchInProgress.set(taskId, prefetchPromise);
    return prefetchPromise;
  }, [getCachedTask, cacheTask, prefetchSubtasks]);

  /**
   * Предзагрузка с задержкой (для hover/focus)
   */
  const prefetchTaskDelayed = useCallback((taskId: number) => {
    // Отменяем предыдущую задержку
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      prefetchTask(taskId);
    }, delay);
  }, [prefetchTask, delay]);

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
    prefetchedTasks.clear();
    taskCache.clear();
  }, []);

  /**
   * Инвалидация конкретной задачи в кэше
   */
  const invalidateTask = useCallback((taskId: number) => {
    prefetchedTasks.delete(taskId);
    taskCache.delete(taskId);
  }, []);

  return {
    prefetchTask,
    prefetchTaskDelayed,
    cancelPrefetch,
    clearPrefetchCache,
    invalidateTask,
    getCachedTask,
    cacheTask,
  };
};

/**
 * Хук для предзагрузки следующих страниц списка задач
 */
export const useTaskListPrefetch = () => {
  const prefetchNextPageRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Предзагрузка следующей страницы списка задач для конкретного статуса
   */
  const prefetchNextTaskPage = useCallback(async (
    status: 'new' | 'in_progress' | 'review' | 'done',
    currentOffset: number,
    limit: number = 10
  ) => {
    const { tasksByStatus, totals, appendTasksForStatus } = useTaskStore.getState();
    const currentTasks = tasksByStatus[status];
    const total = totals[status];

    // Не загружаем если уже все загружено
    if (currentTasks.length >= total) {
      return;
    }

    // Предзагружаем с задержкой
    if (prefetchNextPageRef.current) {
      clearTimeout(prefetchNextPageRef.current);
    }

    prefetchNextPageRef.current = setTimeout(async () => {
      try {
        const response = await taskApi.getTasksByStatus(
          status,
          limit,
          currentOffset + currentTasks.length
        );

        if (response.data && response.data.length > 0) {
          appendTasksForStatus(status, response.data);
        }
      } catch (error) {
        console.warn(`[TaskListPrefetch] Failed to prefetch ${status} tasks:`, error);
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
    prefetchNextTaskPage,
    cancelPagePrefetch,
  };
};

/**
 * Получить задачу из глобального кэша
 */
export const getTaskFromCache = (taskId: number): Task | null => {
  const cached = taskCache.get(taskId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.task;
  }
  return null;
};

/**
 * Получить подзадачи из глобального кэша
 */
export const getSubtasksFromCache = (parentTaskId: number): Task[] | null => {
  const cached = subtasksCache.get(parentTaskId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.subtasks;
  }
  return null;
};

/**
 * Очистить весь кэш задач (для logout/cleanup)
 */
export const clearAllTaskCache = () => {
  prefetchedTasks.clear();
  taskCache.clear();
  subtasksCache.clear();
  prefetchInProgress.clear();
};

export default useTaskPrefetch;
