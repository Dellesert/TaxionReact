/**
 * Poll Store
 * Кэширование опросов с использованием Zustand + MMKV
 *
 * MMKV кэширование на native (iOS/Android)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Poll } from '@/features/polls/types/poll.types';
import { getZustandPollStorage, isNative } from '@shared/storage';

interface PollCacheStore {
  // Cached data
  polls: Poll[];
  total: number;
  lastUpdated: number | null;

  // Actions
  setPolls: (polls: Poll[], total: number) => void;
  appendPolls: (polls: Poll[]) => void;
  /** Merge updated polls (for differential sync) */
  mergePolls: (polls: Poll[]) => void;
  /** Remove deleted polls by IDs (for differential sync) */
  removePolls: (pollIds: number[]) => void;
  getCachedPolls: () => Poll[];
  clearCache: () => void;
}

// Pre-load from localStorage on web (skipHydration prevents auto-rehydration)
let preloadedPolls: Poll[] | null = null;
let preloadedTotal: number | null = null;
if (!isNative) {
  try {
    const stored = localStorage.getItem('taxion-poll-storage:poll-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed?.state?.polls)) {
        preloadedPolls = parsed.state.polls;
      }
      if (typeof parsed?.state?.total === 'number') {
        preloadedTotal = parsed.state.total;
      }
    }
  } catch {
    // Ignore — will use initial state
  }
}

export const usePollStore = create<PollCacheStore>()(
  persist(
    (set, get) => ({
      polls: preloadedPolls || [],
      total: preloadedTotal ?? 0,
      lastUpdated: null,

      setPolls: (polls: Poll[], total: number) => {
        set({
          polls,
          total,
          lastUpdated: Date.now(),
        });
      },

      appendPolls: (newPolls: Poll[]) => {
        set((state) => {
          const existingIds = new Set(state.polls.map(p => p.id));
          const uniquePolls = newPolls.filter(p => !existingIds.has(p.id));
          return {
            polls: [...state.polls, ...uniquePolls],
            lastUpdated: Date.now(),
          };
        });
      },

      mergePolls: (updatedPolls: Poll[]) => {
        set((state) => {
          const pollMap = new Map(state.polls.map(p => [p.id, p]));

          // Update existing polls or add new ones
          for (const poll of updatedPolls) {
            pollMap.set(poll.id, poll);
          }

          return {
            polls: Array.from(pollMap.values()),
            lastUpdated: Date.now(),
          };
        });
      },

      removePolls: (pollIds: number[]) => {
        if (!pollIds || pollIds.length === 0) return;

        set((state) => {
          const idsToRemove = new Set(pollIds);
          const filteredPolls = state.polls.filter(p => !idsToRemove.has(p.id));

          return {
            polls: filteredPolls,
            total: Math.max(0, state.total - pollIds.length),
            lastUpdated: Date.now(),
          };
        });
      },

      getCachedPolls: () => get().polls,

      clearCache: () => {
        set({
          polls: [],
          total: 0,
          lastUpdated: null,
        });
      },
    }),
    {
      name: 'poll-storage',
      storage: createJSONStorage(() => getZustandPollStorage()),
      partialize: (state) => ({
        polls: state.polls,
        total: state.total,
        lastUpdated: state.lastUpdated,
      }),
      skipHydration: !isNative,
      version: 1,
    }
  )
);
