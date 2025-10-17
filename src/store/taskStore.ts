/**
 * Task Store
 * Управление состоянием задач с использованием Zustand
 */

import { create } from 'zustand';
import { Task, TaskStatus, UpdateTaskDto, CreateTaskDto } from '@types/task.types';
import {
  getTasks,
  getTask,
  createTask,
  updateTask as apiUpdateTask,
  deleteTask
} from '@api/task.api';

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
      console.log('📋 Loading tasks from backend...');

      const response = await getTasks();
      const tasks = response.data || [];

      console.log('📋 Tasks loaded:', tasks.length);
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
      console.log('📋 Loading task:', taskId);

      const task = await getTask(taskId);

      console.log('📋 Task loaded:', task);
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
      console.log('📋 Creating task:', data);

      const newTask = await createTask(data);

      console.log('📋 Task created:', newTask);

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
      console.log('📋 Updating task status:', taskId, status);

      const updatedTask = await apiUpdateTask(taskId, { status });

      console.log('📋 Task status updated:', updatedTask);

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
      console.log('📋 Updating task:', taskId, updates);

      const updatedTask = await apiUpdateTask(taskId, updates);

      console.log('📋 Task updated:', updatedTask);

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
      console.log('📋 Deleting task:', taskId);

      await deleteTask(taskId);

      console.log('📋 Task deleted');

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
