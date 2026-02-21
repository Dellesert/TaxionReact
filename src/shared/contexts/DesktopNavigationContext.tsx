/**
 * Desktop Navigation Context
 * Контекст для управления навигацией на десктопе
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

export interface DesktopNavigationParams {
  // Chat navigation
  chatId?: number;
  chatName?: string;

  // Task navigation
  taskId?: number;

  // Poll navigation
  pollId?: number;

  // Event navigation
  eventId?: number;

  // Schedule navigation
  scheduleId?: number;

  // Other params
  [key: string]: any;
}

/**
 * Navigation guard callback.
 * Called before navigateToTab changes the active tab.
 * Return `true` to allow navigation, `false` to block it.
 * Can also be async (e.g. to show a confirmation dialog).
 */
export type NavigationGuard = (targetTab: string) => boolean | Promise<boolean>;

interface DesktopNavigationContextValue {
  activeTab: string;
  navigationParams: DesktopNavigationParams | null;
  navigateToTab: (tab: string, params?: DesktopNavigationParams) => void;
  clearNavigationParams: () => void;
  registerNavigationGuard: (guard: NavigationGuard) => void;
  unregisterNavigationGuard: (guard: NavigationGuard) => void;
}

export const DesktopNavigationContext = createContext<DesktopNavigationContextValue | null>(null);

// Global navigation function for use outside React components (e.g., push notification callbacks)
let globalNavigateToTab: ((tab: string, params?: DesktopNavigationParams) => void) | null = null;

export const setGlobalNavigateToTab = (fn: typeof globalNavigateToTab) => {
  globalNavigateToTab = fn;
};

/**
 * Navigate to a tab from outside React components
 * Use this for push notification navigation in Electron desktop
 */
export const navigateToTabGlobal = (tab: string, params?: DesktopNavigationParams): boolean => {
  if (globalNavigateToTab) {
    globalNavigateToTab(tab, params);
    return true;
  }
  console.warn('[DesktopNavigation] navigateToTabGlobal: no global function registered');
  return false;
};

interface DesktopNavigationProviderProps {
  children: ReactNode;
}

export const DesktopNavigationProvider: React.FC<DesktopNavigationProviderProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('Chats');
  const [navigationParams, setNavigationParams] = useState<DesktopNavigationParams | null>(null);
  const guardsRef = useRef<Set<NavigationGuard>>(new Set());

  const registerNavigationGuard = useCallback((guard: NavigationGuard) => {
    guardsRef.current.add(guard);
  }, []);

  const unregisterNavigationGuard = useCallback((guard: NavigationGuard) => {
    guardsRef.current.delete(guard);
  }, []);

  const navigateToTab = useCallback(async (tab: string, params?: DesktopNavigationParams) => {
    // Run all registered guards; if any returns false, block navigation
    for (const guard of guardsRef.current) {
      const allowed = await guard(tab);
      if (!allowed) return;
    }

    setActiveTab(tab);
    if (params) {
      setNavigationParams(params);
    }
  }, []);

  const clearNavigationParams = useCallback(() => {
    setNavigationParams(null);
  }, []);

  // Register global navigation function for use outside React components
  useEffect(() => {
    setGlobalNavigateToTab(navigateToTab);
    return () => setGlobalNavigateToTab(null);
  }, [navigateToTab]);

  const value: DesktopNavigationContextValue = {
    activeTab,
    navigationParams,
    navigateToTab,
    clearNavigationParams,
    registerNavigationGuard,
    unregisterNavigationGuard,
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
