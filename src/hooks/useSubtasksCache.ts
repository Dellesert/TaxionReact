import { useState, useCallback } from 'react';
import type { Task } from '../types/task.types';
import * as taskApi from '../api/task.api';

export interface UseSubtasksCacheReturn {
  subtasksCache: Record<number, Task[]>;
  loadSubtasksForTask: (taskId: number) => Promise<Task[]>;
  loadSubtasksForMultipleTasks: (taskIds: number[]) => Promise<void>;
  clearCache: () => void;
}

/**
 * Hook for managing subtasks cache
 */
export const useSubtasksCache = (): UseSubtasksCacheReturn => {
  const [subtasksCache, setSubtasksCache] = useState<Record<number, Task[]>>({});

  const loadSubtasksForTask = useCallback(async (taskId: number): Promise<Task[]> => {
    try {
      const subtasks = await taskApi.getSubtasks(taskId);
      setSubtasksCache(prev => ({ ...prev, [taskId]: subtasks }));
      return subtasks;
    } catch (error) {
      console.error(`Failed to load subtasks for task ${taskId}:`, error);
      return [];
    }
  }, []);

  const loadSubtasksForMultipleTasks = useCallback(async (taskIds: number[]): Promise<void> => {
    if (taskIds.length === 0) return;

    try {
      await Promise.all(taskIds.map(taskId => loadSubtasksForTask(taskId)));
    } catch (error) {
      console.error('Failed to load subtasks for multiple tasks:', error);
    }
  }, [loadSubtasksForTask]);

  const clearCache = useCallback(() => {
    setSubtasksCache({});
  }, []);

  return {
    subtasksCache,
    loadSubtasksForTask,
    loadSubtasksForMultipleTasks,
    clearCache,
  };
};
