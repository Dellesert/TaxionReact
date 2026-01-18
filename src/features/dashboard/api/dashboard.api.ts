/**
 * Dashboard API
 * API клиент для экрана сводки (Dashboard)
 */

import api from '@shared/api/axios.config';
import { DashboardData, DashboardApiResponse } from '../types/dashboard.types';

/**
 * Get dashboard summary data
 * @param limit - Maximum items per section (default 5)
 */
export const getDashboardSummary = async (limit: number = 5): Promise<DashboardData> => {
  const response = await api.get<DashboardApiResponse>('/dashboard', {
    params: { limit },
  });

  // Handle different response formats
  if (response.data.data) {
    return response.data.data;
  }

  return response.data as unknown as DashboardData;
};
