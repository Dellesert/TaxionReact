/**
 * User Store
 * Кэширование профилей пользователей с использованием Zustand + MMKV
 *
 * MMKV кэширование на native (iOS/Android)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types/user.types';
import { getZustandUserStorage, isNative } from '@shared/storage';

interface CachedUser {
  user: User;
  cachedAt: number;
}

interface UserCacheStore {
  // Cached data - users by ID
  usersById: Record<number, CachedUser>;

  // Cache TTL in ms (default 30 minutes)
  cacheTTL: number;

  // Actions
  cacheUser: (user: User) => void;
  cacheUsers: (users: User[]) => void;
  getCachedUser: (id: number) => User | null;
  getCachedUsers: (ids: number[]) => Record<number, User>;
  isUserCacheValid: (id: number) => boolean;
  invalidateUser: (id: number) => void;
  clearCache: () => void;
}

const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

export const useUserStore = create<UserCacheStore>()(
  persist(
    (set, get) => ({
      usersById: {},
      cacheTTL: DEFAULT_TTL,

      cacheUser: (user: User) => {
        set((state) => ({
          usersById: {
            ...state.usersById,
            [user.id]: {
              user,
              cachedAt: Date.now(),
            },
          },
        }));
      },

      cacheUsers: (users: User[]) => {
        const now = Date.now();
        set((state) => {
          const newUsersById = { ...state.usersById };
          for (const user of users) {
            newUsersById[user.id] = {
              user,
              cachedAt: now,
            };
          }
          return { usersById: newUsersById };
        });
      },

      getCachedUser: (id: number) => {
        const state = get();
        const cached = state.usersById[id];
        if (!cached) return null;

        // Check if cache is still valid
        if (Date.now() - cached.cachedAt > state.cacheTTL) {
          return null;
        }

        return cached.user;
      },

      getCachedUsers: (ids: number[]) => {
        const state = get();
        const result: Record<number, User> = {};
        const now = Date.now();

        for (const id of ids) {
          const cached = state.usersById[id];
          if (cached && now - cached.cachedAt <= state.cacheTTL) {
            result[id] = cached.user;
          }
        }

        return result;
      },

      isUserCacheValid: (id: number) => {
        const state = get();
        const cached = state.usersById[id];
        if (!cached) return false;
        return Date.now() - cached.cachedAt <= state.cacheTTL;
      },

      invalidateUser: (id: number) => {
        set((state) => {
          const newUsersById = { ...state.usersById };
          delete newUsersById[id];
          return { usersById: newUsersById };
        });
      },

      clearCache: () => {
        set({ usersById: {} });
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => getZustandUserStorage()),
      partialize: (state) => ({
        usersById: state.usersById,
        cacheTTL: state.cacheTTL,
      }),
      skipHydration: !isNative,
      version: 1,
    }
  )
);
