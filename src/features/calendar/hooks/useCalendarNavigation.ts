import { useState, useCallback } from 'react';
import { addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import { CalendarView } from '../types/calendar.types';

interface UseCalendarNavigationReturn {
  selectedDate: Date;
  selectedView: CalendarView;
  setSelectedView: (view: CalendarView) => void;
  handlePrevious: () => void;
  handleNext: () => void;
  handleToday: () => void;
  handleDatePress: (date: Date) => void;
}

/**
 * Hook for managing calendar navigation (date and view selection)
 */
export const useCalendarNavigation = (): UseCalendarNavigationReturn => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<CalendarView>('week');

  const handlePrevious = useCallback(() => {
    setSelectedDate((prevDate) => {
      if (selectedView === 'day') {
        return subDays(prevDate, 1);
      } else if (selectedView === 'week') {
        return subWeeks(prevDate, 1);
      } else {
        return subMonths(prevDate, 1);
      }
    });
  }, [selectedView]);

  const handleNext = useCallback(() => {
    setSelectedDate((prevDate) => {
      if (selectedView === 'day') {
        return addDays(prevDate, 1);
      } else if (selectedView === 'week') {
        return addWeeks(prevDate, 1);
      } else {
        return addMonths(prevDate, 1);
      }
    });
  }, [selectedView]);

  const handleToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const handleDatePress = useCallback((date: Date) => {
    setSelectedDate(date);
    // Switch to day view when clicking on a date in month view
    if (selectedView === 'month') {
      setSelectedView('day');
    }
  }, [selectedView]);

  return {
    selectedDate,
    selectedView,
    setSelectedView,
    handlePrevious,
    handleNext,
    handleToday,
    handleDatePress,
  };
};
