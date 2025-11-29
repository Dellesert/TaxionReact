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

export const useTaskStore = create<TaskCacheStore>()(
  persist(
    (set, get) => ({
      tasksByStatus: initialTasksByStatus,
      totals: initialTotals,
      lastUpdated: null,

      setTasksForStatus: (status: StatusTab, tasks: Task[], total: number) => {
        set((state) => ({
          tasksByStatus: {
            ...state.tasksByStatus,
            [status]: tasks,
          },
          totals: {
            ...state.totals,
            [status]: total,
          },
          lastUpdated: Date.now(),
        }));
      },

      appendTasksForStatus: (status: StatusTab, tasks: Task[]) => {
        set((state) => {
          const existingIds = new Set(state.tasksByStatus[status].map(t => t.id));
          const newTasks = tasks.filter(t => !existingIds.has(t.id));
          return {
            tasksByStatus: {
              ...state.tasksByStatus,
              [status]: [...state.tasksByStatus[status], ...newTasks],
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
