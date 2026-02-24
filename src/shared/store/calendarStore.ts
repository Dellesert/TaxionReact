/**
 * Calendar Store
 * Кэширование событий календаря с использованием Zustand + MMKV
 *
 * MMKV кэширование на native (iOS/Android)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Event } from '@/features/calendar/types/calendar.types';
import { getZustandCalendarStorage, isNative } from '@shared/storage';

interface CalendarCacheStore {
  // Cached data - keyed by date range string
  eventsByRange: Record<string, Event[]>;
  lastUpdated: number | null;

  // Actions
  setEventsForRange: (rangeKey: string, events: Event[]) => void;
  getEventsForRange: (rangeKey: string) => Event[] | null;
  clearCache: () => void;
}

// Pre-load eventsByRange from localStorage on web for instant display
// (skipHydration prevents auto-rehydration, so we read manually)
let preloadedEventsByRange: Record<string, Event[]> | null = null;
if (!isNative) {
  try {
    const stored = localStorage.getItem('taxion-calendar-storage:calendar-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.eventsByRange && typeof parsed.state.eventsByRange === 'object') {
        preloadedEventsByRange = parsed.state.eventsByRange;
      }
    }
  } catch {
    // Ignore errors, will use initial state
  }
}

export const useCalendarStore = create<CalendarCacheStore>()(
  persist(
    (set, get) => ({
      eventsByRange: preloadedEventsByRange || {},
      lastUpdated: null,

      setEventsForRange: (rangeKey: string, events: Event[]) => {
        set((state) => ({
          eventsByRange: {
            ...state.eventsByRange,
            [rangeKey]: events,
          },
          lastUpdated: Date.now(),
        }));
      },

      getEventsForRange: (rangeKey: string) => {
        return get().eventsByRange[rangeKey] || null;
      },

      clearCache: () => {
        set({
          eventsByRange: {},
          lastUpdated: null,
        });
      },
    }),
    {
      name: 'calendar-storage',
      storage: createJSONStorage(() => getZustandCalendarStorage()),
      partialize: (state) => ({
        eventsByRange: state.eventsByRange,
        lastUpdated: state.lastUpdated,
      }),
      skipHydration: !isNative,
      version: 2,
    }
  )
);
