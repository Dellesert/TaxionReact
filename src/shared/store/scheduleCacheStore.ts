/**
 * Schedule Cache Store
 * Кэширование графиков и дневных сводок с использованием Zustand + persist
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Schedule, DailySummary } from '@/features/schedules/types/schedule.types';
import { getZustandScheduleStorage, isNative } from '@shared/storage';

interface ScheduleCacheStore {
  // Cached schedule lists keyed by month range ("2026-02-01_2026-02-28")
  schedulesByRange: Record<string, Schedule[]>;
  // Cached daily summaries keyed by date ("2026-02-24")
  summaryByDate: Record<string, DailySummary>;
  lastUpdated: number | null;

  // Actions
  setSchedulesForRange: (rangeKey: string, schedules: Schedule[]) => void;
  getSchedulesForRange: (rangeKey: string) => Schedule[] | null;
  setSummaryForDate: (dateKey: string, summary: DailySummary) => void;
  getSummaryForDate: (dateKey: string) => DailySummary | null;
  clearCache: () => void;
}

// Pre-load from localStorage on web (skipHydration prevents auto-rehydration)
let preloadedSchedulesByRange: Record<string, Schedule[]> | null = null;
let preloadedSummaryByDate: Record<string, DailySummary> | null = null;
if (!isNative) {
  try {
    const stored = localStorage.getItem('taxion-schedule-storage:schedule-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.schedulesByRange && typeof parsed.state.schedulesByRange === 'object') {
        preloadedSchedulesByRange = parsed.state.schedulesByRange;
      }
      if (parsed?.state?.summaryByDate && typeof parsed.state.summaryByDate === 'object') {
        preloadedSummaryByDate = parsed.state.summaryByDate;
      }
    }
  } catch {
    // Ignore — will use initial state
  }
}

export const useScheduleCacheStore = create<ScheduleCacheStore>()(
  persist(
    (set, get) => ({
      schedulesByRange: preloadedSchedulesByRange || {},
      summaryByDate: preloadedSummaryByDate || {},
      lastUpdated: null,

      setSchedulesForRange: (rangeKey: string, schedules: Schedule[]) => {
        set((state) => ({
          schedulesByRange: {
            ...state.schedulesByRange,
            [rangeKey]: schedules,
          },
          lastUpdated: Date.now(),
        }));
      },

      getSchedulesForRange: (rangeKey: string) => {
        return get().schedulesByRange[rangeKey] || null;
      },

      setSummaryForDate: (dateKey: string, summary: DailySummary) => {
        set((state) => ({
          summaryByDate: {
            ...state.summaryByDate,
            [dateKey]: summary,
          },
          lastUpdated: Date.now(),
        }));
      },

      getSummaryForDate: (dateKey: string) => {
        return get().summaryByDate[dateKey] || null;
      },

      clearCache: () => {
        set({
          schedulesByRange: {},
          summaryByDate: {},
          lastUpdated: null,
        });
      },
    }),
    {
      name: 'schedule-storage',
      storage: createJSONStorage(() => getZustandScheduleStorage()),
      skipHydration: !isNative,
      version: 1,
    }
  )
);
