/**
 * TitleBarControlsContext
 * Контекст для управления заголовком страницы и контролами в кастомном заголовке Electron
 */

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface TitleBarControlsContextValue {
  /** Заголовок страницы */
  pageTitle: string;
  /** Компонент с контролами для левой части тайтлбара */
  leftControls: ReactNode | null;
  /** Компонент с контролами для правой части тайтлбара (перед уведомлениями) */
  rightControls: ReactNode | null;
  /** Индикатор загрузки рядом с заголовком */
  isPageLoading: boolean;
  /** Установить заголовок страницы */
  setPageTitle: (title: string) => void;
  /** Установить левые контролы */
  setLeftControls: (controls: ReactNode | null) => void;
  /** Установить правые контролы */
  setRightControls: (controls: ReactNode | null) => void;
  /** Установить индикатор загрузки */
  setIsPageLoading: (loading: boolean) => void;
  /** Очистить все контролы */
  clearControls: () => void;
}

const TitleBarControlsContext = createContext<TitleBarControlsContextValue | null>(null);

export const TitleBarControlsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pageTitle, setPageTitle] = useState('');
  const [leftControls, setLeftControls] = useState<ReactNode | null>(null);
  const [rightControls, setRightControls] = useState<ReactNode | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(false);

  const clearControls = useCallback(() => {
    setLeftControls(null);
    setRightControls(null);
    setIsPageLoading(false);
  }, []);

  const value = useMemo<TitleBarControlsContextValue>(() => ({
    pageTitle,
    leftControls,
    rightControls,
    isPageLoading,
    setPageTitle,
    setLeftControls,
    setRightControls,
    setIsPageLoading,
    clearControls,
  }), [pageTitle, leftControls, rightControls, isPageLoading, clearControls]);

  return (
    <TitleBarControlsContext.Provider value={value}>
      {children}
    </TitleBarControlsContext.Provider>
  );
};

export const useTitleBarControls = () => {
  const context = useContext(TitleBarControlsContext);
  if (!context) {
    throw new Error('useTitleBarControls must be used within TitleBarControlsProvider');
  }
  return context;
};
