import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WeekDisplayMode } from '../types/calendar.types';

const STORAGE_KEY = '@calendar_week_display_mode';

/**
 * Hook for managing week display mode with persistence
 * Saves the selected mode (timeline/list) to AsyncStorage
 */
export const useWeekDisplayMode = () => {
  const [weekDisplayMode, setWeekDisplayModeState] = useState<WeekDisplayMode>('timeline');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved mode on mount
  useEffect(() => {
    loadSavedMode();
  }, []);

  const loadSavedMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedMode === 'timeline' || savedMode === 'list') {
        setWeekDisplayModeState(savedMode);
      }
    } catch (error) {
      console.error('Failed to load week display mode:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setWeekDisplayMode = async (mode: WeekDisplayMode) => {
    try {
      setWeekDisplayModeState(mode);
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save week display mode:', error);
    }
  };

  return {
    weekDisplayMode,
    setWeekDisplayMode,
    isLoaded,
  };
};
