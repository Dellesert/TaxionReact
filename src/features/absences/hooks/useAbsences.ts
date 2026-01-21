import { useCallback, useEffect } from 'react';
import { useAbsenceStore } from '../store/absenceStore';
import type { AbsenceFilters } from '../types/absence.types';

export const useAbsences = (filters?: AbsenceFilters) => {
  const {
    absences,
    isLoading,
    error,
    total,
    hasMore,
    loadAbsences,
    clearError,
  } = useAbsenceStore();

  const refresh = useCallback(() => {
    loadAbsences(filters, true);
  }, [loadAbsences, filters]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadAbsences(filters);
    }
  }, [loadAbsences, filters, isLoading, hasMore]);

  useEffect(() => {
    loadAbsences(filters, true);
  }, []);

  return {
    absences,
    isLoading,
    error,
    total,
    hasMore,
    refresh,
    loadMore,
    clearError,
  };
};
