/**
 * Optimistic Task Hook
 * Мгновенный UI response при операциях с задачами с откатом при ошибке
 */

import { useCallback } from 'react';
import { useTaskStore } from '@shared/store/taskStore';
import { Task, TaskStatus, UpdateTaskDto, CreateTaskDto } from '@/features/tasks/types/task.types';
import * as taskApi from '@/features/tasks/api/task.api';

// Временный ID счётчик для оптимистичных задач
let tempTaskIdCounter = -1;

// Хранилище для отката
const taskSnapshots = new Map<number, Task>();
const pendingOperations = new Map<number, {
  type: 'create' | 'update' | 'status' | 'delete';
  originalData?: any;
  timestamp: number;
}>();

// Таймауты для автоматического rollback
const rollbackTimeouts = new Map<number, ReturnType<typeof setTimeout>>();
const MAX_PENDING_TIME = 30000; // 30 секунд

type StatusTab = 'new' | 'in_progress' | 'review' | 'done';

interface UseOptimisticTaskOptions {
  /** Таймаут для автоматического rollback (мс) */
  rollbackTimeout?: number;
  /** Callback при успехе */
  onSuccess?: (task: Task) => void;
  /** Callback при ошибке */
  onError?: (error: Error, taskId: number) => void;
}

/**
 * Хук для оптимистичных обновлений задач
 */
