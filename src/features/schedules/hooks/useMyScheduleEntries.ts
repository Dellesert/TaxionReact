import { useCallback, useEffect, useMemo } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { useScheduleStore } from '../store/scheduleStore';
import { groupEntriesByDate } from '../utils/scheduleHelpers';

type ViewMode = 'week' | 'month';

export const useMyScheduleEntries = (
  viewMode: ViewMode = 'week',
  baseDate: Date = new Date()
) => {
  const { myEntries, isLoadingMyEntries, error, loadMyEntries, clearError } =
    useScheduleStore();

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(baseDate, { weekStartsOn: 1 }),
        end: endOfWeek(baseDate, { weekStartsOn: 1 }),
      };
    }
    return {
      start: startOfMonth(baseDate),
      end: endOfMonth(baseDate),
    };
  }, [viewMode, baseDate]);

  // Load entries when date range changes
  useEffect(() => {
    loadMyEntries(
      format(dateRange.start, 'yyyy-MM-dd'),
      format(dateRange.end, 'yyyy-MM-dd')
    );
  }, [dateRange.start.getTime(), dateRange.end.getTime(), loadMyEntries]);

  // Refresh
  const refresh = useCallback(() => {
    loadMyEntries(
      format(dateRange.start, 'yyyy-MM-dd'),
      format(dateRange.end, 'yyyy-MM-dd')
    );
  }, [dateRange, loadMyEntries]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    return groupEntriesByDate(myEntries);
  }, [myEntries]);

  return {
    entries: myEntries,
    entriesByDate,
    isLoading: isLoadingMyEntries,
    error,
    dateRange,
    refresh,
    clearError,
  };
};
