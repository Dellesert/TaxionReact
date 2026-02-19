/**
 * Network Sync Hook
 * Автоматическая синхронизация данных при восстановлении сети
 * Использует дифференциальную синхронизацию для эффективной загрузки только изменённых данных
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useDifferentialSync } from './useDifferentialSync';
import { isNative } from '@shared/storage';

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
 * Использует дифференциальную синхронизацию (updated_since) вместо полной очистки кэша
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
  const [isSyncing, setIsSyncing] = useState(false);

  // Use differential sync for efficient data updates
  const { syncAll } = useDifferentialSync({
    enabled: isNative,
    onComplete: (results) => {
      const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
      const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
    },
    onError: (error, feature) => {
      console.warn(`[NetworkSync] Failed to sync ${feature}:`, error);
    },
  });

  const syncData = useCallback(async () => {
    setIsSyncing(true);

    try {
      // Use differential sync instead of clearing caches
      await syncAll();
    } catch (e) {
      console.warn('[NetworkSync] Error during sync:', e);
    } finally {
      setIsSyncing(false);
      onSync?.();
    }
  }, [syncAll, onSync]);

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
    isSyncing,
    manualSync,
    networkStatus: status,
  };
};

export default useNetworkSync;
