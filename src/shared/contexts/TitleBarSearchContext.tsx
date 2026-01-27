/**
 * TitleBarSearchContext
 * Контекст для управления поиском в кастомном заголовке Electron
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface TitleBarSearchContextValue {
  searchQuery: string;
  placeholder: string;
  isVisible: boolean;
  setSearchQuery: (query: string) => void;
  setPlaceholder: (placeholder: string) => void;
  setIsVisible: (visible: boolean) => void;
  clearSearch: () => void;
}

const TitleBarSearchContext = createContext<TitleBarSearchContextValue | null>(null);

export const TitleBarSearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [placeholder, setPlaceholder] = useState('Поиск...');
  const [isVisible, setIsVisible] = useState(false);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const value = useMemo<TitleBarSearchContextValue>(() => ({
    searchQuery,
    placeholder,
    isVisible,
    setSearchQuery,
    setPlaceholder,
    setIsVisible,
    clearSearch,
  }), [searchQuery, placeholder, isVisible, clearSearch]);

  return (
    <TitleBarSearchContext.Provider value={value}>
      {children}
    </TitleBarSearchContext.Provider>
  );
};

export const useTitleBarSearch = () => {
  const context = useContext(TitleBarSearchContext);
  if (!context) {
    throw new Error('useTitleBarSearch must be used within TitleBarSearchProvider');
  }
  return context;
};
