/**
 * Task Store
 * Управление состоянием задач с использованием Zustand
 */

import { create } from 'zustand';
import { Task, TaskStatus, UpdateTaskDto, CreateTaskDto } from '@/features/tasks/types/task.types';
import {
  getTasks,
  getTask,
  createTask,
  updateTask as apiUpdateTask,
  deleteTask
} from '@/features/tasks/api/task.api';

interface TaskStore {
  tasks: Task[];
  selectedTask: Task | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTasks: () => Promise<void>;
  loadTask: (taskId: number) => Promise<void>;
  createTask: (data: CreateTaskDto) => Promise<Task>;
  updateTaskStatus: (taskId: number, status: TaskStatus) => Promise<void>;
  updateTask: (taskId: number, updates: UpdateTaskDto) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
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

      const response = await getTasks();
      const tasks = response.data || [];

      set({ tasks, isLoading: false });
    } catch (error: any) {
      console.error('❌ Failed to load tasks:', error);
      set({
        error: error.message || 'Failed to load tasks',
        isLoading: false,
      });
    }
  },

  loadTask: async (taskId: number) => {
    try {
      set({ isLoading: true, error: null });

      const task = await getTask(taskId);

      set({ selectedTask: task, isLoading: false });
    } catch (error: any) {
      console.error('❌ Failed to load task:', error);
      set({
        error: error.message || 'Failed to load task',
        isLoading: false,
      });
    }
  },

  createTask: async (data: CreateTaskDto) => {
    try {

      const newTask = await createTask(data);

      // Add to tasks array
      const tasks = [newTask, ...get().tasks];
      set({ tasks });

      return newTask;
    } catch (error: any) {
      console.error('❌ Failed to create task:', error);
      set({ error: error.message || 'Failed to create task' });
      throw error;
    }
  },

  updateTaskStatus: async (taskId: number, status: TaskStatus) => {
    try {
      const updatedTask = await apiUpdateTask(taskId, { status });

      // Update in tasks array
      const tasks = get().tasks.map((task) =>
        task.id === taskId ? updatedTask : task
      );
      set({ tasks });

      // Update selected task if it matches
      const selectedTask = get().selectedTask;
      if (selectedTask && selectedTask.id === taskId) {
        set({ selectedTask: updatedTask });
      }
    } catch (error: any) {
      console.error('❌ Failed to update task status:', error);
      set({ error: error.message || 'Failed to update task status' });
      throw error;
    }
  },

  updateTask: async (taskId: number, updates: UpdateTaskDto) => {
    try {
      const updatedTask = await apiUpdateTask(taskId, updates);

      // Update in tasks array
      const tasks = get().tasks.map((task) =>
        task.id === taskId ? updatedTask : task
      );
      set({ tasks });

      // Update selected task if it matches
      const selectedTask = get().selectedTask;
      if (selectedTask && selectedTask.id === taskId) {
        set({ selectedTask: updatedTask });
      }
    } catch (error: any) {
      console.error('❌ Failed to update task:', error);
      set({ error: error.message || 'Failed to update task' });
      throw error;
    }
  },

  deleteTask: async (taskId: number) => {
    try {

      await deleteTask(taskId);

      // Remove from tasks array
      const tasks = get().tasks.filter((task) => task.id !== taskId);
      set({ tasks });

      // Clear selected task if it matches
      const selectedTask = get().selectedTask;
      if (selectedTask && selectedTask.id === taskId) {
        set({ selectedTask: null });
      }
    } catch (error: any) {
      console.error('❌ Failed to delete task:', error);
      set({ error: error.message || 'Failed to delete task' });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearSelectedTask: () => set({ selectedTask: null }),
}));
