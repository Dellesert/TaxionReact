/**
 * Account Store
 * Zustand store для управления несколькими аккаунтами.
 * Реактивная обёртка над accountManager для UI.
 */

import { create } from 'zustand';
import { SavedAccount } from '@/types/account.types';
import * as accountManager from '@services/accountManager';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { websocketService } from '@services/websocket.service';
import { clearAllStorages } from '@shared/storage';
import { clearSyncMetadata } from '@shared/storage/syncMetadata';
import { useChatStore } from './chatStore';
import { useTaskStore } from './taskStore';
import { usePollStore } from './pollStore';
import { useCalendarStore } from './calendarStore';
import { useUserStore } from './userStore';
import { useAuthStore } from './authStore';
import * as authApi from '@/features/auth/api/auth.api';
import * as userApi from '@api/user.api';
import { isMockMode } from '@shared/utils/mockData';

interface AccountStoreState {
  // State
  savedAccounts: SavedAccount[];
  isSwitching: boolean;
  switchError: string | null;

  // Actions
  loadAccounts: () => Promise<void>;
  quickSwitch: (userId: number) => Promise<void>;
  secureSwitch: (userId: number) => Promise<void>;
  addCurrentAccount: () => Promise<void>;
  removeAccount: (userId: number) => Promise<void>;
  deleteOwnAccount: () => Promise<void>;
  clearSwitchError: () => void;
}

/**
 * Очищает все in-memory Zustand stores (чаты, задачи, опросы, календарь, пользователи)
 * и MMKV/AsyncStorage кеши. НЕ трогает authStore.
 */
async function clearAllInMemoryStores(): Promise<void> {
  useChatStore.getState().set({
    chats: [],
    tabs: {
      all: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
      private: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
      group: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
      favorite: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
    },
    messages: {},
    totalUnreadCount: 0,
  });
  useTaskStore.getState().clearCache();
  usePollStore.getState().clearCache();
  useCalendarStore.getState().clearCache();
  useUserStore.getState().clearCache();

  await clearAllStorages();
  await clearSyncMetadata();
}

