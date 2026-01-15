import { useState, useCallback, useRef } from 'react';
import { addMonths, subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { Event } from '../types/calendar.types';
import * as calendarApi from '../api/calendar.api';
import { useCalendarStore } from '@shared/store/calendarStore';
import { isMockMode, mockGetEvents } from '@shared/utils/mockData';

export interface MonthData {
  date: Date; // First day of month
  key: string; // "2025-01" format for keyExtractor
  events: Event[];
  isLoading: boolean;
  isLoaded: boolean;
}

interface UseInfiniteCalendarDataReturn {
  months: MonthData[];
  initialScrollIndex: number;
  loadEventsForMonth: (monthKey: string) => Promise<void>;
  addMonthsToEnd: (count: number) => void;
  addMonthsToStart: (count: number) => void;
  refreshMonth: (monthKey: string) => Promise<void>;
  refreshAllVisible: (visibleKeys: string[]) => Promise<void>;
}

/**
 * Generate month key from date
 */
const getMonthKey = (date: Date): string => {
  return format(date, 'yyyy-MM');
};

/**
 * Generate initial months array centered on current month
 */
const generateInitialMonths = (monthsBack: number, monthsForward: number): MonthData[] => {
  const today = new Date();
  const months: MonthData[] = [];

  // Add past months
  for (let i = monthsBack; i > 0; i--) {
    const date = startOfMonth(subMonths(today, i));
    months.push({
      date,
      key: getMonthKey(date),
      events: [],
      isLoading: false,
      isLoaded: false,
    });
  }

  // Add current month
  const currentDate = startOfMonth(today);
  months.push({
    date: currentDate,
    key: getMonthKey(currentDate),
    events: [],
    isLoading: false,
    isLoaded: false,
  });

  // Add future months
  for (let i = 1; i <= monthsForward; i++) {
    const date = startOfMonth(addMonths(today, i));
    months.push({
      date,
      key: getMonthKey(date),
      events: [],
      isLoading: false,
      isLoaded: false,
    });
  }

  return months;
};

/**
 * Hook for managing infinite calendar data
 * Provides months array for FlashList and lazy-loads events
 */
export const useInfiniteCalendarData = (): UseInfiniteCalendarDataReturn => {
  // Cache store
  const setEventsForRange = useCalendarStore((state) => state.setEventsForRange);
  const getEventsForRange = useCalendarStore((state) => state.getEventsForRange);

  // Initial months: 12 back, current, 11 forward = 24 total
  const MONTHS_BACK = 12;
  const MONTHS_FORWARD = 11;

  const [months, setMonths] = useState<MonthData[]>(() =>
    generateInitialMonths(MONTHS_BACK, MONTHS_FORWARD)
  );

  // Current month is at index MONTHS_BACK (12)
  const initialScrollIndex = MONTHS_BACK;

  // Track loading states to prevent duplicate requests
  const loadingRef = useRef<Set<string>>(new Set());

  /**
   * Load events for a specific month
   */
  const loadEventsForMonth = useCallback(
    async (monthKey: string) => {
      // Prevent duplicate loading
      if (loadingRef.current.has(monthKey)) {
        return;
      }

      // Find month in array
      const monthIndex = months.findIndex((m) => m.key === monthKey);
      if (monthIndex === -1) return;

      const month = months[monthIndex];

      // Skip if already loaded
      if (month.isLoaded) return;

      // Check cache first
      const cached = getEventsForRange(monthKey);
      if (cached) {
        setMonths((prev) =>
          prev.map((m) =>
            m.key === monthKey ? { ...m, events: cached, isLoaded: true, isLoading: false } : m
          )
        );
        return;
      }

      // Mark as loading
      loadingRef.current.add(monthKey);
      setMonths((prev) =>
        prev.map((m) => (m.key === monthKey ? { ...m, isLoading: true } : m))
      );

      try {
        const startDate = month.date;
        const endDate = endOfMonth(month.date);

        let events: Event[];

        if (isMockMode()) {
          events = await mockGetEvents();
        } else {
          const filters = {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          };
          const response = await calendarApi.getEvents(filters, 100, 0);
          events = response.events;
        }

        // Cache events
        setEventsForRange(monthKey, events);

        // Update state
        setMonths((prev) =>
          prev.map((m) =>
            m.key === monthKey ? { ...m, events, isLoaded: true, isLoading: false } : m
          )
        );
      } catch (error) {
        console.error(`[Calendar] Failed to load events for ${monthKey}:`, error);
        // Mark as not loading but not loaded (can retry)
        setMonths((prev) =>
          prev.map((m) => (m.key === monthKey ? { ...m, isLoading: false } : m))
        );
      } finally {
        loadingRef.current.delete(monthKey);
      }
    },
    [months, getEventsForRange, setEventsForRange]
  );

  /**
   * Add months to the end of the list (future)
   */
  const addMonthsToEnd = useCallback((count: number) => {
    setMonths((prev) => {
      const lastMonth = prev[prev.length - 1];
      const newMonths: MonthData[] = [];

      for (let i = 1; i <= count; i++) {
        const date = startOfMonth(addMonths(lastMonth.date, i));
        newMonths.push({
          date,
          key: getMonthKey(date),
          events: [],
          isLoading: false,
          isLoaded: false,
        });
      }

      return [...prev, ...newMonths];
    });
  }, []);

  /**
   * Add months to the start of the list (past)
   */
  const addMonthsToStart = useCallback((count: number) => {
    setMonths((prev) => {
      const firstMonth = prev[0];
      const newMonths: MonthData[] = [];

      for (let i = count; i > 0; i--) {
        const date = startOfMonth(subMonths(firstMonth.date, i));
        newMonths.push({
          date,
          key: getMonthKey(date),
          events: [],
          isLoading: false,
          isLoaded: false,
        });
      }

      return [...newMonths, ...prev];
    });
  }, []);

  /**
   * Refresh events for a specific month (force reload)
   */
  const refreshMonth = useCallback(
    async (monthKey: string) => {
      // Reset loaded state to force reload
      setMonths((prev) =>
        prev.map((m) => (m.key === monthKey ? { ...m, isLoaded: false } : m))
      );
      await loadEventsForMonth(monthKey);
    },
    [loadEventsForMonth]
  );

  /**
   * Refresh all visible months
   */
  const refreshAllVisible = useCallback(
    async (visibleKeys: string[]) => {
      // Reset loaded states
      setMonths((prev) =>
        prev.map((m) => (visibleKeys.includes(m.key) ? { ...m, isLoaded: false } : m))
      );

      // Load all in parallel
      await Promise.all(visibleKeys.map((key) => loadEventsForMonth(key)));
    },
    [loadEventsForMonth]
  );

  return {
    months,
    initialScrollIndex,
    loadEventsForMonth,
    addMonthsToEnd,
    addMonthsToStart,
    refreshMonth,
    refreshAllVisible,
  };
};
