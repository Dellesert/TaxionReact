import { useState, useCallback, useMemo, useEffect } from 'react';
import { addWeeks, subWeeks, addMonths, subMonths, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeekMonday, getWeekDays, areSameDay } from '../utils/calendarHelpers';

export type MobileViewMode = 'week' | 'month';

const STORAGE_KEY = '@calendar_mobile_view_mode';

interface UseMobileCalendarStateReturn {
  // State
  weekStartDate: Date;
  selectedDate: Date | null;
  viewMode: MobileViewMode;
  weekDays: Date[];
  isViewModeLoaded: boolean;
  currentMonth: Date;

  // Actions
  handleDayPress: (date: Date) => void;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  handleMonthDateSelect: (date: Date) => void;
  toggleViewMode: () => void;
  navigateToToday: () => void;

  // For useCalendarData
  getEventsDateRange: () => { startDate: Date; endDate: Date };
  getMonthDateRange: () => { startDate: Date; endDate: Date };
}

/**
 * Hook for managing mobile calendar state
 * Provides week-based navigation with optional single day selection
 * Persists view mode preference to AsyncStorage
 */
export const useMobileCalendarState = (): UseMobileCalendarStateReturn => {
  // Initialize with current week's Monday
  const [weekStartDate, setWeekStartDate] = useState(() => getWeekMonday(new Date()));
  // null = show entire week, Date = show only that day
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<MobileViewMode>('week');
  const [isViewModeLoaded, setIsViewModeLoaded] = useState(false);
  // Current month for month view navigation
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  // Load saved view mode on mount
  useEffect(() => {
    const loadSavedViewMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedMode === 'week' || savedMode === 'month') {
          setViewMode(savedMode);
        }
      } catch (error) {
        console.error('[Calendar] Failed to load view mode:', error);
      } finally {
        setIsViewModeLoaded(true);
      }
    };
    loadSavedViewMode();
  }, []);

  // Save view mode when it changes
  const saveViewMode = useCallback(async (mode: MobileViewMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.error('[Calendar] Failed to save view mode:', error);
    }
  }, []);

  // Compute week days array
  const weekDays = useMemo(() => getWeekDays(weekStartDate), [weekStartDate]);

  // Handle day press in week strip
  const handleDayPress = useCallback((date: Date) => {
    setSelectedDate((prev) => {
      // If same day is clicked, reset to show whole week
      if (prev && areSameDay(prev, date)) {
        return null;
      }
      // Otherwise select the clicked day
      return date;
    });
  }, []);

  // Navigate to previous week
  const handlePrevWeek = useCallback(() => {
    setWeekStartDate((prev) => subWeeks(prev, 1));
    // Reset selected day when changing week
    setSelectedDate(null);
  }, []);

  // Navigate to next week
  const handleNextWeek = useCallback(() => {
    setWeekStartDate((prev) => addWeeks(prev, 1));
    // Reset selected day when changing week
    setSelectedDate(null);
  }, []);

  // Navigate to previous month
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  }, []);

  // Navigate to next month
  const handleNextMonth = useCallback(() => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  }, []);

  // Handle date selection from month view
  const handleMonthDateSelect = useCallback((date: Date) => {
    // Switch to week view with selected date
    setWeekStartDate(getWeekMonday(date));
    setSelectedDate(date);
    setViewMode('week');
    saveViewMode('week');
  }, [saveViewMode]);

  // Toggle between week and month view
  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const newMode = prev === 'week' ? 'month' : 'week';
      saveViewMode(newMode);
      return newMode;
    });
  }, [saveViewMode]);

  // Navigate to today
  const navigateToToday = useCallback(() => {
    const today = new Date();
    setWeekStartDate(getWeekMonday(today));
    setSelectedDate(null);
    setViewMode('week');
    saveViewMode('week');
  }, [saveViewMode]);

  // Get date range for fetching events
  const getEventsDateRange = useCallback(() => {
    if (selectedDate) {
      // Single day selected - fetch only that day
      return {
        startDate: startOfDay(selectedDate),
        endDate: endOfDay(selectedDate),
      };
    }
    // No specific day selected - fetch entire week
    return {
      startDate: weekStartDate,
      endDate: endOfWeek(weekStartDate, { weekStartsOn: 1 }),
    };
  }, [weekStartDate, selectedDate]);

  // Get date range for month view
  const getMonthDateRange = useCallback(() => {
    return {
      startDate: startOfMonth(currentMonth),
      endDate: endOfMonth(currentMonth),
    };
  }, [currentMonth]);

  return {
    weekStartDate,
    selectedDate,
    viewMode,
    weekDays,
    isViewModeLoaded,
    currentMonth,
    handleDayPress,
    handlePrevWeek,
    handleNextWeek,
    handlePrevMonth,
    handleNextMonth,
    handleMonthDateSelect,
    toggleViewMode,
    navigateToToday,
    getEventsDateRange,
    getMonthDateRange,
  };
};
