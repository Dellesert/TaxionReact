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

  // Определяем isDark по цвету фона темы, а не по mode
  // Потому что mode может быть 'system', но тема при этом темная
  const isDark = theme.background === '#111827'; // Цвет фона темной темы

  return {
    theme,
    mode,
    isDark,
    toggleTheme,
    setTheme,
  };
};
