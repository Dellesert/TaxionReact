/**
 * Desktop Navigation Context
 * Контекст для управления навигацией на десктопе
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface DesktopNavigationParams {
  // Chat navigation
  chatId?: number;
  chatName?: string;

  // Task navigation
  taskId?: number;

  // Poll navigation
  pollId?: number;

  // Schedule navigation
  scheduleId?: number;

  // Other params
  [key: string]: any;
}

interface DesktopNavigationContextValue {
  activeTab: string;
  navigationParams: DesktopNavigationParams | null;
  navigateToTab: (tab: string, params?: DesktopNavigationParams) => void;
  clearNavigationParams: () => void;
}

export const DesktopNavigationContext = createContext<DesktopNavigationContextValue | null>(null);

interface DesktopNavigationProviderProps {
  children: ReactNode;
}

export const DesktopNavigationProvider: React.FC<DesktopNavigationProviderProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('Chats');
  const [navigationParams, setNavigationParams] = useState<DesktopNavigationParams | null>(null);

  const navigateToTab = useCallback((tab: string, params?: DesktopNavigationParams) => {
    setActiveTab(tab);
    if (params) {
      setNavigationParams(params);
    }
  }, []);

  const clearNavigationParams = useCallback(() => {
    setNavigationParams(null);
  }, []);

  const value: DesktopNavigationContextValue = {
    activeTab,
    navigationParams,
    navigateToTab,
    clearNavigationParams,
  };

  return (
    <DesktopNavigationContext.Provider value={value}>
      {children}
    </DesktopNavigationContext.Provider>
  );
};

export const useDesktopNavigation = (): DesktopNavigationContextValue => {
  const context = useContext(DesktopNavigationContext);
  if (!context) {
    throw new Error('useDesktopNavigation must be used within DesktopNavigationProvider');
  }
  return context;
};
