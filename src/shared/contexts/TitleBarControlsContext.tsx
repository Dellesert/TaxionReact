/**
 * TitleBarControlsContext
 * Контекст для управления заголовком страницы и контролами в кастомном заголовке Electron
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface TitleBarControlsContextValue {
  /** Заголовок страницы */
  pageTitle: string;
  /** Компонент с контролами для левой части тайтлбара */
  leftControls: ReactNode | null;
  /** Компонент с контролами для правой части тайтлбара (перед уведомлениями) */
  rightControls: ReactNode | null;
  /** Установить заголовок страницы */
  setPageTitle: (title: string) => void;
  /** Установить левые контролы */
  setLeftControls: (controls: ReactNode | null) => void;
  /** Установить правые контролы */
  setRightControls: (controls: ReactNode | null) => void;
  /** Очистить все контролы */
  clearControls: () => void;
}

const TitleBarControlsContext = createContext<TitleBarControlsContextValue | null>(null);

export const TitleBarControlsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pageTitle, setPageTitle] = useState('');
  const [leftControls, setLeftControls] = useState<ReactNode | null>(null);
  const [rightControls, setRightControls] = useState<ReactNode | null>(null);

  const clearControls = useCallback(() => {
    setLeftControls(null);
    setRightControls(null);
  }, []);

  const value: TitleBarControlsContextValue = {
    pageTitle,
    leftControls,
    rightControls,
    setPageTitle,
    setLeftControls,
    setRightControls,
    clearControls,
  };

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
