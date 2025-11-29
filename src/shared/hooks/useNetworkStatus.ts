/**
 * Network Status Hook
 * Отслеживание состояния сети с поддержкой оффлайн режима
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  wasOffline: boolean; // Был ли оффлайн с момента монтирования
}

interface UseNetworkStatusReturn {
  status: NetworkStatus;
  isOffline: boolean;
  checkConnection: () => Promise<boolean>;
}

// Глобальные слушатели для синхронизации
type NetworkListener = (isConnected: boolean) => void;
const networkListeners: Set<NetworkListener> = new Set();

export const addNetworkListener = (listener: NetworkListener) => {
  networkListeners.add(listener);
  return () => networkListeners.delete(listener);
};

const notifyListeners = (isConnected: boolean) => {
  networkListeners.forEach(listener => listener(isConnected));
};

/**
 * Хук для отслеживания состояния сети
 */
export const useNetworkStatus = (): UseNetworkStatusReturn => {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
    wasOffline: false,
  });

  useEffect(() => {
    // Получить начальное состояние
    NetInfo.fetch().then((state: NetInfoState) => {
      const isConnected = state.isConnected ?? true;
      setStatus({
        isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        wasOffline: !isConnected,
      });
    });

    // Подписка на изменения
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected ?? true;

      setStatus(prev => {
        const newStatus = {
          isConnected,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
          wasOffline: prev.wasOffline || !isConnected,
        };

        // Уведомить глобальных слушателей о восстановлении сети
        if (!prev.isConnected && isConnected) {
          notifyListeners(true);
        }

        return newStatus;
      });
    });

    return () => unsubscribe();
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }, []);

  return {
    status,
    isOffline: !status.isConnected,
    checkConnection,
  };
};
