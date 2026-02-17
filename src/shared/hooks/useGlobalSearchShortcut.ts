/**
 * useGlobalSearchShortcut
 * Регистрация Ctrl+K / Cmd+K для фокуса на глобальный поиск
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';

export const useGlobalSearchShortcut = (
  onTrigger: () => void,
  enabled: boolean = true,
) => {
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onTrigger();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTrigger, enabled]);
};
