/**
 * Auth API
 * API клиент для аутентификации и авторизации
 */

import api from '@api/axios.config';
import { API_ENDPOINTS } from '@shared/constants/api.constants';
import {
  LoginDto,
  LoginResponse,
  RegisterDto,
  RegisterResponse,
  RefreshTokenDto,
  RefreshTokenResponse,
  Send2FADto,
  Send2FAResponse,
  Verify2FADto,
  Verify2FAResponse,
  PasskeyLoginBeginDto,
  PasskeyLoginBeginResponse,
  PasskeyLoginFinishResponse,
  PasskeyRegisterBeginResponse,
  PasskeyRegisterFinishDto,
  PasskeyRegisterFinishResponse,
  PasskeyListResponse,
  UpdatePasskeyDto,
  Passkey,
} from '../../../types/user.types';
import { ApiResponse } from '../../../types/common.types';

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

/**
 * Send 2FA code to email
 */
export const send2FACode = async (data: Send2FADto): Promise<Send2FAResponse> => {
  const response = await api.post<Send2FAResponse>(
    API_ENDPOINTS.AUTH.SEND_2FA,
    data
  );
  return response.data;
};

/**
 * Verify 2FA code and complete login
 */
export const verify2FACode = async (data: Verify2FADto): Promise<Verify2FAResponse> => {
  const response = await api.post<Verify2FAResponse>(
    API_ENDPOINTS.AUTH.VERIFY_2FA,
    data
  );
  return response.data;
};

/**
 * Begin passkey login (get challenge) - Legacy: requires email
 */
export const beginPasskeyLogin = async (data: PasskeyLoginBeginDto): Promise<PasskeyLoginBeginResponse> => {
  const response = await api.post<PasskeyLoginBeginResponse>(
    API_ENDPOINTS.AUTH.PASSKEY_LOGIN_BEGIN,
    data
  );
  return response.data;
};

/**
 * Begin discoverable passkey login (get challenge) - New: no email required
 */
export const beginDiscoverablePasskeyLogin = async (): Promise<PasskeyLoginBeginResponse> => {
  const response = await api.post<PasskeyLoginBeginResponse>(
    API_ENDPOINTS.AUTH.PASSKEY_LOGIN_DISCOVERABLE_BEGIN,
    {}
  );
  return response.data;
};

/**
 * Finish passkey login (verify credential)
 */
export const finishPasskeyLogin = async (credential: any): Promise<PasskeyLoginFinishResponse> => {
  const response = await api.post<PasskeyLoginFinishResponse>(
    API_ENDPOINTS.AUTH.PASSKEY_LOGIN_FINISH,
    credential
  );
  return response.data;
};

/**
 * Begin passkey registration (get creation options)
 */
export const beginPasskeyRegister = async (): Promise<PasskeyRegisterBeginResponse> => {
  const response = await api.post<PasskeyRegisterBeginResponse>(
    API_ENDPOINTS.AUTH.PASSKEY_REGISTER_BEGIN
  );
  return response.data;
};

/**
 * Finish passkey registration (register credential)
 */
export const finishPasskeyRegister = async (data: PasskeyRegisterFinishDto): Promise<PasskeyRegisterFinishResponse> => {
  const response = await api.post<PasskeyRegisterFinishResponse>(
    API_ENDPOINTS.AUTH.PASSKEY_REGISTER_FINISH,
    data
  );
  return response.data;
};

/**
 * List user's passkeys
 */
export const listPasskeys = async (): Promise<PasskeyListResponse> => {
  const response = await api.get<PasskeyListResponse>(
    API_ENDPOINTS.AUTH.PASSKEY_LIST
  );
  return response.data;
};

/**
 * Delete passkey
 */
export const deletePasskey = async (id: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.AUTH.PASSKEY_DELETE(id));
};

/**
 * Update passkey name
 */
export const updatePasskey = async (id: number, data: UpdatePasskeyDto): Promise<Passkey> => {
  const response = await api.patch<Passkey>(
    API_ENDPOINTS.AUTH.PASSKEY_UPDATE(id),
    data
  );
  return response.data;
};
