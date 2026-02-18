/**
 * QR Auth API
 * API клиент для входа по QR-коду
 */

import api from '@shared/api/axios.config';
import { API_ENDPOINTS } from '@shared/constants/api.constants';

export interface QRGenerateResponse {
  token: string;
  expires_at: number;
  request_id: string;
}

export interface QRStatusResponse {
  status: 'pending' | 'confirmed' | 'expired';
  request_id: string;
  session?: {
    session_id: string;
    expires_at: number;
  };
  user?: any;
  auth_mode?: string;
}

/**
 * Generate QR login token (called from desktop)
 */
export const generateQRToken = async (): Promise<QRGenerateResponse> => {
  const response = await api.post<QRGenerateResponse>(
    API_ENDPOINTS.AUTH.QR_GENERATE
  );
  return response.data;
};

/**
 * Check QR token status (polling from desktop)
 */
export const getQRTokenStatus = async (token: string): Promise<QRStatusResponse> => {
  const response = await api.get<QRStatusResponse>(
    API_ENDPOINTS.AUTH.QR_STATUS(token)
  );
  return response.data;
};

/**
 * Confirm QR login (called from authenticated mobile)
 */
export const confirmQRLogin = async (token: string): Promise<{ message: string; request_id: string }> => {
  const response = await api.post<{ message: string; request_id: string }>(
    API_ENDPOINTS.AUTH.QR_CONFIRM,
    { token }
  );
  return response.data;
};
