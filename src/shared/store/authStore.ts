/**
 * Auth Store (Session Mode)
 * Zustand store для управления аутентификацией с использованием session-based auth
 *
 * ВНИМАНИЕ: Это обновленная версия auth store для session mode
 * Замените authStore.ts на этот файл (или скопируйте содержимое)
 */

import { create } from 'zustand';
import * as secureStorage from '@shared/utils/secureStorage';
import { User, LoginDto, RegisterDto } from '@/types/user.types';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import * as authApi from '@/features/auth/api/auth.api';
import * as userApi from '@api/user.api';
import { isMockMode, mockLogin, mockRegister } from '@shared/utils/mockData';
import { websocketService } from '@services/websocket.service';
import { clearAllStorages } from '@shared/storage';
import { clearSyncMetadata } from '@shared/storage/syncMetadata';
import * as accountManager from '@services/accountManager';
import { useChatStore } from './chatStore';
import { useTaskStore } from './taskStore';
import { usePollStore } from './pollStore';
import { useCalendarStore } from './calendarStore';
import { useUserStore } from './userStore';

interface AuthState {
  // State
  user: User | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (credentials: LoginDto) => Promise<void>;
  register: (userData: RegisterDto) => Promise<void>;
  logout: (options?: { skipApi?: boolean }) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  sessionId: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,

  /**
   * Initialize auth state from storage
   */
  initialize: async () => {
    try {
      set({ isInitializing: true });

      // Migrate from SecureStore to AsyncStorage (for Expo Go compatibility)
      await secureStorage.migrateToAsyncStorage();

      // Migrate single-account to multi-account scheme (no-op if already done)
      await accountManager.migrateToMultiAccount();

      // Load session ID from secure storage
      const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);

      if (sessionId) {
        // Load user data from storage
        const storedUser = await secureStorage.getItemAsync(STORAGE_KEYS.USER_DATA);
        if (storedUser) {
          const user = JSON.parse(storedUser);

          // Verify session is still valid by making an API call
          try {
            const currentUser = await userApi.getProfile();
            set({
              user: currentUser,
              sessionId,
              isAuthenticated: true,
              isInitializing: false,
            });
          } catch (error) {
            // Mark session as invalid in multi-account store
            if (user?.id) {
              await accountManager.markAccountSessionInvalid(user.id);
            }
            await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
            await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
            set({ sessionId: null, isInitializing: false });
          }
        } else {
          // Clear session ID if user data is missing
          await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
          set({ isInitializing: false });
        }
      } else {
        set({ isInitializing: false });
      }

      // Load accounts list for the account switcher UI
      // (lazy import to avoid circular dependency)
      const { useAccountStore } = require('./accountStore');
      await useAccountStore.getState().loadAccounts();
    } catch (error) {
      console.error('❌ Failed to initialize auth:', error);
      set({ isInitializing: false });
    }
  },

  /**
   * Login user (Session mode)
   */
  login: async (credentials: LoginDto) => {
    try {
      set({ isLoading: true, error: null });

      let response;

      // Use mock data if enabled
      if (isMockMode()) {
        response = await mockLogin(credentials.email, credentials.password);
      } else {
        response = await authApi.login(credentials);
      }


      // Блокируем доступ для super_admin - они должны использовать веб-панель
      if (response.user.role === 'super_admin') {
        set({ isLoading: false, error: 'Super admin access is restricted to web dashboard' });
        throw new Error('Super admin access is restricted to web dashboard. Please use the admin panel.');
      }

      // Store session ID in secure storage
      if (response.session?.session_id) {
        await secureStorage.setItemAsync(
          STORAGE_KEYS.SESSION_ID,
          response.session.session_id
        );
      }

      // Store user data
      await secureStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));

      const savedSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);

      set({
        user: response.user,
        sessionId: savedSessionId,
        isAuthenticated: true,
        isLoading: false,
      });

      // Save to multi-account store
      if (response.user && savedSessionId) {
        await accountManager.saveAccountAfterLogin(response.user, savedSessionId);
        const { useAccountStore } = require('./accountStore');
        await useAccountStore.getState().loadAccounts();
      }

      // No token refresh service needed for session mode!
    } catch (error: any) {
      console.error('❌ Login error:', error);
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Register new user
   */
  register: async (userData: RegisterDto) => {
    try {
      set({ isLoading: true, error: null });

      const response = await authApi.register(userData);

      // After registration, automatically login
      await get().login({
        email: userData.email,
        password: userData.password,
      });

      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Logout user (Session mode)
   * @param options.skipApi - Skip API call (useful when session already invalidated on server)
   */
  logout: async (options?: { skipApi?: boolean }) => {
    try {
      set({ isLoading: true });

      // Disconnect WebSocket first to update status to offline
      websocketService.disconnect();

      // Call logout API to invalidate session on server
      if (!isMockMode() && !options?.skipApi) {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout API call failed:', error);
        }
      } else if (isMockMode()) {
        console.log('🔧 Mock logout - skipping API call');
      }

      // Mark session as invalid in multi-account store
      const currentUser = get().user;
      if (currentUser) {
        await accountManager.markAccountSessionInvalid(currentUser.id);
      }

      // Clear session data from secure storage
      await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
      await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

      // Clear all MMKV caches (chats, tasks, polls, calendar, users)
      await clearAllStorages();

      // Clear sync metadata (differential sync timestamps)
      await clearSyncMetadata();

      // Clear Zustand stores in memory
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

      console.log('[Auth] All caches cleared on logout');

      // Refresh accounts list
      const { useAccountStore } = require('./accountStore');
      await useAccountStore.getState().loadAccounts();

      // Clear state
      set({
        user: null,
        sessionId: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('❌ Logout failed:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  /**
   * Refresh user data
   */
  refreshUser: async () => {
    try {
      const user = await userApi.getProfile();
      set({ user });

      // Update stored user data
      await secureStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      // Sync to per-account storage
      await accountManager.setAccountUserData(user.id, user);
      await accountManager.updateAccountMetadata(user.id, user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  },

  /**
   * Set user
   */
  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },
}));
