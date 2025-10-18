/**
 * useTheme Hook
 * Хук для работы с темой приложения
 */

import { useThemeStore } from '@store/themeStore';
import { Theme, ThemeMode } from '@constants/theme.constants';

interface UseThemeReturn {
  theme: Theme;
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

export const useTheme = (): UseThemeReturn => {
  const { theme, mode, setTheme, toggleTheme } = useThemeStore();

  return {
    theme,
    mode,
    isDark: mode === 'dark',
    toggleTheme,
    setTheme,
  };
};
