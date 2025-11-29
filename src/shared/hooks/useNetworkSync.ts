/**
 * Network Sync Hook
 * Автоматическая синхронизация данных при восстановлении сети
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useChatStore, useTaskStore, useCalendarStore, usePollStore, useUserStore } from '@shared/store';

interface UseNetworkSyncOptions {
  /** Включить авто-синхронизацию (по умолчанию true) */
  enabled?: boolean;
  /** Задержка перед синхронизацией после восстановления сети (мс) */
  delay?: number;
  /** Callback после синхронизации */
  onSync?: () => void;
}

/**
 * Хук для автоматической синхронизации при восстановлении сети
 * Очищает кэш Zustand stores чтобы данные загрузились заново
 */
export const useNetworkSync = (options: UseNetworkSyncOptions = {}) => {
  const {
    enabled = true,
    delay = 1000,
    onSync,
  } = options;

  const { isOffline, status } = useNetworkStatus();
  const wasOfflineRef = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get clear/refresh functions from stores
  const refreshChats = useChatStore((state) => state.refreshCurrentTab);
  const clearTaskCache = useTaskStore((state) => state.clearCache);
  const clearCalendarCache = useCalendarStore((state) => state.clearCache);
  const clearPollCache = usePollStore((state) => state.clearCache);
  const clearUserCache = useUserStore((state) => state.clearCache);

  const syncData = useCallback(() => {
    console.log('[NetworkSync] Starting sync after network restore...');

    // Clear all caches to force reload from server
    try {
      // Chat store uses refresh instead of clear
      refreshChats?.();
      clearTaskCache?.();
      clearCalendarCache?.();
      clearPollCache?.();
      clearUserCache?.();
      console.log('[NetworkSync] Caches cleared, data will reload on next access');
    } catch (e) {
      console.warn('[NetworkSync] Error clearing caches:', e);
    }

    console.log('[NetworkSync] Sync completed');
    onSync?.();
  }, [refreshChats, clearTaskCache, clearCalendarCache, clearPollCache, clearUserCache, onSync]);

  useEffect(() => {
    if (!enabled) return;

    if (isOffline) {
      // Сохраняем состояние offline
      wasOfflineRef.current = true;

      // Очищаем таймаут если был
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    } else if (wasOfflineRef.current) {
      // Сеть восстановлена - запускаем синхронизацию с задержкой
      console.log('[NetworkSync] Network restored, scheduling sync in', delay, 'ms');

      syncTimeoutRef.current = setTimeout(() => {
        syncData();
        wasOfflineRef.current = false;
      }, delay);
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isOffline, enabled, delay, syncData]);

  // Ручная синхронизация
  const manualSync = useCallback(() => {
    syncData();
  }, [syncData]);

  return {
    isOffline,
    isSyncing: false,
    manualSync,
    networkStatus: status,
  };
};

export default useNetworkSync;
