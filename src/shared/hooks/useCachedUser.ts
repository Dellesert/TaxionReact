/**
 * Cached User Hook
 * Хук для получения пользователя с кэшированием
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserById, getUsers } from '@/api/user.api';
import { useUserStore } from '@shared/store';
import { User } from '@/types/user.types';

interface UseCachedUserOptions {
  enabled?: boolean;
}

interface UseCachedUserResult {
  data: User | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Получить пользователя по ID с кэшированием
 */
export const useCachedUser = (
  userId: number | undefined,
  options?: UseCachedUserOptions
): UseCachedUserResult => {
  const { getCachedUser, cacheUser } = useUserStore();
  const [data, setData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    if (!userId) return;

    // Check local cache first
    const cachedUser = getCachedUser(userId);
    if (cachedUser) {
      setData(cachedUser);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = await getUserById(userId);
      cacheUser(user);
      setData(user);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch user'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, getCachedUser, cacheUser]);

  useEffect(() => {
    if (options?.enabled === false) return;
    fetchUser();
  }, [fetchUser, options?.enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchUser,
  };
};

/**
 * Хук для prefetch и кэширования пользователей
 */
export const useUserCacheActions = () => {
  const { cacheUser, cacheUsers, invalidateUser, clearCache } = useUserStore();

  const prefetchUser = useCallback(async (userId: number) => {
    try {
      const user = await getUserById(userId);
      cacheUser(user);
      return user;
    } catch (e) {
      console.warn('[UserCache] Failed to prefetch user:', e);
      return null;
    }
  }, [cacheUser]);

  const prefetchUsers = useCallback(async (userIds: number[]) => {
    try {
      const response = await getUsers({ search: '' }, { limit: 100, offset: 0 });
      const users = (response.data || []).filter(u => userIds.includes(u.id));
      cacheUsers(users);
      return users;
    } catch (e) {
      console.warn('[UserCache] Failed to prefetch users:', e);
      return [];
    }
  }, [cacheUsers]);

  const invalidateUserCache = useCallback((userId: number) => {
    invalidateUser(userId);
  }, [invalidateUser]);

  const clearUserCache = useCallback(() => {
    clearCache();
  }, [clearCache]);

  return {
    prefetchUser,
    prefetchUsers,
    invalidateUserCache,
    clearUserCache,
  };
};
