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

export const useCalendarStore = create<CalendarCacheStore>()(
  persist(
    (set, get) => ({
      eventsByRange: {},
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
