import { useState, useCallback } from 'react';
import { Event, CalendarView } from '../types/calendar.types';
import { getDateRangeForView } from '../utils/calendarHelpers';
import { mockGetEvents, isMockMode } from '../utils/mockData';
import * as calendarApi from '../api/calendar.api';

interface UseCalendarDataReturn {
  events: Event[];
  isLoading: boolean;
  refreshing: boolean;
  loadEvents: () => Promise<void>;
  handleRefresh: () => Promise<void>;
}

/**
 * Hook for managing calendar events data
 */
export const useCalendarData = (
  selectedDate: Date,
  selectedView: CalendarView
): UseCalendarDataReturn => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);

      if (isMockMode()) {
        const mockEvents = await mockGetEvents();
        setEvents(mockEvents);
      } else {
        // Calculate date range based on view
        const { startDate, endDate } = getDateRangeForView(selectedDate, selectedView);

        const filters = {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        };

        const response = await calendarApi.getEvents(filters, 100, 0);
        setEvents(response.events);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedView]);

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
