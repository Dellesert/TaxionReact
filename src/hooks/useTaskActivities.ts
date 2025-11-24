import { useState, useCallback } from 'react';
import { TaskActivity } from '@/types/task.types';
import * as taskApi from '@api/task.api';

/**
 * Custom hook for managing task activities (history)
 */
export const useTaskActivities = (taskId: string) => {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  const loadActivities = useCallback(async () => {
    try {
      setIsLoadingActivities(true);
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTaskActivities(taskIdNum, 50, 0);
      setActivities(response.activities || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
      throw error;
    } finally {
      setIsLoadingActivities(false);
    }
  }, [taskId]);

  const loadActivitiesSilently = useCallback(async () => {
    try {
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTaskActivities(taskIdNum, 50, 0);
      setActivities(response.activities || []);
    } catch (error: any) {
      console.error('Failed to silently reload activities:', error);
    }
  }, [taskId]);

  return {
    activities,
    isLoadingActivities,
    loadActivities,
    loadActivitiesSilently,
  };
};
