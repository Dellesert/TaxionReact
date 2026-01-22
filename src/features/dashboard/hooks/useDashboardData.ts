/**
 * Dashboard Data Hook
 * Хук для загрузки данных на экран сводки
 * Использует кеширование для мгновенного отображения при первом рендере
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
const CACHE_KEY = 'dashboard_summary_cache';
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// MMKV instance для нативных платформ
let mmkvInstance: any = null;

const getMMKV = () => {
  if (!isNative) return null;
  if (mmkvInstance) return mmkvInstance;

  try {
    const { createMMKV } = require('react-native-mmkv');
    mmkvInstance = createMMKV({ id: 'taxion-dashboard-cache' });
    return mmkvInstance;
  } catch {
    return null;
  }
};

// Кеширование данных
const saveToCache = (data: DashboardData): void => {
  try {
    const json = JSON.stringify(data);
    const mmkv = getMMKV();
    if (mmkv) {
      mmkv.set(CACHE_KEY, json);
    } else {
      AsyncStorage.setItem(CACHE_KEY, json);
    }
  } catch (e) {
    console.warn('[Dashboard] Failed to save cache:', e);
  }
};

const loadFromCache = (): DashboardData | null => {
  try {
    const mmkv = getMMKV();
    if (mmkv) {
      const json = mmkv.getString(CACHE_KEY);
      return json ? JSON.parse(json) : null;
    }
    return null; // AsyncStorage async, обрабатываем отдельно
  } catch {
    return null;
  }
};

const loadFromCacheAsync = async (): Promise<DashboardData | null> => {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
};

export const useDashboardData = (): UseDashboardDataReturn => {
  // Инициализация с кешированными данными (синхронно для MMKV)
  const [data, setData] = useState<DashboardData | null>(() => loadFromCache());
  const [isLoading, setIsLoading] = useState(() => loadFromCache() === null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const loadDashboard = useCallback(async () => {
    try {
      // Если нет кеша — показываем загрузку
      if (!data) {
        setIsLoading(true);
      }
      setError(null);

      const dashboardData = await dashboardApi.getDashboardSummary(ITEMS_LIMIT);
      setData(dashboardData);
      saveToCache(dashboardData);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      // Показываем ошибку только если нет кешированных данных
      if (!data) {
        setError(err.message || 'Не удалось загрузить данные');
      }
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const dashboardData = await dashboardApi.getDashboardSummary(ITEMS_LIMIT);
      setData(dashboardData);
      saveToCache(dashboardData);
    } catch (err: any) {
      console.error('Failed to refresh dashboard:', err);
      setError(err.message || 'Не удалось обновить данные');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    // Для веб: асинхронно загружаем кеш если он не был загружен синхронно
    const init = async () => {
      if (!isNative && !data) {
        const cached = await loadFromCacheAsync();
        if (cached) {
          setData(cached);
          setIsLoading(false);
        }
      }
      // Всегда загружаем свежие данные в фоне
      loadDashboard();
    };

    init();
  }, []);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    loadDashboard,
    refresh,
  };
};
