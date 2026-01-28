/**
 * Sidebar Context
 * Контекст для управления состоянием бокового меню
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed';

// Ширины sidebar
export const SIDEBAR_WIDTH_COLLAPSED = 72;
export const SIDEBAR_WIDTH_EXPANDED = 240;

interface SidebarContextValue {
  isCollapsed: boolean;
  sidebarWidth: number;
  toggleCollapsed: () => void;
  setIsCollapsed: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsedState] = useState(true);

  // Load collapsed state from storage
  useEffect(() => {
    const loadCollapsedState = async () => {
      try {
        const stored = await AsyncStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (stored !== null) {
          setIsCollapsedState(stored === 'true');
        }
      } catch (error) {
        console.error('Error loading sidebar state:', error);
      }
    };
    loadCollapsedState();
  }, []);

  const setIsCollapsed = useCallback(async (value: boolean) => {
    setIsCollapsedState(value);
    try {
      await AsyncStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed, setIsCollapsed]);

  const sidebarWidth = isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  const value: SidebarContextValue = {
    isCollapsed,
    sidebarWidth,
    toggleCollapsed,
    setIsCollapsed,
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarContextValue => {
  const context = useContext(SidebarContext);
  if (!context) {
    // Return default values if used outside provider (e.g., mobile)
    return {
      isCollapsed: true,
      sidebarWidth: SIDEBAR_WIDTH_COLLAPSED,
      toggleCollapsed: () => {},
      setIsCollapsed: () => {},
    };
  }
  return context;
};
