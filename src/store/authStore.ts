/**
 * Auth Store
 * Zustand store для управления аутентификацией и пользователем
 */

import { create } from 'zustand';
import * as secureStorage from '@utils/secureStorage';
import { User, TokenPair, LoginDto, RegisterDto } from '../types/user.types';
import { STORAGE_KEYS } from '@constants/app.constants';
import * as authApi from '@api/auth.api';
import * as userApi from '@api/user.api';
import { isMockMode, mockLogin, mockRegister } from '@utils/mockData';
import { websocketService } from '@services/websocket.service';
import { tokenRefreshService } from '@services/tokenRefresh.service';

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
      console.log('🔄 Initializing auth from storage...');
      set({ isInitializing: true });

      // Load tokens from secure storage
      const accessToken = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await secureStorage.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

      console.log('🔑 Tokens loaded:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : null,
      });

      if (accessToken && refreshToken) {
        const tokens: TokenPair = {
          access_token: accessToken,
          refresh_token: refreshToken,
        };

        set({ tokens });

        // Load user data from storage (NOT from API)
        // This prevents 404 errors when token hasn't been set in axios yet
        const storedUser = await secureStorage.getItemAsync(STORAGE_KEYS.USER_DATA);
        if (storedUser) {
          const user = JSON.parse(storedUser);
          console.log('✅ Auth restored from storage:', user.email);
          set({
            user,
            isAuthenticated: true,
            isInitializing: false,
          });

          // Start automatic token refresh
          await tokenRefreshService.start();
        } else{
          console.log('⚠️ No user data in storage');
          // Clear tokens if user data is missing
          await secureStorage.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
          await secureStorage.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
          set({ isInitializing: false, tokens: null });
        }
      } else {
        console.log('⚠️ No tokens found in storage');
        set({ isInitializing: false });
      }
    } catch (error) {
      console.error('❌ Failed to initialize auth:', error);
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

      console.log('📝 Login response received:', {
        hasUser: !!response.user,
        hasTokens: !!response.tokens,
        hasAccessToken: !!response.tokens?.access_token,
        hasRefreshToken: !!response.tokens?.refresh_token,
      });

      // Store tokens in secure storage
      console.log('💾 Saving tokens to storage...');
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

      console.log('✅ Tokens saved successfully!');
      console.log('🔑 Verifying saved tokens...');
      const savedAccessToken = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const savedRefreshToken = await secureStorage.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      console.log('✓ Verification:', {
        accessTokenSaved: !!savedAccessToken,
        refreshTokenSaved: !!savedRefreshToken,
      });

      set({
        user: response.user,
        tokens: response.tokens,
        isAuthenticated: true,
        isLoading: false,
      });

      // Start automatic token refresh after successful login
      await tokenRefreshService.start();
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
   * Logout user
   */
  logout: async () => {
    try {
      set({ isLoading: true });

      // Stop token refresh service
      console.log('⏹️ Stopping token refresh service...');
      tokenRefreshService.stop();

      // Disconnect WebSocket first to update status to offline
      console.log('🔌 Disconnecting WebSocket...');
      websocketService.disconnect();

      // Call logout API only if not in mock mode
      if (!isMockMode()) {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout API call failed:', error);
        }
      } else {
        console.log('🔧 Mock logout - skipping API call');
      }

      // Clear tokens from secure storage
      await secureStorage.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await secureStorage.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

      console.log('✅ Logged out successfully');

      // Clear state
      set({
        user: null,
        tokens: null,
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
