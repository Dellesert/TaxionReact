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

// Session-based authentication - no token refresh needed!

/**
 * Request Interceptor
 * Adds session ID to all requests (session-based auth)
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Try to get session ID from storage
    const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);

    console.log('🔐 Request interceptor:', {
      url: config.url,
      method: config.method,
      params: config.params,
      hasSessionId: !!sessionId,
      sessionIdPreview: sessionId ? `${sessionId.substring(0, 20)}...` : 'NO SESSION',
    });

    if (sessionId && config.headers) {
      config.headers['X-Session-ID'] = sessionId;
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
      console.log('🔐 Session expired (401), clearing session data...');

      // Clear session data from storage
      await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
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
