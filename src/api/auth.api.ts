/**
 * Auth API
 * API клиент для аутентификации и авторизации
 */

import api from './axios.config';
import { API_ENDPOINTS } from '@constants/api.constants';
import {
  LoginDto,
  LoginResponse,
  RegisterDto,
  RegisterResponse,
  RefreshTokenDto,
  RefreshTokenResponse,
} from '../types/user.types';
import { ApiResponse } from '../types/common.types';

/**
 * Login user
 */
export const login = async (credentials: LoginDto): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>(
    API_ENDPOINTS.AUTH.LOGIN,
    credentials
  );
  return response.data;
};

/**
 * Register new user
 */
export const register = async (userData: RegisterDto): Promise<RegisterResponse> => {
  const response = await api.post<RegisterResponse>(
    API_ENDPOINTS.AUTH.REGISTER,
    userData
  );
  return response.data;
};

/**
 * Refresh access token
 */
export const refreshToken = async (data: RefreshTokenDto): Promise<RefreshTokenResponse> => {
  const response = await api.post<RefreshTokenResponse>(
    API_ENDPOINTS.AUTH.REFRESH,
    data
  );
  return response.data;
};

/**
 * Logout user
 */
export const logout = async (): Promise<void> => {
  await api.post(API_ENDPOINTS.AUTH.LOGOUT);
};
