import type { Task } from '../types/task.types';

export type TaskFilter = 'all' | 'my' | 'assigned';
export type StatusTab = 'new' | 'in_progress' | 'review' | 'done';

export const TASKS_PER_PAGE = 10;

/**
 * Status tabs configuration
 */
export const STATUS_TABS: { key: StatusTab; label: string; color: string; icon: string }[] = [
  { key: 'new', label: 'Новые', color: '#F59E0B', icon: 'document-text' },
  { key: 'in_progress', label: 'В работе', color: '#3B82F6', icon: 'time' },
  { key: 'review', label: 'Проверка', color: '#8B5CF6', icon: 'eye' },
  { key: 'done', label: 'Готово', color: '#10B981', icon: 'checkmark-circle' },
];

/**
 * Filter chips configuration
 */
export const FILTER_CHIPS: { key: TaskFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'my', label: 'Мои' },
  { key: 'assigned', label: 'Назначенные' },
];

/**
 * Build filter object for API request
 */
export const buildTaskFilters = (
  filter: TaskFilter,
  searchQuery: string,
  userId: number | undefined
): Record<string, any> => {
  const filters: Record<string, any> = {};

  if (filter === 'my') {
    filters.created_by = userId;
  } else if (filter === 'assigned') {
    filters.assigned_to = userId;
  }

  if (searchQuery.trim()) {
    filters.search = searchQuery.trim();
  }

  return filters;
};

/**
 * Remove duplicate tasks from array
 */
export const removeDuplicateTasks = (
  existingTasks: Task[],
  newTasks: Task[]
): Task[] => {
  const existingIds = new Set(existingTasks.map(t => t.id));
  return newTasks.filter(t => !existingIds.has(t.id));
};

/**
 * Get tasks with subtasks count > 0
 */
export const getTasksWithSubtasks = (tasks: Task[]): Task[] => {
  return tasks.filter(t => t.subtask_count && t.subtask_count > 0);
};

/**
 * Status tabs order for swipe navigation
 */
export const STATUS_TABS_ORDER: StatusTab[] = ['new', 'in_progress', 'review', 'done'];

/**
 * Get tab index by status key
 */
export const getTabIndex = (status: StatusTab): number => {
  return STATUS_TABS_ORDER.indexOf(status);
};

/**
 * Get status by tab index
 */
export const getStatusByIndex = (index: number): StatusTab => {
  return STATUS_TABS_ORDER[index];
};

/**
 * Status colors mapping
 */
export const STATUS_COLORS: Record<StatusTab, string> = {
  new: '#F59E0B',
  in_progress: '#3B82F6',
  review: '#8B5CF6',
  done: '#10B981',
};

/**
 * Status labels mapping
 */
export const STATUS_LABELS: Record<StatusTab, string> = {
  new: 'Новые',
  in_progress: 'В работе',
  review: 'Проверка',
  done: 'Готово',
};
