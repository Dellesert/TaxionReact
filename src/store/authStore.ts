/**
 * Auth Store
 * Zustand store для управления аутентификацией и пользователем
 */

import { create } from 'zustand';
import * as secureStorage from '@utils/secureStorage';
import { User, TokenPair, LoginDto, RegisterDto } from '@types/user.types';
import { STORAGE_KEYS } from '@constants/app.constants';
import * as authApi from '@api/auth.api';
import * as userApi from '@api/user.api';
import { isMockMode, mockLogin, mockRegister } from '@utils/mockData';

interface AuthState {
  // State
  user: User | null;
  tokens: TokenPair | null;
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
  setTokens: (tokens: TokenPair) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  tokens: null,
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

      // Load tokens from secure storage
      const accessToken = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await secureStorage.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

      if (accessToken && refreshToken) {
        const tokens: TokenPair = {
          access_token: accessToken,
          refresh_token: refreshToken,
        };

        set({ tokens });

        // Load user data
        try {
          // In mock mode, load user from storage instead of API
          if (isMockMode()) {
            const storedUser = await secureStorage.getItemAsync(STORAGE_KEYS.USER_DATA);
            if (storedUser) {
              const user = JSON.parse(storedUser);
              set({
                user,
                isAuthenticated: true,
                isInitializing: false,
              });
            } else {
              set({ isInitializing: false });
            }
          } else {
            const user = await userApi.getProfile();
            set({
              user,
              isAuthenticated: true,
              isInitializing: false,
            });
          }
        } catch (error) {
          // Token might be expired, will be handled by axios interceptor
          console.error('Failed to load user profile:', error);
          set({ isInitializing: false });
        }
      } else {
        set({ isInitializing: false });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isInitializing: false });
    }
  },

  /**
   * Login user
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

      // Store tokens in secure storage
      await secureStorage.setItemAsync(
        STORAGE_KEYS.ACCESS_TOKEN,
        response.tokens.access_token
      );
      await secureStorage.setItemAsync(
        STORAGE_KEYS.REFRESH_TOKEN,
        response.tokens.refresh_token
      );

      // Store user data
      await secureStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));

      set({
        user: response.user,
        tokens: response.tokens,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
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
   * Logout user
   */
  logout: async () => {
    try {
      set({ isLoading: true });

      // Call logout API
      try {
        await authApi.logout();
      } catch (error) {
        console.error('Logout API call failed:', error);
      }

      // Clear tokens from secure storage
      await secureStorage.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await secureStorage.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

      // Clear state
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      set({ isLoading: false });
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
   * Set tokens
   */
  setTokens: (tokens: TokenPair) => {
    set({ tokens });
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },
}));