export const useOptimisticTask = (options: UseOptimisticTaskOptions = {}) => {
  const {
    rollbackTimeout = MAX_PENDING_TIME,
    onSuccess,
    onError,
  } = options;

  /**
   * Получить статус-таб для задачи
   */
  const getStatusTab = (status: TaskStatus): StatusTab => {
    switch (status) {
      case 'new':
      case 'viewed':
        return 'new';
      case 'in_progress':
        return 'in_progress';
      case 'review':
        return 'review';
      case 'done':
      case 'cancelled':
        return 'done';
      default:
        return 'new';
    }
  };

  /**
   * Сохранить снэпшот задачи для отката
   */
  const saveSnapshot = useCallback((task: Task) => {
    taskSnapshots.set(task.id, { ...task });
  }, []);

  /**
   * Откатить изменения задачи
   */
  const rollbackTask = useCallback((taskId: number) => {
    const snapshot = taskSnapshots.get(taskId);
    if (!snapshot) return;

    const statusTab = getStatusTab(snapshot.status);

    useTaskStore.setState((state) => {
      const tasks = state.tasksByStatus[statusTab] || [];
      const taskIndex = tasks.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        // Задача была удалена - восстанавливаем
        return {
          tasksByStatus: {
            ...state.tasksByStatus,
            [statusTab]: [...tasks, snapshot],
          },
        };
      }

      // Восстанавливаем оригинальное состояние
      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = snapshot;

      return {
        tasksByStatus: {
          ...state.tasksByStatus,
          [statusTab]: updatedTasks,
        },
      };
    });

    // Очистка
    taskSnapshots.delete(taskId);
    pendingOperations.delete(taskId);
    const timeout = rollbackTimeouts.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeouts.delete(taskId);
    }
  }, []);

  /**
   * Оптимистичное обновление статуса задачи
   */
  const updateStatusOptimistic = useCallback(async (
    task: Task,
    newStatus: TaskStatus
  ): Promise<Task | null> => {
    const oldStatusTab = getStatusTab(task.status);
    const newStatusTab = getStatusTab(newStatus);

    // Сохраняем снэпшот
    saveSnapshot(task);

    // Оптимистично обновляем UI
    useTaskStore.setState((state) => {
      const oldTasks = state.tasksByStatus[oldStatusTab] || [];
      const newTasks = state.tasksByStatus[newStatusTab] || [];

      // Обновлённая задача
      const updatedTask: Task = {
        ...task,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Удаляем из старого таба
      const filteredOldTasks = oldTasks.filter(t => t.id !== task.id);

      // Если статусы разные - добавляем в новый таб
      if (oldStatusTab !== newStatusTab) {
        return {
          tasksByStatus: {
            ...state.tasksByStatus,
            [oldStatusTab]: filteredOldTasks,
            [newStatusTab]: [updatedTask, ...newTasks],
          },
          totals: {
            ...state.totals,
            [oldStatusTab]: Math.max(0, state.totals[oldStatusTab] - 1),
            [newStatusTab]: state.totals[newStatusTab] + 1,
          },
        };
      }

      // Статусы одинаковые - просто обновляем задачу
      const taskIndex = oldTasks.findIndex(t => t.id === task.id);
      const updatedTasks = [...oldTasks];
      if (taskIndex !== -1) {
        updatedTasks[taskIndex] = updatedTask;
      }

      return {
        tasksByStatus: {
          ...state.tasksByStatus,
          [oldStatusTab]: updatedTasks,
        },
      };
    });

    // Устанавливаем таймаут для rollback
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticTask] Timeout for task ${task.id}, rolling back`);
      rollbackTask(task.id);
      onError?.(new Error('Timeout'), task.id);
    }, rollbackTimeout);
    rollbackTimeouts.set(task.id, timeout);

    // Отправляем на сервер
    try {
      const updatedTask = await taskApi.updateTaskStatus(task.id, { status: newStatus });

      // Очищаем таймаут
      clearTimeout(timeout);
      rollbackTimeouts.delete(task.id);
      taskSnapshots.delete(task.id);

      // Обновляем store реальными данными
      const finalStatusTab = getStatusTab(updatedTask.status);
      useTaskStore.setState((state) => {
        const tasks = state.tasksByStatus[finalStatusTab] || [];
        const taskIndex = tasks.findIndex(t => t.id === updatedTask.id);

        if (taskIndex !== -1) {
          const updatedTasks = [...tasks];
          updatedTasks[taskIndex] = updatedTask;
          return {
            tasksByStatus: {
              ...state.tasksByStatus,
              [finalStatusTab]: updatedTasks,
            },
          };
        }
        return state;
      });

      onSuccess?.(updatedTask);
      return updatedTask;
    } catch (error: any) {
      console.error('[OptimisticTask] Failed to update status:', error);

      // Откатываем
      rollbackTask(task.id);
      onError?.(error, task.id);
      return null;
    }
  }, [saveSnapshot, rollbackTask, rollbackTimeout, onSuccess, onError]);

  /**
   * Оптимистичное обновление задачи
   */
  const updateTaskOptimistic = useCallback(async (
    task: Task,
    updates: UpdateTaskDto
  ): Promise<Task | null> => {
    const statusTab = getStatusTab(task.status);

    // Сохраняем снэпшот
    saveSnapshot(task);

    // Оптимистично обновляем UI
    useTaskStore.setState((state) => {
      const tasks = state.tasksByStatus[statusTab] || [];
      const taskIndex = tasks.findIndex(t => t.id === task.id);

      if (taskIndex === -1) return state;

      const updatedTask: Task = {
        ...task,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const updatedTasks = [...tasks];
      updatedTasks[taskIndex] = updatedTask;

      return {
        tasksByStatus: {
          ...state.tasksByStatus,
          [statusTab]: updatedTasks,
        },
      };
    });

    // Устанавливаем таймаут для rollback
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticTask] Timeout for task ${task.id}, rolling back`);
      rollbackTask(task.id);
      onError?.(new Error('Timeout'), task.id);
    }, rollbackTimeout);
    rollbackTimeouts.set(task.id, timeout);

    // Отправляем на сервер
    try {
      const updatedTask = await taskApi.updateTask(task.id, updates);

      // Очищаем таймаут
      clearTimeout(timeout);
      rollbackTimeouts.delete(task.id);
      taskSnapshots.delete(task.id);

      // Обновляем store реальными данными
      const finalStatusTab = getStatusTab(updatedTask.status);
      useTaskStore.setState((state) => {
        const tasks = state.tasksByStatus[finalStatusTab] || [];
        const taskIndex = tasks.findIndex(t => t.id === updatedTask.id);

        if (taskIndex !== -1) {
          const updatedTasks = [...tasks];
          updatedTasks[taskIndex] = updatedTask;
          return {
            tasksByStatus: {
              ...state.tasksByStatus,
              [finalStatusTab]: updatedTasks,
            },
          };
        }
        return state;
      });

      onSuccess?.(updatedTask);
      return updatedTask;
    } catch (error: any) {
      console.error('[OptimisticTask] Failed to update task:', error);

      // Откатываем
      rollbackTask(task.id);
      onError?.(error, task.id);
      return null;
    }
  }, [saveSnapshot, rollbackTask, rollbackTimeout, onSuccess, onError]);

  /**
   * Оптимистичное создание задачи
   */
  const createTaskOptimistic = useCallback(async (
    data: CreateTaskDto
  ): Promise<Task | null> => {
    const tempId = tempTaskIdCounter--;
    const statusTab = getStatusTab(data.status || 'new');

    // Создаём временную задачу
    const tempTask: Task = {
      id: tempId,
      title: data.title,
      description: data.description,
      status: data.status || 'new',
      priority: data.priority || 'medium',
      assignee_ids: data.assignee_ids,
      project_id: data.project_id,
      due_date: data.due_date,
      tags: data.tags || [],
      created_by: 0, // Будет заполнено сервером
      comment_count: 0,
      progress_percentage: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Оптимистично добавляем в UI
    useTaskStore.setState((state) => ({
      tasksByStatus: {
        ...state.tasksByStatus,
        [statusTab]: [tempTask, ...(state.tasksByStatus[statusTab] || [])],
      },
      totals: {
        ...state.totals,
        [statusTab]: (state.totals[statusTab] || 0) + 1,
      },
    }));

    // Устанавливаем таймаут для удаления временной задачи
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticTask] Timeout for temp task ${tempId}, removing`);
      useTaskStore.setState((state) => ({
        tasksByStatus: {
          ...state.tasksByStatus,
          [statusTab]: (state.tasksByStatus[statusTab] || []).filter(t => t.id !== tempId),
        },
        totals: {
          ...state.totals,
          [statusTab]: Math.max(0, (state.totals[statusTab] || 0) - 1),
        },
      }));
      onError?.(new Error('Timeout'), tempId);
    }, rollbackTimeout);
    rollbackTimeouts.set(tempId, timeout);

    // Отправляем на сервер
    try {
      const createdTask = await taskApi.createTask(data);

      // Очищаем таймаут
      clearTimeout(timeout);
      rollbackTimeouts.delete(tempId);

      // Заменяем временную задачу реальной
      const finalStatusTab = getStatusTab(createdTask.status);
      useTaskStore.setState((state) => {
        // Удаляем временную задачу
        const filteredTasks = (state.tasksByStatus[statusTab] || []).filter(t => t.id !== tempId);

        // Если статус изменился
        if (statusTab !== finalStatusTab) {
          return {
            tasksByStatus: {
              ...state.tasksByStatus,
              [statusTab]: filteredTasks,
              [finalStatusTab]: [createdTask, ...(state.tasksByStatus[finalStatusTab] || [])],
            },
          };
        }

        // Добавляем реальную задачу
        return {
          tasksByStatus: {
            ...state.tasksByStatus,
            [statusTab]: [createdTask, ...filteredTasks],
          },
        };
      });

      onSuccess?.(createdTask);
      return createdTask;
    } catch (error: any) {
      console.error('[OptimisticTask] Failed to create task:', error);

      // Удаляем временную задачу
      clearTimeout(timeout);
      rollbackTimeouts.delete(tempId);
      useTaskStore.setState((state) => ({
        tasksByStatus: {
          ...state.tasksByStatus,
          [statusTab]: (state.tasksByStatus[statusTab] || []).filter(t => t.id !== tempId),
        },
        totals: {
          ...state.totals,
          [statusTab]: Math.max(0, (state.totals[statusTab] || 0) - 1),
        },
      }));

      onError?.(error, tempId);
      return null;
    }
  }, [rollbackTimeout, onSuccess, onError]);

  /**
   * Оптимистичное удаление задачи
   */
  const deleteTaskOptimistic = useCallback(async (task: Task): Promise<boolean> => {
    const statusTab = getStatusTab(task.status);

    // Сохраняем снэпшот
    saveSnapshot(task);

    // Оптимистично удаляем из UI
    useTaskStore.setState((state) => ({
      tasksByStatus: {
        ...state.tasksByStatus,
        [statusTab]: (state.tasksByStatus[statusTab] || []).filter(t => t.id !== task.id),
      },
      totals: {
        ...state.totals,
        [statusTab]: Math.max(0, (state.totals[statusTab] || 0) - 1),
      },
    }));

    // Устанавливаем таймаут для rollback
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticTask] Timeout for delete task ${task.id}, rolling back`);
      rollbackTask(task.id);
      onError?.(new Error('Timeout'), task.id);
    }, rollbackTimeout);
    rollbackTimeouts.set(task.id, timeout);

    // Отправляем на сервер
    try {
      await taskApi.deleteTask(task.id);

      // Очищаем
      clearTimeout(timeout);
      rollbackTimeouts.delete(task.id);
      taskSnapshots.delete(task.id);

      return true;
    } catch (error: any) {
      console.error('[OptimisticTask] Failed to delete task:', error);

      // Откатываем
      rollbackTask(task.id);
      onError?.(error, task.id);
      return false;
    }
  }, [saveSnapshot, rollbackTask, rollbackTimeout, onError]);

  return {
    updateStatusOptimistic,
    updateTaskOptimistic,
    createTaskOptimistic,
    deleteTaskOptimistic,
    rollbackTask,
  };
};

/**
 * Очистка всех pending операций (для logout/cleanup)
 */
export const clearAllPendingTaskOperations = () => {
  taskSnapshots.clear();
  pendingOperations.clear();
  rollbackTimeouts.forEach((timeout) => clearTimeout(timeout));
  rollbackTimeouts.clear();
};

export default useOptimisticTask;
