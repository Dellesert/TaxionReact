/**
 * Axios Configuration
 * Настройка HTTP клиента с интерцепторами для токенов и обработки ошибок
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as secureStorage from '@utils/secureStorage';
import { API_BASE_URL, HTTP_STATUS, TIMEOUTS } from '@constants/api.constants';
import { STORAGE_KEYS } from '@constants/app.constants';
import { ApiError, ApiResponse } from '@types/common.types';
import { RefreshTokenResponse } from '@types/user.types';

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUTS.DEFAULT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CORS credentials enabled for secure cross-origin requests
});

// Debug: Log configuration
console.log('📡 Axios configured with baseURL:', API_BASE_URL);
console.log('🔧 withCredentials:', true);

// Flag to prevent multiple refresh token requests
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

/**
 * Subscribe to token refresh
 */
const subscribeTokenRefresh = (callback: (token: string) => void): void => {
  refreshSubscribers.push(callback);
};

/**
 * Notify all subscribers when token is refreshed
 */
const onTokenRefreshed = (token: string): void => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

/**
 * Refresh access token
 */
const refreshAccessToken = async (): Promise<string> => {
  try {
    const refreshToken = await secureStorage.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post<ApiResponse<RefreshTokenResponse>>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      { refresh_token: refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { access_token, refresh_token: new_refresh_token } = response.data.tokens || response.data.data;

    // Store new tokens
    await secureStorage.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    await secureStorage.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, new_refresh_token);

    return access_token;
  } catch (error) {
    // Clear tokens and redirect to login
    await secureStorage.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await secureStorage.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

    throw error;
  }
};

/**
 * Request Interceptor
 * Adds authorization token to all requests
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log('🌐 API Request:', config.method?.toUpperCase(), config.baseURL + config.url);
    console.log('📦 API Payload:', config.data);
    console.log('🔐 withCredentials:', config.withCredentials);
    console.log('📋 Headers:', config.headers);

    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles token refresh and error responses
 */
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  async (error: AxiosError) => {
    console.error('❌ API Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      data: error.response?.data,
    });

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized errors
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for token refresh
        return new Promise((resolve) => {
          subscribeTokenRefresh(async (token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        isRefreshing = false;
        onTokenRefreshed(newToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshSubscribers = [];

        // Redirect to login screen will be handled by auth store
        return Promise.reject(refreshError);
      }
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
