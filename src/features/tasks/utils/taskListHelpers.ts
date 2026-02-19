import type { Task, TaskPriority, TaskStatus } from '../types/task.types';

export type TaskFilter = 'all' | 'my' | 'assigned';
export type StatusTab = 'new' | 'in_progress' | 'review' | 'done';

/**
 * Advanced filter options for task table
 */
export interface AdvancedTaskFilters {
  baseFilter: TaskFilter;
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  hasSubtasks?: boolean | null; // null = both, true = only with subtasks, false = only without
  hasOverdueDeadline?: boolean;
  isDelegated?: boolean;
  sortBy?: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'title' | 'progress_percentage';
  sortDirection?: 'asc' | 'desc';
}

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
 * Build advanced filter object for API request and client-side filtering
 */
export const buildAdvancedTaskFilters = (
  advancedFilters: AdvancedTaskFilters,
  searchQuery: string,
  userId: number | undefined
): Record<string, any> => {
  const filters: Record<string, any> = {};

  // Base filter (all/my/assigned)
  if (advancedFilters.baseFilter === 'my') {
    filters.created_by = userId;
  } else if (advancedFilters.baseFilter === 'assigned') {
    filters.assigned_to = userId;
  }

  // Search query
  if (searchQuery.trim()) {
    filters.search = searchQuery.trim();
  }

  // Statuses (if not all selected)
  // There are 4 possible statuses: new, in_progress, review, done
  if (advancedFilters.statuses.length > 0 && advancedFilters.statuses.length < 4) {
    filters.status = advancedFilters.statuses;
  }

  // Priorities (if not all selected)
  // There are 4 possible priorities: low, medium, high, critical
  if (advancedFilters.priorities.length > 0 && advancedFilters.priorities.length < 4) {
    filters.priority = advancedFilters.priorities;
  }

  // Delegated tasks
  if (advancedFilters.isDelegated) {
    filters.is_delegated = true;
  }

  // Has subtasks filter
  if (advancedFilters.hasSubtasks === true) {
    filters.has_subtasks = true;
  } else if (advancedFilters.hasSubtasks === false) {
    filters.has_subtasks = false;
  }

  // Sorting
  if (advancedFilters.sortBy) {
    filters.sort_by = advancedFilters.sortBy;
  }
  if (advancedFilters.sortDirection) {
    filters.sort_order = advancedFilters.sortDirection;
  }



  return filters;
};

/**
 * Apply client-side filters that cannot be done via API
 * Note: Subtasks filter is now done server-side, only overdue deadline remains client-side
 */
export const applyClientSideFilters = (
  tasks: Task[],
  advancedFilters: AdvancedTaskFilters
): Task[] => {
  let filtered = [...tasks];

  // Filter by overdue deadline
  if (advancedFilters.hasOverdueDeadline) {
    const now = new Date();
    filtered = filtered.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      return new Date(t.due_date) < now;
    });
  }

  return filtered;
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
