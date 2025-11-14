/**
 * useTaskPermissions Hook
 * Хук для работы с правами доступа к задачам
 */

import { useMemo } from 'react';
import { Task, TaskPermissions } from '@/types/task.types';
import { useAuthStore } from '@store/authStore';

// Default permissions (no access)
const DEFAULT_PERMISSIONS: TaskPermissions = {
  can_view: false,
  can_view_subtasks: false,
  can_edit: false,
  can_change_status: false,
  can_check_items: false,
  can_create_subtasks: false,
  can_delegate: false,
  can_emergency_complete: false,
  can_assign_users: false,
  can_delete: false,
};

/**
 * Hook для получения прав доступа к задаче
 * Возвращает permissions из task.permissions (которые приходят с бэкенда)
 * или рассчитывает их на клиенте как fallback
 */
export const useTaskPermissions = (task: Task | null): TaskPermissions => {
  const { user } = useAuthStore();

  return useMemo(() => {
    // If no task or no user, return no permissions
    if (!task || !user) {
      return DEFAULT_PERMISSIONS;
    }

    // If backend provides permissions, use them (preferred)
    if (task.permissions) {
      return task.permissions;
    }

    // Fallback: calculate permissions on client side
    // This should not normally happen if backend is working correctly
    console.warn('Task permissions not provided by backend, calculating on client');
    return calculateClientPermissions(task, user.id);
  }, [task, user]);
};

/**
 * Fallback function to calculate permissions on client
 * Used only if backend doesn't provide permissions
 */
function calculateClientPermissions(task: Task, userId: number): TaskPermissions {
  const isCreator = task.created_by === userId;
  const isAssignee = task.assignees?.some(a => a.id === userId) ?? false;
  const isInDelegationChain = task.delegation_chain?.some(
    d => d.id === userId
  ) ?? false;

  // Creator has full access
  if (isCreator) {
    return {
      can_view: true,
      can_view_subtasks: true,
      can_edit: true,
      can_change_status: true,
      can_check_items: true,
      can_create_subtasks: true,
      can_delegate: true,
      can_emergency_complete: true,
      can_assign_users: true,
      can_delete: true,
    };
  }

  // Current assignee of main task
  if (isAssignee && !task.parent_task_id) {
    return {
      can_view: true,
      can_view_subtasks: true,
      can_edit: true,
      can_change_status: true,
      can_check_items: true,
      can_create_subtasks: true,
      can_delegate: true,
      can_emergency_complete: false,
      can_assign_users: true,
      can_delete: false,
    };
  }

  // Subtask assignee
  if (isAssignee && task.parent_task_id) {
    return {
      can_view: true,
      can_view_subtasks: false,
      can_edit: false,
      can_change_status: true,
      can_check_items: true,
      can_create_subtasks: false,
      can_delegate: false,
      can_emergency_complete: false,
      can_assign_users: false,
      can_delete: false,
    };
  }

  // In delegation chain (former assignee)
  if (isInDelegationChain) {
    // Check if task is overdue >3 days
    let canEmergency = false;
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      canEmergency = dueDate < threeDaysAgo;
    }

    return {
      can_view: true,
      can_view_subtasks: true,
      can_edit: false,
      can_change_status: false,
      can_check_items: false,
      can_create_subtasks: false,
      can_delegate: false,
      can_emergency_complete: canEmergency,
      can_assign_users: false,
      can_delete: false,
    };
  }

  // No access
  return DEFAULT_PERMISSIONS;
}

/**
 * Helper hook to check specific permission
 */
export const useHasPermission = (
  task: Task | null,
  permission: keyof TaskPermissions
): boolean => {
  const permissions = useTaskPermissions(task);
  return permissions[permission];
};
