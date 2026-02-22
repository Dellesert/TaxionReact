/**
 * Task Action Menu
 * Меню действий для задачи (редактировать, делегировать, удалить и т.д.)
 */

import React, { useMemo } from 'react';
import { ActionMenu, ActionMenuItem } from '@shared/components/common/ActionMenu';
import { useTheme } from '@shared/hooks/useTheme';
import type { Task, TaskPermissions } from '../../types/task.types';

interface TaskActionMenuProps {
  visible: boolean;
  task: Task | null;
  permissions: TaskPermissions;
  onClose: () => void;
  onEdit: () => void;
  onDelegate: () => void;
  onAddSubtask: () => void;
  onEmergencyComplete: () => void;
  onDelete: () => void;
  isDesktop?: boolean;
  buttonPosition?: { x: number; y: number; width: number; height: number };
}

export const TaskActionMenu: React.FC<TaskActionMenuProps> = ({
  visible,
  task,
  permissions,
  onClose,
  onEdit,
  onDelegate,
  onAddSubtask,
  onEmergencyComplete,
  onDelete,
  isDesktop = false,
  buttonPosition,
}) => {
  const { theme } = useTheme();

  const menuItems = useMemo(() => {
    const items: ActionMenuItem[] = [];

    // Edit option
    if (permissions.can_edit) {
      items.push({
        key: 'edit',
        icon: 'create-outline',
        label: 'Редактировать',
        color: theme.text,
        onPress: onEdit,
      });
    }

    // Delegate option (only for active tasks)
    if (permissions.can_delegate && task?.status !== 'done' && task?.status !== 'cancelled') {
      items.push({
        key: 'delegate',
        icon: 'git-branch-outline',
        label: 'Передать задачу',
        color: theme.text,
        onPress: onDelegate,
      });
    }

    // Add subtask option
    if (permissions.can_create_subtasks) {
      items.push({
        key: 'subtask',
        icon: 'add-circle-outline',
        label: 'Добавить подзадачу',
        color: theme.text,
        onPress: onAddSubtask,
      });
    }

    // Emergency complete option (only for active tasks)
    if (permissions.can_emergency_complete && task?.status !== 'done') {
      items.push({
        key: 'emergency',
        icon: 'warning-outline',
        label: 'Аварийное завершение',
        color: theme.warning,
        onPress: onEmergencyComplete,
      });
    }

    // Delete option
    if (permissions.can_delete) {
      items.push({
        key: 'delete',
        icon: 'trash-outline',
        label: 'Удалить',
        color: theme.error,
        onPress: onDelete,
      });
    }

    return items;
  }, [permissions, task?.status, theme.text, onEdit, onDelegate, onAddSubtask, onEmergencyComplete, onDelete]);

  if (menuItems.length === 0) {
    return null;
  }

  return (
    <ActionMenu
      visible={visible}
      items={menuItems}
      onClose={onClose}
      isDesktop={isDesktop}
      buttonPosition={buttonPosition}
    />
  );
};
