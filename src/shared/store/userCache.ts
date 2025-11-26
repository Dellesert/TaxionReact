/**
 * User Cache Store
 * Глобальный кэш пользователей для предотвращения дублирования API запросов
 *
 * ВАЖНО: Это временное решение!
 * Оптимальное решение - бэкенд должен возвращать sender в каждом сообщении.
 */

import { create } from 'zustand';
import { User } from '@/types/user.types';
import { getUser as fetchUserFromApi } from '@api/user.api';

interface UserCacheState {
  // Кэш пользователей: userId -> User
  users: Record<number, User>;

  // ID пользователей, которые сейчас загружаются
  loading: Set<number>;

  // Получить пользователя из кэша (без загрузки)
  getUser: (userId: number) => User | undefined;

  // Загрузить одного пользователя (с кэшированием)
  fetchUser: (userId: number) => Promise<User>;

  // Предзагрузка пользователей батчем
  preloadUsers: (userIds: number[]) => Promise<void>;

  // Очистить кэш (при logout)
  clear: () => void;
}

export const useUserCache = create<UserCacheState>((set, get) => ({
  users: {},
  loading: new Set(),

  // Получить из кэша без загрузки
  getUser: (userId: number) => {
    return get().users[userId];
  },

  // Загрузить одного пользователя
  fetchUser: async (userId: number) => {
    const state = get();

    // Если уже есть в кэше - возвращаем
    if (state.users[userId]) {
      return state.users[userId];
    }

    // Если уже загружается - ждем
    if (state.loading.has(userId)) {
      return new Promise<User>((resolve, reject) => {
        const maxAttempts = 50; // 5 секунд максимум
        let attempts = 0;

        const interval = setInterval(() => {
          attempts++;
          const user = get().users[userId];

          if (user) {
            clearInterval(interval);
            resolve(user);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error(`Timeout loading user ${userId}`));
          }
        }, 100);
      });
    }

    // Отмечаем, что начали загрузку
    set((state) => ({
      loading: new Set(state.loading).add(userId),
    }));

    try {
      // Загружаем с бэкенда
      const user = await fetchUserFromApi(userId);

      // Сохраняем в кэш и убираем из loading
      set((state) => {
        const newLoading = new Set(state.loading);
        newLoading.delete(userId);

        return {
          users: { ...state.users, [userId]: user },
          loading: newLoading,
        };
      });

      return user;
    } catch (error) {
      // Убираем из loading при ошибке
      set((state) => {
        const newLoading = new Set(state.loading);
        newLoading.delete(userId);
        return { loading: newLoading };
      });

      throw error;
    }
  },

  // Предзагрузка списка пользователей
  preloadUsers: async (userIds: number[]) => {
    const state = get();

    // Фильтруем только тех, кого нет в кэше и не загружаются
    const toLoad = userIds.filter(
      (id) => !state.users[id] && !state.loading.has(id)
    );

    if (toLoad.length === 0) {
      return;
    }

    // Загружаем параллельно (но не более 10 одновременно)
    const chunks = [];
    const chunkSize = 10;

    for (let i = 0; i < toLoad.length; i += chunkSize) {
      chunks.push(toLoad.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map((userId) => get().fetchUser(userId))
      );
    }
  },

  // Очистить кэш
  clear: () => {
    set({ users: {}, loading: new Set() });
  },
}));
