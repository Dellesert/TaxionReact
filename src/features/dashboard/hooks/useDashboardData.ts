/**
 * Dashboard Data Hook
 * Хук для загрузки данных на экран сводки
 */

import { useState, useCallback, useEffect } from 'react';
import { DashboardData } from '../types/dashboard.types';
import * as dashboardApi from '../api/dashboard.api';

export interface UseDashboardDataReturn {
  data: DashboardData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadDashboard: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ITEMS_LIMIT = 5;

export const useDashboardData = (): UseDashboardDataReturn => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const dashboardData = await dashboardApi.getDashboardSummary(ITEMS_LIMIT);
      setData(dashboardData);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Не удалось загрузить данные');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const dashboardData = await dashboardApi.getDashboardSummary(ITEMS_LIMIT);
      setData(dashboardData);
    } catch (err: any) {
      console.error('Failed to refresh dashboard:', err);
      setError(err.message || 'Не удалось обновить данные');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    loadDashboard,
    refresh,
  };
};
