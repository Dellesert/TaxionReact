import { useState, useCallback, useRef } from 'react';
import { Task } from '../types/task.types';
import * as taskApi from '../api/task.api';

/**
 * Custom hook for managing task data loading and state
 */
export const useTaskData = (taskId: string) => {
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const isFirstFocus = useRef(true);

  const loadSubtasks = useCallback(async (parentTaskId: number) => {
    try {
      const subtasksData = await taskApi.getSubtasks(parentTaskId);
      setSubtasks(subtasksData);
    } catch (error) {
      console.error('Failed to load subtasks:', error);
    }
  }, []);

  const loadTask = useCallback(async () => {
    try {
      setIsLoading(true);
      setAccessDenied(false);
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTask(taskIdNum);

      // If this is a subtask, ALWAYS load delegation chain from parent task
      if (response.parent_task_id) {
        try {
          const parentDelegationChain = await taskApi.getDelegationChain(response.parent_task_id);
          if (parentDelegationChain && parentDelegationChain.length > 0) {
            response.delegation_chain = parentDelegationChain;
          }
        } catch (error) {
          console.error('Failed to load parent delegation chain:', error);
        }
      }

      // Load checklists for the task
      try {
        const checklists = await taskApi.getTaskChecklists(taskIdNum);
        response.checklists = checklists;
      } catch (error: any) {
        console.error('Failed to load checklists:', error);
        response.checklists = [];
      }

      setTask(response);

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
  }, [taskId, loadSubtasks]);

  const loadTaskSilently = useCallback(async () => {
    try {
      const taskIdNum = Number(taskId);
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

      // Always load subtasks to ensure fresh data
      await loadSubtasks(taskIdNum);
    } catch (error: any) {
      console.error('Failed to silently reload task:', error);
    }
  }, [taskId, loadSubtasks]);

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
