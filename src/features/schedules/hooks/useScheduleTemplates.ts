import { useCallback, useEffect } from 'react';
import { useScheduleStore } from '../store/scheduleStore';

export const useScheduleTemplates = () => {
  const {
    templates,
    isLoading,
    isSubmitting,
    error,
    loadTemplates,
    applyTemplate,
    clearError,
  } = useScheduleStore();

  // Initial load
  useEffect(() => {
    loadTemplates();
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Apply template to schedule
  const apply = useCallback(
    async (
      templateId: number,
      scheduleId: number,
      startDate: string,
      endDate: string,
      userIds?: number[]
    ) => {
      return applyTemplate(templateId, scheduleId, startDate, endDate, userIds);
    },
    [applyTemplate]
  );

  return {
    templates,
    isLoading,
    isSubmitting,
    error,
    refresh,
    applyTemplate: apply,
    clearError,
  };
};
