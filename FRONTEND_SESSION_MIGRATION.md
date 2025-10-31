# Frontend Migration to Session Mode

## ✅ Хорошие новости!

У вас уже есть `withCredentials: true` в `axios.config.ts` (строка 20), это отлично! Теперь нужно обновить несколько файлов для работы с session mode.

## Изменения в файлах

### 1. axios.config.ts

**УДАЛИТЬ:** Весь код refresh token (строки 23-117, 167-205)
**УДАЛИТЬ:** Request interceptor с Authorization header (строки 123-145)

**ПРИЧИНА:** В session mode cookie управляется автоматически, не нужны токены в header и refresh logic.

<details>
<summary>Обновленный axios.config.ts</summary>

\`\`\`typescript
/**
 * Axios Configuration
 * Настройка HTTP клиента для session-based authentication
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, HTTP_STATUS, TIMEOUTS } from '@constants/api.constants';
import { ApiError } from '../types/common.types';

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUTS.DEFAULT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // КРИТИЧЕСКИ ВАЖНО для session mode!
});

/**
 * Response Interceptor
 * Handles session expiration and error responses
 */
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      message: error.message,
      responseData: error.response?.data,
    });

    // Handle 401 Unauthorized errors (session expired)
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED) {
      console.log('🔐 Session expired (401), redirecting to login...');

      // Clear user data from storage
      const { secureStorage } = await import('@utils/secureStorage');
      const { STORAGE_KEYS } = await import('@constants/app.constants');

      await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

      // Auth store will handle redirect to login
    }

    // Transform error to ApiError format
    const apiError: ApiError = {
      message: error.response?.data?.message || error.message || 'An error occurred',
      code: error.code,
      status: error.response?.status,
      details: error.response?.data,
    };

    return Promise.reject(apiError);
  }
);

export default api;
\`\`\`

</details>

### 2. authStore.ts

**ОБНОВИТЬ:** Убрать всю логику с токенами, работать только с user data

<details>
<summary>Обновленный authStore.ts</summary>

\`\`\`typescript
/**
 * Auth Store
 * Zustand store для управления аутентификацией (Session mode)
 */

import { create } from 'zustand';
import * as secureStorage from '@utils/secureStorage';
import { User, LoginDto, RegisterDto } from '../types/user.types';
import { STORAGE_KEYS } from '@constants/app.constants';
import * as authApi from '@api/auth.api';
import * as userApi from '@api/user.api';
import { isMockMode, mockLogin, mockRegister } from '@utils/mockData';
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
      console.log('🔄 Initializing auth from storage...');
      set({ isInitializing: true });

      // Migrate from SecureStore to AsyncStorage
      await secureStorage.migrateToAsyncStorage();

      // Load user data from storage
      const storedUser = await secureStorage.getItemAsync(STORAGE_KEYS.USER_DATA);

      if (storedUser) {
        const user = JSON.parse(storedUser);
        console.log('✅ Auth restored from storage:', user.email);

        // Verify session is still valid
        try {
          await userApi.getProfile(); // This will fail if session expired
          set({
            user,
            isAuthenticated: true,
            isInitializing: false,
          });
        } catch (error) {
          console.log('⚠️ Session expired, clearing user data');
          await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);
          set({ isInitializing: false });
        }
      } else {
        console.log('⚠️ No user data in storage');
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
        authMode: response.auth_mode,
        hasSession: !!response.session,
      });

      // Store only user data (session cookie is handled by browser)
      await secureStorage.setItemAsync(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(response.user)
      );

      console.log('✅ User data saved successfully!');

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
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

      // Clear user data from storage (cookie will be cleared by server)
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
\`\`\`

</details>

### 3. user.types.ts

**ОБНОВИТЬ:** Добавить типы для session mode

<details>
<summary>Добавить в user.types.ts</summary>

\`\`\`typescript
// Добавить новые типы
export interface SessionInfo {
  session_id: string;
  expires_at: number;
}

export type AuthMode = 'jwt' | 'session';

// Обновить LoginResponse
export interface LoginResponse {
  message: string;
  user: User;
  tokens?: TokenPair; // Опционально для JWT mode
  session?: SessionInfo; // Опционально для Session mode
  auth_mode: AuthMode;
  request_id?: string;
}
\`\`\`

</details>

### 4. tokenRefresh.service.ts

**УДАЛИТЬ ПОЛНОСТЬЮ** - больше не нужен в session mode!

## Дополнительные изменения

### Удалить неиспользуемые storage keys

В `app.constants.ts`:

\`\`\`typescript
export const STORAGE_KEYS = {
  // ACCESS_TOKEN: 'access_token', // ❌ Удалить
  // REFRESH_TOKEN: 'refresh_token', // ❌ Удалить
  USER_DATA: 'user_data', // ✅ Оставить
} as const;
\`\`\`

## Testing Checklist

После внесения изменений:

- [ ] Проверить login - должен успешно войти
- [ ] Проверить что cookie `session_id` установлен (в DevTools)
- [ ] Проверить authenticated requests - должны работать
- [ ] Проверить logout - должен удалить session на сервере
- [ ] Проверить что после logout не можем делать authenticated requests
- [ ] Проверить что при 401 редирект на login

## Важные замечания

### Cookies в React Native

В React Native / Expo cookies НЕ работают так же как в браузере! Для работы с cookies нужно использовать:

1. **react-native-cookies** или **@react-native-cookies/cookies**
2. Или использовать **WebView** для аутентификации

### Альтернативный подход для React Native

Если cookies не работают в вашем React Native app, backend может вернуть `session_id` в response, и вы можете:

1. Сохранять `session_id` в SecureStore
2. Отправлять его в header `X-Session-ID`

Backend уже поддерживает это! См. `auth.go:179`:
\`\`\`go
// Try to get from header as fallback
sessionID = c.GetHeader("X-Session-ID")
\`\`\`

### Вариант с X-Session-ID header

Если хотите использовать header вместо cookie:

\`\`\`typescript
// В axios.config.ts добавить interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const sessionId = await secureStorage.getItemAsync('SESSION_ID');
    if (sessionId && config.headers) {
      config.headers['X-Session-ID'] = sessionId;
    }
    return config;
  }
);

// В authStore.ts после login
const sessionId = response.session?.session_id;
if (sessionId) {
  await secureStorage.setItemAsync('SESSION_ID', sessionId);
}
\`\`\`

## Рекомендация

Для React Native / Expo приложения **рекомендую использовать X-Session-ID header** вместо cookies, так как это проще и надежнее.

Хотите чтобы я реализовал вариант с X-Session-ID header?
