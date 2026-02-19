/**
 * Network Sync Provider
 * Провайдер для автоматической синхронизации данных при восстановлении сети
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useNetworkSync } from '@shared/hooks/useNetworkSync';

interface NetworkSyncContextType {
  isOffline: boolean;
  manualSync: () => Promise<void>;
}

const NetworkSyncContext = createContext<NetworkSyncContextType | null>(null);

interface NetworkSyncProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export const NetworkSyncProvider: React.FC<NetworkSyncProviderProps> = ({
  children,
  enabled = true,
}) => {
  const { isOffline, manualSync } = useNetworkSync({
    enabled,
    delay: 1500, // Небольшая задержка для стабилизации соединения
    onSync: () => {
    },
  });

  return (
    <NetworkSyncContext.Provider value={{ isOffline, manualSync }}>
      {children}
    </NetworkSyncContext.Provider>
  );
};

export const useNetworkSyncContext = () => {
  const context = useContext(NetworkSyncContext);
  if (!context) {
    throw new Error('useNetworkSyncContext must be used within NetworkSyncProvider');
  }
  return context;
};

export default NetworkSyncProvider;
