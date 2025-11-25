import { Task } from '../types/task.types';

/**
 * Helper function to display user name or "Я" if it's current user
 */
export const getUserDisplayName = (
  userName: string,
  userId: number,
  currentUserId: number | undefined
): string => {
  return currentUserId && userId === currentUserId ? 'Я' : userName;
};

/**
 * Check if user can edit task
 * Creator (delegator) always has edit rights even if task is delegated
 */
export const canEditTask = (
  task: Task | null,
  userId: number | undefined,
  userRole: string | undefined
): boolean => {
  if (!task || !userId) return false;

  // Admins and super admins can edit any task
  if (userRole === 'admin' || userRole === 'super_admin') return true;

  // Creator (who delegated) can always edit
  if (task.created_by === userId) return true;

  // Task is done - no one can edit except admins
  if (task.status === 'done') return false;

  return false;
};

/**
 * Check if user can delete task
 */
export const canDeleteTask = (
  task: Task | null,
  userId: number | undefined,
  userRole: string | undefined
): boolean => {
  if (!task || !userId) return false;

  // Only super admin and task creator can delete
  if (userRole === 'super_admin') return true;
  if (task.created_by === userId) return true;

  return false;
};

/**
 * Check if user has access to view task (includes assignees and delegation chain)
 */
export const canViewTask = (task: Task | null, userId: number | undefined): boolean => {
  if (!task || !userId) return false;

  // Creator always has access
  if (task.created_by === userId) return true;

  // Assignees have access
  if (task.assignees) {
    for (const assignee of task.assignees) {
      if (assignee.id === userId) return true;
    }
  }

  // Users in delegation chain have access
  if (task.delegation_chain && Array.isArray(task.delegation_chain)) {
    for (const delegator of task.delegation_chain) {
      // Check both delegator_id and id fields (API may return different formats)
      if (delegator.delegator_id === userId || delegator.id === userId) return true;
    }
  }

  return false;
};

/**
 * Check if all subtasks are completed
 */
export const areAllSubtasksCompleted = (subtasks: Task[]): boolean => {
  if (!subtasks || subtasks.length === 0) {
    return true; // No subtasks, so all are "completed"
  }
  return subtasks.every((subtask) => subtask.status === 'done');
};

/**
 * Check if all checklist items are completed
 */
export const areAllChecklistItemsCompleted = (task: Task | null): boolean => {
  if (!task?.checklists || task.checklists.length === 0) {
    return true; // No checklists, so all are "completed"
  }

  // Get all items from all checklists
  const allItems = task.checklists.flatMap((checklist) => checklist.items);

  if (allItems.length === 0) {
    return true; // No items, so all are "completed"
  }

  return allItems.every((item) => item.is_completed);
};

/**
 * Check if task is delegated BY current user
 */
export const isDelegatedByUser = (task: Task | null, userId: number | undefined): boolean => {
  return !!(
    userId &&
    task &&
    task.delegated_from_user_id === userId &&
    task.created_by !== userId
  );
};

/**
 * Get task priority configuration
 */
export const getPriorityConfig = (priority: Task['priority']) => {
  const config = {
    low: { label: 'Низкий', color: '#10B981' },
    medium: { label: 'Средний', color: '#F59E0B' },
    high: { label: 'Высокий', color: '#F97316' },
    critical: { label: 'Критичный', color: '#EF4444' },
  };
  return config[priority];
};

/**
 * Get task status configuration
 */
export const getStatusConfig = (status: Task['status']) => {
  const config = {
    new: { label: 'Новая', color: '#F59E0B' },
    viewed: { label: 'Просмотрена', color: '#6B7280' },
    in_progress: { label: 'В работе', color: '#3B82F6' },
    review: { label: 'На проверке', color: '#8B5CF6' },
    done: { label: 'Выполнена', color: '#10B981' },
    cancelled: { label: 'Отменена', color: '#EF4444' },
  };
  return config[status];
};

/**
 * Get action button text based on task status
 */
export const getActionButtonText = (
  task: Task,
  isCreator: boolean,
  allSubtasksCompleted: boolean,
  allChecklistItemsCompleted: boolean
): string => {
  if (task.status === 'new') return 'Начать';
  if (task.status === 'in_progress') {
    if (!allSubtasksCompleted) {
      return 'Завершите подзадачи';
    }
    if (!allChecklistItemsCompleted) {
      return 'Завершите чек-листы';
    }
    // Creator can complete directly, assignee submits for review
    return isCreator ? 'Завершить' : 'Сдать на проверку';
  }
  if (task.status === 'review') return 'На проверке';
  return 'Завершена';
};
