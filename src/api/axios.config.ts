/**
 * Axios Configuration
 * Настройка HTTP клиента с интерцепторами для токенов и обработки ошибок
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as secureStorage from '@utils/secureStorage';
import { API_BASE_URL, HTTP_STATUS, TIMEOUTS } from '@constants/api.constants';
import { STORAGE_KEYS } from '@constants/app.constants';
import { ApiError, ApiResponse } from '../types/common.types';
import { RefreshTokenResponse } from '../types/user.types';

/**
 * Generate User-Agent string based on platform
 */
const getUserAgent = (): string => {
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const appName = Constants.expoConfig?.name || 'Taxion';

  if (Platform.OS === 'web') {
    // For web, browser will use its own User-Agent
    return '';
  }

  // For mobile platforms
  const deviceName = Device.modelName || Device.deviceName || 'Unknown Device';
  const osVersion = Device.osVersion || 'Unknown';

  // Determine device type more accurately for iOS
  let deviceType = 'Unknown';
  let osName = 'Unknown';

  if (Platform.OS === 'ios') {
    osName = 'iOS';
    // Check if it's an iPad
    if (Device.modelName?.toLowerCase().includes('ipad') ||
        Device.deviceName?.toLowerCase().includes('ipad')) {
      deviceType = 'iPad';
    } else {
      deviceType = 'iPhone';
    }
  } else if (Platform.OS === 'android') {
    deviceType = 'Android';
    osName = 'Android';
  }

  return `${appName}/${appVersion} (${deviceType}; ${deviceName}; ${osName} ${osVersion})`;
};

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
 * Adds session ID and User-Agent to all requests (session-based auth)
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Try to get session ID from storage
    const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);

    if (sessionId && config.headers) {
      config.headers['X-Session-ID'] = sessionId;
    }

    // Add device info to request body for mobile platforms
    // iOS blocks all custom headers and User-Agent override, so we use request body instead
    if (Platform.OS !== 'web' && config.data && typeof config.data === 'object') {
      const userAgent = getUserAgent();

      // Add device_info to request body for POST/PUT requests
      config.data = {
        ...config.data,
        device_info: userAgent,
      };

      console.log('📱 Added device_info to request body:', userAgent);
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

    // Extract structured error data from response
    const responseData = error.response?.data as any;

    // Transform error to ApiError format (backward compatible)
    const apiError: ApiError = {
      message: responseData?.error || responseData?.message || error.message || 'An error occurred',
      code: error.code,
      status: error.response?.status,
      details: responseData,
      error_code: responseData?.error_code,
      request_id: responseData?.request_id,
      fields: responseData?.fields,
    };

    return Promise.reject(apiError);
  }
);

export default api;
