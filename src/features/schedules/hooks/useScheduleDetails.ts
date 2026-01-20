import { useCallback, useEffect } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import type { ScheduleEntryFilters } from '../types/schedule.types';

export const useScheduleDetails = (scheduleId: number) => {
  const {
    currentSchedule,
    entries,
    isLoading,
    isLoadingEntries,
    error,
    loadScheduleById,
    loadScheduleEntries,
    clearError,
  } = useScheduleStore();

  // Load schedule and entries
  useEffect(() => {
    loadScheduleById(scheduleId);
    loadScheduleEntries(scheduleId);
  }, [scheduleId]);

  // Refresh
  const refresh = useCallback(() => {
    loadScheduleById(scheduleId);
    loadScheduleEntries(scheduleId);
  }, [scheduleId, loadScheduleById, loadScheduleEntries]);

  // Filter entries
  const filterEntries = useCallback(
    (filters: ScheduleEntryFilters) => {
      loadScheduleEntries(scheduleId, filters);
    },
    [scheduleId, loadScheduleEntries]
  );

  return {
    schedule: currentSchedule,
    entries,
    isLoading,
    isLoadingEntries,
    error,
    refresh,
    filterEntries,
    clearError,
  };
};
