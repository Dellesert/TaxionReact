import { useCallback, useEffect, useRef } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import type { ScheduleFilters } from '../types/schedule.types';

export const useSchedules = (initialFilters?: ScheduleFilters) => {
  const {
    schedules,
    isLoading,
    error,
    hasMore,
    total,
    filters,
    loadSchedules,
    setFilters,
    clearError,
  } = useScheduleStore();

  const hasLoadedRef = useRef(false);

  // Initial load - only once
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadSchedules(initialFilters, true);
    }
  }, []);

  // Refresh - reset hasMore to true before refreshing
  const refresh = useCallback(() => {
    useScheduleStore.setState({ hasMore: true });
    loadSchedules(filters, true);
  }, [filters, loadSchedules]);

  // Load more (pagination) - don't load if there's an error
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore && !error) {
      loadSchedules(filters, false);
    }
  }, [isLoading, hasMore, error, filters, loadSchedules]);

  // Update filters and reload
  const updateFilters = useCallback(
    (newFilters: ScheduleFilters) => {
      setFilters(newFilters);
      loadSchedules(newFilters, true);
    },
    [setFilters, loadSchedules]
  );

  return {
    schedules,
    isLoading,
    error,
    hasMore,
    total,
    filters,
    refresh,
    loadMore,
    updateFilters,
    clearError,
  };
};
