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

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (credentials: LoginDto) => Promise<void>;
  register: (userData: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
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
              isAuthenticated: true,
              isInitializing: false,
            });
          } catch (error) {
            console.log('⚠️ Session expired, clearing storage');
            await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
            await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
            set({ isInitializing: false });
          }
        } else {
          console.log('⚠️ No user data in storage');
          // Clear session ID if user data is missing
          await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
          set({ isInitializing: false });
        }
      } else {
        console.log('⚠️ No session ID found in storage');
        set({ isInitializing: false });
      }
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
        console.log('🔧 Using mock login');
        response = await mockLogin(credentials.email, credentials.password);
      } else {
        response = await authApi.login(credentials);
      }

      console.log('📝 Login response received:', {
        hasUser: !!response.user,
        userRole: response.user.role,
        authMode: response.auth_mode,
        hasSession: !!response.session,
        sessionIdPreview: response.session?.session_id ? response.session.session_id.substring(0, 20) + '...' : 'N/A',
      });

      // Блокируем доступ для super_admin - они должны использовать веб-панель
      if (response.user.role === 'super_admin') {
        console.log('🚫 Super admin access blocked - use web dashboard instead');
        set({ isLoading: false, error: 'Super admin access is restricted to web dashboard' });
        throw new Error('Super admin access is restricted to web dashboard. Please use the admin panel.');
      }

      // Store session ID in secure storage
      if (response.session?.session_id) {
        console.log('💾 Saving session ID to storage...');
        await secureStorage.setItemAsync(
          STORAGE_KEYS.SESSION_ID,
          response.session.session_id
        );
      }

      // Store user data
      await secureStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));

      console.log('✅ Session data saved successfully!');
      console.log('🔑 Verifying saved session...');
      const savedSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      console.log('✓ Verification:', {
        sessionIdSaved: !!savedSessionId,
      });

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });

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
   */
  logout: async () => {
    try {
      set({ isLoading: true });

      // Disconnect WebSocket first to update status to offline
      console.log('🔌 Disconnecting WebSocket...');
      websocketService.disconnect();

      // Call logout API to invalidate session on server
      if (!isMockMode()) {
        try {
          await authApi.logout();
          console.log('✅ Session invalidated on server');
        } catch (error) {
          console.error('Logout API call failed:', error);
        }
      } else {
        console.log('🔧 Mock logout - skipping API call');
      }

      // Clear session data from secure storage
      await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
      await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

      console.log('✅ Logged out successfully');

      // Clear state
      set({
        user: null,
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
