import { useState, useCallback } from 'react';
import type { Task } from '../types/task.types';
import type { StatusTab } from '../utils/taskListHelpers';
import { TASKS_PER_PAGE, removeDuplicateTasks, getTasksWithSubtasks } from '../utils/taskListHelpers';
import * as taskApi from '../api/task.api';

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
 */
export const useTaskListData = (): UseTaskListDataReturn => {
  // Tasks by status
  const [tasks, setTasks] = useState<TasksByStatus>({
    new: [],
    in_progress: [],
    review: [],
    done: [],
  });

  // Totals by status
  const [totals, setTotals] = useState<TotalsByStatus>({
    new: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  });

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

  const [isInitialLoading, setIsInitialLoading] = useState(true);

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

      setTasks(prev => {
        if (append) {
          const uniqueTasks = removeDuplicateTasks(prev[status], fetchedTasks);
          const updatedTasks = [...prev[status], ...uniqueTasks];

          // Log warning if all tasks were duplicates
          if (uniqueTasks.length === 0 && updatedTasks.length < response.total && fetchedTasks.length > 0) {
            console.log(`⚠️ All ${status} tasks were duplicates, user needs to scroll more`);
          }

          return { ...prev, [status]: updatedTasks };
        } else {
          return { ...prev, [status]: fetchedTasks };
        }
      });

      setTotals(prev => ({ ...prev, [status]: response.total }));

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
  }, []);

  const loadAllTasks = useCallback(async (
    silentUpdate: boolean = false,
    filters: Record<string, any>,
    onSubtasksLoad?: (taskIds: number[]) => Promise<void>
  ) => {
    try {
      const hasTasksInCache = Object.values(tasks).some(taskArray => taskArray.length > 0);

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
  }, [tasks, loadTasksByStatus]);

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
