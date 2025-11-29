import { useState, useCallback } from 'react';
import type { Task } from '../types/task.types';
import type { StatusTab } from '../utils/taskListHelpers';
import { TASKS_PER_PAGE, removeDuplicateTasks, getTasksWithSubtasks } from '../utils/taskListHelpers';
import * as taskApi from '../api/task.api';
import { useTaskStore } from '@shared/store/taskStore';

// Re-export StatusTab for convenience
export type { StatusTab } from '../utils/taskListHelpers';

export interface TasksByStatus extends Record<StatusTab, Task[]> {
  new: Task[];
  in_progress: Task[];
  review: Task[];
  done: Task[];
}

export interface TotalsByStatus extends Record<StatusTab, number> {
  new: number;
  in_progress: number;
  review: number;
  done: number;
}

export interface LoadingByStatus extends Record<StatusTab, boolean> {
  new: boolean;
  in_progress: boolean;
  review: boolean;
  done: boolean;
}

export interface CanLoadMoreByStatus extends Record<StatusTab, boolean> {
  new: boolean;
  in_progress: boolean;
  review: boolean;
  done: boolean;
}

export interface UseTaskListDataReturn {
  tasks: TasksByStatus;
  totals: TotalsByStatus;
  loading: LoadingByStatus;
  canLoadMore: CanLoadMoreByStatus;
  isInitialLoading: boolean;
  loadTasksByStatus: (
    status: StatusTab,
    limit: number,
    offset: number,
    append: boolean,
    filters: Record<string, any>,
    onSubtasksLoad?: (taskIds: number[]) => Promise<void>
  ) => Promise<void>;
  loadAllTasks: (
    silentUpdate: boolean,
    filters: Record<string, any>,
    onSubtasksLoad?: (taskIds: number[]) => Promise<void>
  ) => Promise<void>;
  resetCanLoadMore: () => void;
  setIsInitialLoading: (loading: boolean) => void;
}

/**
 * Hook for managing task list data
 * Uses Zustand store directly to avoid setState during render issues
 */
export const useTaskListData = (): UseTaskListDataReturn => {
  // Get data directly from Zustand store - this prevents setState during render
  const tasks = useTaskStore((state) => state.tasksByStatus);
  const totals = useTaskStore((state) => state.totals);
  const setTasksForStatus = useTaskStore((state) => state.setTasksForStatus);
  const appendTasksForStatus = useTaskStore((state) => state.appendTasksForStatus);

  // Loading states
  const [loading, setLoading] = useState<LoadingByStatus>({
    new: false,
    in_progress: false,
    review: false,
    done: false,
  });

  // Can load more states
  const [canLoadMore, setCanLoadMore] = useState<CanLoadMoreByStatus>({
    new: false,
    in_progress: false,
    review: false,
    done: false,
  });

  // Check if we have cached data - computed from store
  const hasTasksInStore = Object.values(tasks).some(arr => arr.length > 0);
  const [isInitialLoading, setIsInitialLoading] = useState(!hasTasksInStore);

  const loadTasksByStatus = useCallback(async (
    status: StatusTab,
    limit: number = TASKS_PER_PAGE,
    offset: number = 0,
    append: boolean = false,
    filters: Record<string, any>,
    onSubtasksLoad?: (taskIds: number[]) => Promise<void>
  ) => {
    try {
      if (append) {
        setLoading(prev => ({ ...prev, [status]: true }));
      }

      const response = await taskApi.getTasksByStatus(status, limit, offset, filters);
      const fetchedTasks = response.data || [];

      // Load subtasks for tasks that have them
      const tasksWithSubtasks = getTasksWithSubtasks(fetchedTasks);
      if (tasksWithSubtasks.length > 0 && onSubtasksLoad) {
        const taskIds = tasksWithSubtasks.map(t => t.id);
        await onSubtasksLoad(taskIds);
      }

      if (append) {
        // Get current tasks from store to calculate unique tasks
        const currentTasks = useTaskStore.getState().tasksByStatus[status] || [];
        const uniqueTasks = removeDuplicateTasks(currentTasks, fetchedTasks);
        appendTasksForStatus(status, uniqueTasks);
      } else {
        // Replace mode - save to store
        setTasksForStatus(status, fetchedTasks, response.total ?? 0);
      }

      // Enable load more after initial load
      if (!append) {
        setTimeout(() => {
          setCanLoadMore(prev => ({ ...prev, [status]: true }));
        }, 500);
      }
    } catch (error) {
      console.error(`Failed to load ${status} tasks:`, error);
    } finally {
      if (append) {
        setLoading(prev => ({ ...prev, [status]: false }));
      }
    }
  }, [setTasksForStatus, appendTasksForStatus]);

  const loadAllTasks = useCallback(async (
    silentUpdate: boolean = false,
    filters: Record<string, any>,
    onSubtasksLoad?: (taskIds: number[]) => Promise<void>
  ) => {
    try {
      // Check current store state for tasks
      const currentTasks = useTaskStore.getState().tasksByStatus;
      const hasTasksInCache = Object.values(currentTasks).some(taskArray => taskArray.length > 0);

      // Show skeleton only if no tasks in cache and not a silent update
      if (!hasTasksInCache && !silentUpdate) {
        setIsInitialLoading(true);
      }

      await Promise.all([
        loadTasksByStatus('new', TASKS_PER_PAGE, 0, false, filters, onSubtasksLoad),
        loadTasksByStatus('in_progress', TASKS_PER_PAGE, 0, false, filters, onSubtasksLoad),
        loadTasksByStatus('review', TASKS_PER_PAGE, 0, false, filters, onSubtasksLoad),
        loadTasksByStatus('done', TASKS_PER_PAGE, 0, false, filters, onSubtasksLoad),
      ]);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [loadTasksByStatus]);

  const resetCanLoadMore = useCallback(() => {
    setCanLoadMore({
      new: false,
      in_progress: false,
      review: false,
      done: false,
    });
  }, []);

  return {
    tasks,
    totals,
    loading,
    canLoadMore,
    isInitialLoading,
    loadTasksByStatus,
    loadAllTasks,
    resetCanLoadMore,
    setIsInitialLoading,
  };
};
