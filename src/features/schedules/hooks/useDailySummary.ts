import { useState, useCallback, useEffect, useRef } from 'react';
import { scheduleApi } from '../api/schedule.api';
import { useScheduleCacheStore } from '@shared/store/scheduleCacheStore';
import type { DailySummary } from '../types/schedule.types';

const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface UseDailySummaryOptions {
  enabled?: boolean;
}

export const useDailySummary = (options: UseDailySummaryOptions = {}) => {
  const { enabled = true } = options;
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const getSummaryForDate = useScheduleCacheStore((s) => s.getSummaryForDate);
  const setSummaryForDate = useScheduleCacheStore((s) => s.setSummaryForDate);

  const dateKey = formatDateForApi(selectedDate);
  const cachedSummary = getSummaryForDate(dateKey);

  const [summary, setSummary] = useState<DailySummary | null>(cachedSummary);
  const [isLoading, setIsLoading] = useState(!cachedSummary);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const loadSummary = useCallback(async (date: Date) => {
    if (loadingRef.current || !enabled) return;
    loadingRef.current = true;

    const key = formatDateForApi(date);
    const cached = getSummaryForDate(key);
    if (!cached) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await scheduleApi.getDailySummary(key);
      setSummary(response.summary);
      setSummaryForDate(key, response.summary);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось загрузить сводку';
      setError(message);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [enabled, getSummaryForDate, setSummaryForDate]);

  useEffect(() => {
    if (enabled) {
      const key = formatDateForApi(selectedDate);
      const cached = getSummaryForDate(key);
      if (cached) {
        setSummary(cached);
        setIsLoading(false);
      }
      loadSummary(selectedDate);
    }
  }, [selectedDate, loadSummary, enabled]);

  const changeDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const refresh = useCallback(() => {
    loadSummary(selectedDate);
  }, [selectedDate, loadSummary]);

  return {
    selectedDate,
    summary,
    isLoading,
    error,
    changeDate,
    refresh,
  };
};
