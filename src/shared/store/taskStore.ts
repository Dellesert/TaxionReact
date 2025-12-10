/**
 * Task Store
 * Управление состоянием задач с использованием Zustand
 *
 * MMKV кэширование на native (iOS/Android)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Task } from '@/features/tasks/types/task.types';
import { getZustandTaskStorage, isNative } from '@shared/storage';

type StatusTab = 'new' | 'in_progress' | 'review' | 'done';

interface TasksByStatus {
  new: Task[];
  in_progress: Task[];
  review: Task[];
  done: Task[];
}

interface TotalsByStatus {
  new: number;
  in_progress: number;
  review: number;
  done: number;
}

interface TaskCacheStore {
  // Cached data
  tasksByStatus: TasksByStatus;
  totals: TotalsByStatus;
  lastUpdated: number | null;

  // Actions
  setTasksForStatus: (status: StatusTab, tasks: Task[], total: number) => void;
  appendTasksForStatus: (status: StatusTab, tasks: Task[]) => void;
  /** Merge updated tasks (for differential sync) */
  mergeTasks: (tasks: Task[], status: StatusTab) => void;
  /** Remove deleted tasks by IDs (for differential sync) */
  removeTasks: (taskIds: number[], status: StatusTab) => void;
  getCachedTasks: () => TasksByStatus;
  getCachedTotals: () => TotalsByStatus;
  clearCache: () => void;
}

const initialTasksByStatus: TasksByStatus = {
  new: [],
  in_progress: [],
  review: [],
  done: [],
};

const initialTotals: TotalsByStatus = {
  new: 0,
  in_progress: 0,
  review: 0,
  done: 0,
};

// Pre-load totals from storage on web for instant display
let preloadedTotals: TotalsByStatus | null = null;
if (!isNative) {
  // On web, try to load totals synchronously from localStorage
  try {
    const stored = localStorage.getItem('task-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.totals) {
        preloadedTotals = parsed.state.totals;
      }
    }
  } catch (error) {
    // Ignore errors, will use initial state
  }
}

export const useTaskStore = create<TaskCacheStore>()(
  persist(
    (set, get) => ({
      tasksByStatus: initialTasksByStatus,
      totals: preloadedTotals || initialTotals,
      lastUpdated: null,

      setTasksForStatus: (status: StatusTab, tasks: Task[], total: number) => {
        set((state) => ({
          tasksByStatus: {
            ...(state.tasksByStatus || initialTasksByStatus),
            [status]: tasks,
          },
          totals: {
            ...(state.totals || initialTotals),
            [status]: total,
          },
          lastUpdated: Date.now(),
        }));
      },

      appendTasksForStatus: (status: StatusTab, tasks: Task[]) => {
        set((state) => {
          const currentTasks = state.tasksByStatus[status] || [];
          const existingIds = new Set(currentTasks.map(t => t.id));
          const newTasks = tasks.filter(t => !existingIds.has(t.id));
          return {
            tasksByStatus: {
              ...state.tasksByStatus,
              [status]: [...currentTasks, ...newTasks],
            },
            lastUpdated: Date.now(),
          };
        });
      },

      mergeTasks: (tasks: Task[], status: StatusTab) => {
        set((state) => {
          const currentTasks = state.tasksByStatus[status] || [];
          const taskMap = new Map(currentTasks.map(t => [t.id, t]));

          // Update existing tasks or add new ones
          for (const task of tasks) {
            taskMap.set(task.id, task);
          }

          return {
            tasksByStatus: {
              ...state.tasksByStatus,
              [status]: Array.from(taskMap.values()),
            },
            lastUpdated: Date.now(),
          };
        });
      },

      removeTasks: (taskIds: number[], status: StatusTab) => {
        if (!taskIds || taskIds.length === 0) return;

        set((state) => {
          const currentTasks = state.tasksByStatus[status] || [];
          const idsToRemove = new Set(taskIds);
          const filteredTasks = currentTasks.filter(t => !idsToRemove.has(t.id));

          return {
            tasksByStatus: {
              ...state.tasksByStatus,
              [status]: filteredTasks,
            },
            totals: {
              ...state.totals,
              [status]: Math.max(0, (state.totals[status] || 0) - taskIds.length),
            },
            lastUpdated: Date.now(),
          };
        });
      },

      getCachedTasks: () => get().tasksByStatus,

      getCachedTotals: () => get().totals,

      clearCache: () => {
        set({
          tasksByStatus: initialTasksByStatus,
          totals: initialTotals,
          lastUpdated: null,
        });
      },
    }),
    {
      name: 'task-storage',
      storage: createJSONStorage(() => getZustandTaskStorage()),
      partialize: (state) => ({
        tasksByStatus: state.tasksByStatus,
        totals: state.totals,
        lastUpdated: state.lastUpdated,
      }),
      skipHydration: !isNative,
      version: 2,
    }
  )
);
