import { useState, useCallback, useRef, useEffect } from 'react';
import { Task } from '../types/task.types';
import * as taskApi from '../api/task.api';
import { getTaskFromCache, getSubtasksFromCache } from '@shared/hooks/useTaskPrefetch';
import { useTaskStore } from '@shared/store/taskStore';

/**
 * Custom hook for managing task data loading and state
 */
export const useTaskData = (taskId: string) => {
  const taskIdNum = Number(taskId);

  // Пробуем получить задачу и подзадачи из кэша prefetch для мгновенного отображения
  const cachedTask = getTaskFromCache(taskIdNum);
  const cachedSubtasks = getSubtasksFromCache(taskIdNum);

  const [task, setTask] = useState<Task | null>(cachedTask);
  const [subtasks, setSubtasks] = useState<Task[]>(cachedSubtasks || []);
  // Если есть кэш - не показываем loading, иначе показываем
  const [isLoading, setIsLoading] = useState(!cachedTask);
  const [accessDenied, setAccessDenied] = useState(false);
  const isFirstFocus = useRef(true);

  // Если задача была из кэша - всё равно загружаем свежие данные в фоне
  const needsBackgroundRefresh = useRef(!!cachedTask);

  // Если задача из кэша имеет подзадачи, но они не в кэше - загружаем их
  useEffect(() => {
    if (cachedTask && cachedTask.subtask_count && cachedTask.subtask_count > 0 && !cachedSubtasks) {
      taskApi.getSubtasks(taskIdNum).then(setSubtasks).catch(console.error);
    }
  }, []);

  const loadSubtasks = useCallback(async (parentTaskId: number) => {
    try {
      const subtasksData = await taskApi.getSubtasks(parentTaskId);
      setSubtasks(subtasksData);
      // Persist to Zustand store for offline/restart access
      useTaskStore.getState().setSubtasks(parentTaskId, subtasksData);
    } catch (error) {
      console.error('Failed to load subtasks:', error);
    }
  }, []);

  const loadTask = useCallback(async () => {
    try {
      // Если есть кэшированные данные - не показываем loading (используем ref)
      setIsLoading(() => needsBackgroundRefresh.current ? false : true);
      setAccessDenied(false);
      const response = await taskApi.getTask(taskIdNum);

      // Note: delegation_chain is now included inline in the API response
      // For subtasks, the backend now includes the parent's delegation_chain

      // Load checklists for the task
      try {
        const checklists = await taskApi.getTaskChecklists(taskIdNum);
        response.checklists = checklists;
      } catch (error: any) {
        console.error('Failed to load checklists:', error);
        response.checklists = [];
      }

      setTask(response);
      needsBackgroundRefresh.current = false;

      // Load subtasks if this is a parent task
      if (response.subtask_count && response.subtask_count > 0) {
        loadSubtasks(taskIdNum);
      }
    } catch (error: any) {
      console.error('Failed to load task:', error);
      // Check if it's a 403 error (access denied)
      if (error.status === 403) {
        setAccessDenied(true);
      } else {
        throw error; // Re-throw to be handled by caller
      }
    } finally {
      setIsLoading(false);
    }
  }, [taskIdNum, loadSubtasks]);

  const loadTaskSilently = useCallback(async () => {
    try {
      const response = await taskApi.getTask(taskIdNum);

      // Load checklists for the task
      try {
        const checklists = await taskApi.getTaskChecklists(taskIdNum);
        response.checklists = checklists;
      } catch (error: any) {
        console.error('Failed to load checklists:', error);
        response.checklists = [];
      }

      setTask(response);

      // Sync updated task to Zustand store so the task list reflects changes
      const status = response.status as 'new' | 'in_progress' | 'review' | 'done';
      useTaskStore.getState().mergeTasks([response], status);

      // Always load subtasks to ensure fresh data
      await loadSubtasks(taskIdNum);
    } catch (error: any) {
      console.error('Failed to silently reload task:', error);
    }
  }, [taskIdNum, loadSubtasks]);

  return {
    task,
    subtasks,
    isLoading,
    accessDenied,
    isFirstFocus,
    setTask,
    loadTask,
    loadTaskSilently,
    loadSubtasks,
  };
};
