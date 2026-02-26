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

// Maximum number of cached date ranges to keep (prevents unbounded growth)
const MAX_CACHE_ENTRIES = 30;

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
    // Skip preload if stored data is too large (> 500KB) to avoid blocking main thread
    if (stored && stored.length < 500_000) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.eventsByRange && typeof parsed.state.eventsByRange === 'object') {
        const entries = Object.entries(parsed.state.eventsByRange);
        // Only keep the most recent entries within limit
        if (entries.length > MAX_CACHE_ENTRIES) {
          preloadedEventsByRange = Object.fromEntries(entries.slice(-MAX_CACHE_ENTRIES)) as Record<string, Event[]>;
        } else {
          preloadedEventsByRange = parsed.state.eventsByRange;
        }
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
        set((state) => {
          const updated = {
            ...state.eventsByRange,
            [rangeKey]: events,
          };
          // Evict oldest entries if cache exceeds limit
          const keys = Object.keys(updated);
          if (keys.length > MAX_CACHE_ENTRIES) {
            const toRemove = keys.slice(0, keys.length - MAX_CACHE_ENTRIES);
            for (const key of toRemove) {
              delete updated[key];
            }
          }
          return {
            eventsByRange: updated,
            lastUpdated: Date.now(),
          };
        });
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
