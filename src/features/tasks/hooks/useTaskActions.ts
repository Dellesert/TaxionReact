import { useCallback } from 'react';
import { Task } from '../types/task.types';
import * as taskApi from '../api/task.api';
import { areAllSubtasksCompleted, areAllChecklistItemsCompleted } from '../utils/taskHelpers';

/**
 * Custom hook for task actions (status changes, etc.)
 */
export const useTaskActions = (
  task: Task | null,
  subtasks: Task[],
  onTaskUpdated: () => void,
  onError: (message: string) => void
) => {
  const handleStatusChange = useCallback(
    async (newStatus: Task['status']) => {
      if (!task) return;

      // Check if trying to complete or submit for review with incomplete subtasks
      if (
        (newStatus === 'done' || newStatus === 'review') &&
        !areAllSubtasksCompleted(subtasks)
      ) {
        const action = newStatus === 'done' ? 'завершить задачу' : 'сдать на проверку';
        onError(
          `Невозможно ${action}. Пожалуйста, завершите все подзадачи перед тем, как продолжить.`
        );
        return;
      }

      // Check if trying to complete or submit for review with incomplete checklist items
      if (
        (newStatus === 'done' || newStatus === 'review') &&
        !areAllChecklistItemsCompleted(task)
      ) {
        const action = newStatus === 'done' ? 'завершить задачу' : 'сдать на проверку';
        onError(
          `Невозможно ${action}. Пожалуйста, завершите все пункты чек-листов перед тем, как продолжить.`
        );
        return;
      }

      try {
        await taskApi.updateTask(task.id, { status: newStatus });
        onTaskUpdated();
      } catch (error) {
        onError('Не удалось обновить статус');
      }
    },
    [task, subtasks, onTaskUpdated, onError]
  );

  const handleEmergencyComplete = useCallback(async () => {
    if (!task) return;

    try {
      await taskApi.emergencyCompleteTask(task.id);
      onTaskUpdated();
    } catch (error: any) {
      onError(`Не удалось завершить задачу: ${error.message || error}`);
    }
  }, [task, onTaskUpdated, onError]);

  const handleDeleteTask = useCallback(async () => {
    if (!task) return;

    try {
      await taskApi.deleteTask(task.id);
      onTaskUpdated();
    } catch (error: any) {
      onError(`Не удалось удалить задачу: ${error.message || error}`);
    }
  }, [task, onTaskUpdated, onError]);

  return {
    handleStatusChange,
    handleEmergencyComplete,
    handleDeleteTask,
  };
};
