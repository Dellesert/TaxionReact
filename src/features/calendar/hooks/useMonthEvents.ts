import { useState, useCallback, useEffect } from 'react';
import { Event } from '../types/calendar.types';
import { startOfMonth, endOfMonth } from 'date-fns';
import { isMockMode } from '@shared/utils/mockData';
import * as calendarApi from '../api/calendar.api';
import { useCalendarStore } from '@shared/store/calendarStore';

interface UseMonthEventsReturn {
  monthEvents: Event[];
  isLoadingMonth: boolean;
  refreshMonthEvents: () => Promise<void>;
}

/**
 * Create cache key from date
 */
const createMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `month_${year}-${month}`;
};

/**
 * Hook for loading events for the entire month (for mini calendar)
 */
export const useMonthEvents = (selectedDate: Date): UseMonthEventsReturn => {
  // Cache store
  const setEventsForRange = useCalendarStore((state) => state.setEventsForRange);
  const getEventsForRange = useCalendarStore((state) => state.getEventsForRange);

  const monthKey = createMonthKey(selectedDate);
  const cachedEvents = getEventsForRange(monthKey);

  const [monthEvents, setMonthEvents] = useState<Event[]>(cachedEvents || []);
  const [isLoadingMonth, setIsLoadingMonth] = useState(!cachedEvents);

  const loadMonthEvents = useCallback(async () => {
    try {
      // Check cache first
      const cached = getEventsForRange(monthKey);
      if (cached) {
        setMonthEvents(cached);
        setIsLoadingMonth(false);
        return;
      }

      setIsLoadingMonth(true);

      if (isMockMode()) {
        // In mock mode, we can't load specific month data
        // Just use empty array or return all mock data
        setMonthEvents([]);
      } else {
        // Load events for the entire month
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);

        const filters = {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString(),
        };

        const response = await calendarApi.getEvents(filters, 100, 0);
        setMonthEvents(response.events);

        // Save to cache
        setEventsForRange(monthKey, response.events);
      }
    } catch (error) {
      console.error('Failed to load month events:', error);
    } finally {
      setIsLoadingMonth(false);
    }
  }, [selectedDate, monthKey, setEventsForRange, getEventsForRange]);

  // Load month events when month changes
  useEffect(() => {
    loadMonthEvents();
  }, [monthKey]);

  // Force refresh (bypasses cache)
  const refreshMonthEvents = useCallback(async () => {
    try {
      if (isMockMode()) {
        setMonthEvents([]);
        return;
      }
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      const filters = {
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
      };
      const response = await calendarApi.getEvents(filters, 100, 0);
      setMonthEvents(response.events);
      setEventsForRange(monthKey, response.events);
    } catch (error) {
      console.error('Failed to refresh month events:', error);
    }
  }, [selectedDate, monthKey, setEventsForRange]);

  return {
    monthEvents,
    isLoadingMonth,
    refreshMonthEvents,
  };
};
