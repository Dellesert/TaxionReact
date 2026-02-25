import { useState, useCallback, useEffect, useRef } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import { useScheduleCacheStore } from '@shared/store/scheduleCacheStore';
import type { ScheduleFilters } from '../types/schedule.types';

const createRangeKey = (filters?: ScheduleFilters): string | null => {
  if (filters?.start_date && filters?.end_date) {
    return `${filters.start_date}_${filters.end_date}`;
  }
  return null;
};

export const useSchedules = (initialFilters?: ScheduleFilters) => {
  const {
    schedules,
    isLoading: storeIsLoading,
    error,
    hasMore,
    total,
    filters,
    loadSchedules,
    setFilters,
    clearError,
  } = useScheduleStore();

  const getSchedulesForRange = useScheduleCacheStore((s) => s.getSchedulesForRange);
  const setSchedulesForRange = useScheduleCacheStore((s) => s.setSchedulesForRange);

  const hasLoadedRef = useRef(false);
  const rangeKey = createRangeKey(initialFilters);
  const cachedSchedules = rangeKey ? getSchedulesForRange(rangeKey) : null;

  // If cache exists, don't show loading on mount
  const [isLoading, setIsLoading] = useState(!cachedSchedules);

  // Seed store with cached data immediately on mount
  useEffect(() => {
    if (cachedSchedules && !hasLoadedRef.current) {
      useScheduleStore.setState({ schedules: cachedSchedules, isLoading: false });
    }
  }, []);

  // Initial load - stale-while-revalidate
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      if (!cachedSchedules) {
        setIsLoading(true);
      }
      loadSchedules(initialFilters, true).then(() => {
        const freshSchedules = useScheduleStore.getState().schedules;
        if (rangeKey) {
          setSchedulesForRange(rangeKey, freshSchedules);
        }
        setIsLoading(false);
      });
    }
  }, []);

  // Refresh - reset hasMore to true before refreshing
  const refresh = useCallback(async () => {
    useScheduleStore.setState({ hasMore: true });
    await loadSchedules(filters, true);
    const freshSchedules = useScheduleStore.getState().schedules;
    const key = createRangeKey(filters);
    if (key) {
      setSchedulesForRange(key, freshSchedules);
    }
  }, [filters, loadSchedules, setSchedulesForRange]);

  // Load more (pagination) - don't load if there's an error
  const loadMore = useCallback(() => {
    if (!storeIsLoading && hasMore && !error) {
      loadSchedules(filters, false);
    }
  }, [storeIsLoading, hasMore, error, filters, loadSchedules]);

  // Load a specific page by offset
  const loadPage = useCallback(
    (offset: number) => {
      loadSchedules(filters, true, offset);
    },
    [filters, loadSchedules]
  );

  // Update filters and reload
  const updateFilters = useCallback(
    (newFilters: ScheduleFilters) => {
      const key = createRangeKey(newFilters);
      const cached = key ? getSchedulesForRange(key) : null;

      if (cached) {
        useScheduleStore.setState({ schedules: cached });
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }

      setFilters(newFilters);
      loadSchedules(newFilters, true).then(() => {
        const freshSchedules = useScheduleStore.getState().schedules;
        if (key) {
          setSchedulesForRange(key, freshSchedules);
        }
        setIsLoading(false);
      });
    },
    [setFilters, loadSchedules, getSchedulesForRange, setSchedulesForRange]
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
    loadPage,
    updateFilters,
    clearError,
  };
};
