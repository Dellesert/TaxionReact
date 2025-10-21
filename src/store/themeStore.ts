/**
 * Theme Store
 * Zustand store для управления темой приложения
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';
import { ThemeMode, Theme, themes } from '@constants/theme.constants';

interface ThemeState {
  mode: ThemeMode;
  theme: Theme;
  systemTheme: 'light' | 'dark';
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
  initSystemThemeListener: () => void;
}

const THEME_STORAGE_KEY = 'app_theme_mode';

// Функция для получения текущей системной темы
const getSystemTheme = (): 'light' | 'dark' => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
};

// Функция для получения актуальной темы на основе режима
const getActualTheme = (mode: ThemeMode, systemTheme: 'light' | 'dark'): Theme => {
  if (mode === 'system') {
    return themes[systemTheme];
  }
  return themes[mode];
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  theme: themes[getSystemTheme()],
  systemTheme: getSystemTheme(),

  setTheme: async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      const { systemTheme } = get();
      const actualTheme = getActualTheme(mode, systemTheme);
      set({ mode, theme: actualTheme });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  },

  toggleTheme: () => {
    const currentMode = get().mode;
    let newMode: ThemeMode;

    if (currentMode === 'system') {
      newMode = 'light';
    } else if (currentMode === 'light') {
      newMode = 'dark';
    } else {
      newMode = 'system';
    }

    get().setTheme(newMode);
  },

  loadTheme: async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const systemTheme = getSystemTheme();

      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        const actualTheme = getActualTheme(savedMode, systemTheme);
        set({ mode: savedMode, theme: actualTheme, systemTheme });
      } else {
        // По умолчанию - системная тема
        const actualTheme = getActualTheme('system', systemTheme);
        set({ mode: 'system', theme: actualTheme, systemTheme });
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  },

  initSystemThemeListener: () => {
    // Слушатель изменения системной темы
    const subscription = Appearance.addChangeListener(({ colorScheme }: { colorScheme: ColorSchemeName }) => {
      const newSystemTheme = colorScheme === 'dark' ? 'dark' : 'light';
      const { mode } = get();

      // Обновляем тему только если режим 'system'
      if (mode === 'system') {
        set({ systemTheme: newSystemTheme, theme: themes[newSystemTheme] });
      } else {
        set({ systemTheme: newSystemTheme });
      }
    });

    return subscription;
  },
}));
