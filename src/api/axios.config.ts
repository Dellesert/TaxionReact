/**
 * Axios Configuration
 * Настройка HTTP клиента с интерцепторами для токенов и обработки ошибок
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as secureStorage from '@utils/secureStorage';
import { API_BASE_URL, HTTP_STATUS, TIMEOUTS } from '@constants/api.constants';
import { STORAGE_KEYS } from '@constants/app.constants';
import { ApiError, ApiResponse } from '../types/common.types';
import { RefreshTokenResponse } from '../types/user.types';

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUTS.DEFAULT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

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
    console.log('🔄 Attempting to refresh access token...');
    const refreshToken = await secureStorage.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

    if (!refreshToken) {
      console.error('❌ No refresh token available');
      throw new Error('No refresh token available');
    }

    console.log('📤 Sending refresh token request to backend...');
    const response = await axios.post<ApiResponse<RefreshTokenResponse>>(
      `${API_BASE_URL}/api/v1/auth/refresh`,
      { refresh_token: refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('📥 Refresh token response received:', response.status);
    console.log('📦 Response data structure:', {
      hasTokens: !!response.data.tokens,
      hasData: !!response.data.data,
      responseKeys: Object.keys(response.data),
    });

    const tokens = response.data.tokens || response.data.data || response.data;
    console.log('🔑 Extracted tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
    });

    const { access_token, refresh_token: new_refresh_token } = tokens;

    // Store new tokens
    await secureStorage.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, access_token);
    await secureStorage.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, new_refresh_token);

    console.log('✅ Access token refreshed successfully!');
    return access_token;
  } catch (error) {
    console.error('❌ Failed to refresh access token:', error);
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

    console.log('🔐 Request interceptor:', {
      url: config.url,
      method: config.method,
      params: config.params,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
    });

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles token refresh and error responses
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

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized errors
    if (error.response?.status === HTTP_STATUS.UNAUTHORIZED && !originalRequest._retry) {
      console.log('🔐 Received 401 Unauthorized, attempting token refresh...');

      if (isRefreshing) {
        console.log('⏳ Token refresh already in progress, waiting...');
        // Wait for token refresh
        return new Promise((resolve) => {
          subscribeTokenRefresh(async (token: string) => {
            console.log('✅ Received refreshed token from queue');
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

        console.log('🔄 Retrying original request with new token...');
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed, clearing session...');
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
