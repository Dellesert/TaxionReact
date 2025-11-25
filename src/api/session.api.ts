/**
 * Session API
 * API для управления активными сессиями (устройствами)
 */

import api from '../shared/api/axios.config';
import type { GetSessionsResponse } from '../types/user.types';

const BASE_URL = '/sessions';

/**
 * Get all active sessions for current user
 */
export const getActiveSessions = async (): Promise<GetSessionsResponse> => {
  const response = await api.get<GetSessionsResponse>(BASE_URL);
  return response.data;
};

/**
 * Delete a specific session (logout from specific device)
 */
export const deleteSession = async (sessionId: string): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`${BASE_URL}/${sessionId}`);
  return response.data;
};

/**
 * Delete all sessions except current one (logout from all other devices)
 */
export const deleteAllOtherSessions = async (): Promise<{ message: string; deleted_count: number }> => {
  const response = await api.delete<{ message: string; deleted_count: number }>(BASE_URL);
  return response.data;
};
