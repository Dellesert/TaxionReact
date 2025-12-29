import { useState, useCallback } from 'react';
import type { Task } from '../types/task.types';
import type { StatusTab } from '../utils/taskListHelpers';
import { TASKS_PER_PAGE, removeDuplicateTasks } from '../utils/taskListHelpers';
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
    filters: Record<string, any>
  ) => Promise<void>;
  loadAllTasks: (
    silentUpdate: boolean,
    filters: Record<string, any>
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
    filters: Record<string, any>
  ) => {
    try {
      if (append) {
        setLoading(prev => ({ ...prev, [status]: true }));
      }

      const response = await taskApi.getTasksByStatus(status, limit, offset, filters);
      const fetchedTasks = response.data || [];

      // Note: subtasks are now included inline in the API response (task.subtasks)
      // No need for separate subtasks loading

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
    filters: Record<string, any>
  ) => {
    try {
      // Check current store state for tasks
      const currentTasks = useTaskStore.getState().tasksByStatus;
      const hasTasksInCache = Object.values(currentTasks).some(taskArray => taskArray.length > 0);

      // Show skeleton only if no tasks in cache and not a silent update
      if (!hasTasksInCache && !silentUpdate) {
        setIsInitialLoading(true);
      }

      // If filters contain specific statuses (array), only load those statuses
      // Otherwise load all statuses
      const statusesToLoad: StatusTab[] =
        filters.status && Array.isArray(filters.status) && filters.status.length > 0 && filters.status.length < 4
          ? filters.status as StatusTab[]
          : ['new', 'in_progress', 'review', 'done'];

      // Create a copy of filters without the status field for individual status loading
      const filtersWithoutStatus = { ...filters };
      delete filtersWithoutStatus.status;

      await Promise.all(
        statusesToLoad.map(status =>
          loadTasksByStatus(status, TASKS_PER_PAGE, 0, false, filtersWithoutStatus)
        )
      );

      // Clear tabs that are not in statusesToLoad
      const allStatuses: StatusTab[] = ['new', 'in_progress', 'review', 'done'];
      const statusesToClear = allStatuses.filter(s => !statusesToLoad.includes(s));
      statusesToClear.forEach(status => {
        setTasksForStatus(status, [], 0);
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [loadTasksByStatus, setTasksForStatus]);

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
