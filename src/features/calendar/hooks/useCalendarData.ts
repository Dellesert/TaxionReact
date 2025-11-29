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
 * Create cache key from date range
 */
const createRangeKey = (startDate: Date, endDate: Date): string => {
  return `${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}`;
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
          start: startDate.toISOString(),
          end: endDate.toISOString(),
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