export const useAccountStore = create<AccountStoreState>((set, get) => ({
  savedAccounts: [],
  isSwitching: false,
  switchError: null,

  loadAccounts: async () => {
    const accounts = await accountManager.getSavedAccounts();
    set({ savedAccounts: accounts });
  },

  /**
   * Quick switch: текущая сессия остаётся на сервере, переключаемся локально.
   */
  quickSwitch: async (targetUserId: number) => {
    try {
      set({ isSwitching: true, switchError: null });

      const currentUser = useAuthStore.getState().user;
      const currentSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);

      // 1. Сохранить текущий аккаунт
      if (currentUser && currentSessionId) {
        await accountManager.saveAccountAfterLogin(currentUser, currentSessionId);
      }

      // 2. Отключить WebSocket
      websocketService.disconnect();

      // 3. Очистить все кеши и stores
      await clearAllInMemoryStores();

      // 4. Проверить что у целевого аккаунта есть сессия
      const targetSessionId = await accountManager.getAccountSessionId(targetUserId);
      if (!targetSessionId) {
        await accountManager.markAccountSessionInvalid(targetUserId);
        // Очищаем legacy ключи и переходим на Login
        await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
        await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
        await accountManager.setActiveAccountId(targetUserId);

        useAuthStore.setState({
          user: null,
          sessionId: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });

        await get().loadAccounts();
        set({ isSwitching: false, switchError: 'session_expired' });
        return;
      }

      // 5. Установить активный аккаунт и синхронизировать legacy ключи
      await accountManager.setActiveAccountId(targetUserId);
      await accountManager.syncLegacyKeys(targetUserId);

      // 6. Проверить валидность сессии через getProfile
      try {
        const profile = await userApi.getProfile();
        // Обновить данные аккаунта свежим профилем
        await accountManager.setAccountUserData(targetUserId, profile);
        await accountManager.updateAccountMetadata(targetUserId, profile);
        await accountManager.syncLegacyKeys(targetUserId);

        useAuthStore.setState({
          user: profile,
          sessionId: targetSessionId,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (error: any) {
        // Сессия истекла на сервере (401)
        await accountManager.markAccountSessionInvalid(targetUserId);
        await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
        await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

        useAuthStore.setState({
          user: null,
          sessionId: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });

        await get().loadAccounts();
        set({ isSwitching: false, switchError: 'session_expired' });
        return;
      }

      // 7. Reconnect WebSocket
      websocketService.connect();

      // 8. Обновить список аккаунтов
      await get().loadAccounts();
      set({ isSwitching: false });
    } catch (error: any) {
      console.error('[AccountStore] Quick switch failed:', error);
      set({ isSwitching: false, switchError: error.message || 'Switch failed' });
    }
  },

  /**
   * Secure switch: уничтожить текущую сессию на сервере, затем переключиться.
   * Если у целевого аккаунта нет сессии — пользователь увидит экран логина.
   */
  secureSwitch: async (targetUserId: number) => {
    try {
      set({ isSwitching: true, switchError: null });

      const currentUser = useAuthStore.getState().user;

      // 1. Отключить WebSocket
      websocketService.disconnect();

      // 2. Вызвать logout API для инвалидации сессии на сервере
      if (!isMockMode()) {
        try {
          await authApi.logout();
        } catch (e) {
          console.error('[AccountStore] Logout API call failed:', e);
        }
      }

      // 3. Пометить сессию текущего аккаунта как невалидную
      if (currentUser) {
        await accountManager.markAccountSessionInvalid(currentUser.id);
      }

      // 4. Очистить все кеши и stores
      await clearAllInMemoryStores();

      // 5. Проверить есть ли сессия у целевого аккаунта
      const targetSessionId = await accountManager.getAccountSessionId(targetUserId);

      if (targetSessionId) {
        // У целевого есть сессия — переключаемся
        await accountManager.setActiveAccountId(targetUserId);
        await accountManager.syncLegacyKeys(targetUserId);

        try {
          const profile = await userApi.getProfile();
          await accountManager.setAccountUserData(targetUserId, profile);
          await accountManager.updateAccountMetadata(targetUserId, profile);
          await accountManager.syncLegacyKeys(targetUserId);

          useAuthStore.setState({
            user: profile,
            sessionId: targetSessionId,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          websocketService.connect();
        } catch {
          // Сессия целевого тоже истекла
          await accountManager.markAccountSessionInvalid(targetUserId);
          await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
          await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

          useAuthStore.setState({
            user: null,
            sessionId: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      } else {
        // У целевого нет сессии — показать экран логина
        await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
        await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
        await accountManager.setActiveAccountId(targetUserId);

        useAuthStore.setState({
          user: null,
          sessionId: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }

      // 6. Обновить список аккаунтов
      await get().loadAccounts();
      set({ isSwitching: false });
    } catch (error: any) {
      console.error('[AccountStore] Secure switch failed:', error);
      set({ isSwitching: false, switchError: error.message || 'Switch failed' });
    }
  },

  /**
   * Сохранить текущий аккаунт в список (вызывается из authStore после логина).
   */
  addCurrentAccount: async () => {
    const user = useAuthStore.getState().user;
    const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
    if (user && sessionId) {
      await accountManager.saveAccountAfterLogin(user, sessionId);
      await get().loadAccounts();
    }
  },

  /**
   * Удалить аккаунт из сохранённых. Нельзя удалить активный.
   */
  removeAccount: async (userId: number) => {
    const activeId = await accountManager.getActiveAccountId();
    if (userId === activeId) {
      return; // Нельзя удалить активный аккаунт
    }
    await accountManager.removeAccount(userId);
    await get().loadAccounts();
  },

  /**
   * Удалить свой аккаунт полностью (с сервера).
   */
  deleteOwnAccount: async () => {
    try {
      set({ isSwitching: true, switchError: null });

      const currentUser = useAuthStore.getState().user;

      // 1. Удалить аккаунт на сервере
      await userApi.deleteSelfAccount();

      // 2. Отключить WebSocket
      websocketService.disconnect();

      // 3. Удалить из сохранённых аккаунтов
      if (currentUser) {
        await accountManager.removeAccount(currentUser.id);
      }

      // 4. Очистить все кеши и stores
      await clearAllInMemoryStores();

      // 5. Очистить auth данные
      await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
      await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

      useAuthStore.setState({
        user: null,
        sessionId: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });

      // 6. Обновить список аккаунтов
      await get().loadAccounts();
      set({ isSwitching: false });
    } catch (error: any) {
      console.error('[AccountStore] Delete own account failed:', error);
      set({ isSwitching: false, switchError: error.message || 'Delete failed' });
    }
  },

  clearSwitchError: () => set({ switchError: null }),
}));
