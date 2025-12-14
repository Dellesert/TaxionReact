/**
 * useTitleBarSearchIntegration
 * Хук для интеграции поиска экрана с TitleBar в Electron
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useTitleBarSearch } from '@shared/contexts/TitleBarSearchContext';

interface UseTitleBarSearchIntegrationOptions {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  enabled?: boolean; // Показывать ли поиск (например, только для авторизованных)
}

/**
 * Хук для синхронизации локального поиска экрана с TitleBar поиском в Electron
 *
 * @example
 * // В TaskListScreen.tsx:
 * const [searchQuery, setSearchQuery] = useState('');
 *
 * // Синхронизируем с TitleBar
 * useTitleBarSearchIntegration({
 *   searchQuery,
 *   onSearchChange: setSearchQuery,
 *   placeholder: 'Поиск задач...',
 *   enabled: true
 * });
 */
export const useTitleBarSearchIntegration = ({
  searchQuery,
  onSearchChange,
  placeholder = 'Поиск...',
  enabled = true,
}: UseTitleBarSearchIntegrationOptions) => {
  const titleBarSearch = useTitleBarSearch();

  useEffect(() => {
    // Только в Electron (web + window.electron)
    const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

    if (!isElectron || !enabled) {
      return;
    }

    // Показываем поиск в TitleBar
    titleBarSearch.setIsVisible(true);
    titleBarSearch.setPlaceholder(placeholder);

    // Cleanup: скрываем поиск когда компонент размонтируется
    return () => {
      titleBarSearch.setIsVisible(false);
      titleBarSearch.clearSearch();
    };
  }, [enabled, placeholder]); // Не включаем titleBarSearch в зависимости

  useEffect(() => {
    const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

    if (!isElectron || !enabled) {
      return;
    }

    // Синхронизируем локальный searchQuery с TitleBar
    if (titleBarSearch.searchQuery !== searchQuery) {
      onSearchChange(titleBarSearch.searchQuery);
    }
  }, [titleBarSearch.searchQuery, enabled]); // Реагируем на изменения в TitleBar

  useEffect(() => {
    const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

    if (!isElectron || !enabled) {
      return;
    }

    // Синхронизируем TitleBar с локальным searchQuery (если изменился локально)
    if (titleBarSearch.searchQuery !== searchQuery) {
      titleBarSearch.setSearchQuery(searchQuery);
    }
  }, [searchQuery, enabled]); // Реагируем на изменения локально
};
