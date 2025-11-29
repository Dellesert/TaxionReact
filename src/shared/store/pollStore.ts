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
  getCachedPolls: () => Poll[];
  clearCache: () => void;
}

export const usePollStore = create<PollCacheStore>()(
  persist(
    (set, get) => ({
      polls: [],
      total: 0,
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
