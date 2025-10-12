/**
 * Task Store
 * Управление состоянием задач с использованием Zustand
 */

import { create } from 'zustand';
import { Task, TaskStatus, UpdateTaskDto } from '@types/task.types';
import { mockGetTasks, mockGetTask, isMockMode } from '@utils/mockData';

interface TaskStore {
  tasks: Task[];
  selectedTask: Task | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTasks: () => Promise<void>;
  loadTask: (taskId: number) => Promise<void>;
  updateTaskStatus: (taskId: number, status: TaskStatus) => Promise<void>;
  updateTask: (taskId: number, updates: UpdateTaskDto) => Promise<void>;
  clearError: () => void;
  clearSelectedTask: () => void;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  selectedTask: null,
  isLoading: false,
  error: null,

  loadTasks: async () => {
    try {
      set({ isLoading: true, error: null });

      let tasks: Task[];
      if (isMockMode()) {
        console.log('🔧 Using mock tasks');
        tasks = await mockGetTasks();
      } else {
        // TODO: Replace with real API call
        throw new Error('Real API not implemented yet');
      }

      set({ tasks, isLoading: false });
    } catch (error: any) {
      console.error('Failed to load tasks:', error);
      set({
        error: error.message || 'Failed to load tasks',
        isLoading: false,
      });
    }
  },

  loadTask: async (taskId: number) => {
    try {
      set({ isLoading: true, error: null });

      let task: Task;
      if (isMockMode()) {
        console.log('🔧 Loading mock task:', taskId);
        task = await mockGetTask(taskId);
      } else {
        // TODO: Replace with real API call
        throw new Error('Real API not implemented yet');
      }

      set({ selectedTask: task, isLoading: false });
    } catch (error: any) {
      console.error('Failed to load task:', error);
      set({
        error: error.message || 'Failed to load task',
        isLoading: false,
      });
    }
  },

  updateTaskStatus: async (taskId: number, status: TaskStatus) => {
    try {
      if (isMockMode()) {
        console.log('🔧 Updating task status:', taskId, status);

        // Update in tasks array
        const tasks = get().tasks.map((task) =>
          task.id === taskId ? { ...task, status } : task
        );
        set({ tasks });

        // Update selected task if it matches
        const selectedTask = get().selectedTask;
        if (selectedTask && selectedTask.id === taskId) {
          set({ selectedTask: { ...selectedTask, status } });
        }
      } else {
        // TODO: Replace with real API call
        throw new Error('Real API not implemented yet');
      }
    } catch (error: any) {
      console.error('Failed to update task status:', error);
      set({ error: error.message || 'Failed to update task status' });
    }
  },

  updateTask: async (taskId: number, updates: UpdateTaskDto) => {
    try {
      if (isMockMode()) {
        console.log('🔧 Updating task:', taskId, updates);

        // Update in tasks array
        const tasks = get().tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task
        );
        set({ tasks });

        // Update selected task if it matches
        const selectedTask = get().selectedTask;
        if (selectedTask && selectedTask.id === taskId) {
          set({ selectedTask: { ...selectedTask, ...updates } });
        }
      } else {
        // TODO: Replace with real API call
        throw new Error('Real API not implemented yet');
      }
    } catch (error: any) {
      console.error('Failed to update task:', error);
      set({ error: error.message || 'Failed to update task' });
    }
  },

  clearError: () => set({ error: null }),
  clearSelectedTask: () => set({ selectedTask: null }),
}));
