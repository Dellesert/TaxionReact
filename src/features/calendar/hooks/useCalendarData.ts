import { useState, useCallback, useEffect } from 'react';
import { Event, CalendarView } from '../types/calendar.types';
import { getDateRangeForView } from '../utils/calendarHelpers';
import { mockGetEvents, isMockMode } from '@shared/utils/mockData';
import * as calendarApi from '../api/calendar.api';
import { useCalendarStore } from '@shared/store/calendarStore';

interface UseCalendarDataReturn {
  events: Event[];
  isLoading: boolean;
  refreshing: boolean;
  loadEvents: () => Promise<void>;
  handleRefresh: () => Promise<void>;
}

/**
 * Format start date to ISO string preserving local calendar date
 * Uses the same calendar day components but formats as UTC midnight
 */
const toStartDateISOString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00Z`;
};

/**
 * Format end date to ISO string preserving local calendar date
 * Uses the same calendar day components but formats as UTC end of day
 */
const toEndDateISOString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T23:59:59Z`;
};

/**
 * Create cache key from date range (using local dates)
 */
const createRangeKey = (startDate: Date, endDate: Date): string => {
  const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
  const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return `${startKey}_${endKey}`;
};

/**
 * Hook for managing calendar events data
 */
export const useCalendarData = (
  selectedDate: Date,
  selectedView: CalendarView
): UseCalendarDataReturn => {
  // Cache store
  const setEventsForRange = useCalendarStore((state) => state.setEventsForRange);
  const getEventsForRange = useCalendarStore((state) => state.getEventsForRange);

  // Calculate range key
  const { startDate, endDate } = getDateRangeForView(selectedDate, selectedView);
  const rangeKey = createRangeKey(startDate, endDate);

  // Try to get cached events
  const cachedEvents = getEventsForRange(rangeKey);

  const [events, setEvents] = useState<Event[]>(cachedEvents || []);
  const [isLoading, setIsLoading] = useState(!cachedEvents);
  const [refreshing, setRefreshing] = useState(false);

  // Sync from cache when range changes
  useEffect(() => {
    const cached = getEventsForRange(rangeKey);
    if (cached) {
      setEvents(cached);
      setIsLoading(false);
    }
  }, [rangeKey]);

  const loadEvents = useCallback(async () => {
    try {
      // Only show loading if no cached data
      const cached = getEventsForRange(rangeKey);
      if (!cached) {
        setIsLoading(true);
      }

      if (isMockMode()) {
        const mockEvents = await mockGetEvents();
        setEvents(mockEvents);
      } else {
        const filters = {
          start: toStartDateISOString(startDate),
          end: toEndDateISOString(endDate),
        };

        const response = await calendarApi.getEvents(filters, 100, 0);
        setEvents(response.events);

        // Save to cache
        setEventsForRange(rangeKey, response.events);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedView, rangeKey, startDate, endDate, setEventsForRange, getEventsForRange]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  }, [loadEvents]);

  return {
    events,
    isLoading,
    refreshing,
    loadEvents,
    handleRefresh,
  };
};
