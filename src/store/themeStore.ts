/**
 * Theme Store
 * Zustand store для управления темой приложения
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode, Theme, themes } from '@constants/theme.constants';

interface ThemeState {
  mode: ThemeMode;
  theme: Theme;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = 'app_theme_mode';

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',
  theme: themes.light,

  setTheme: async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      set({ mode, theme: themes[mode] });
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  },

  toggleTheme: () => {
    const currentMode = get().mode;
    const newMode: ThemeMode = currentMode === 'light' ? 'dark' : 'light';
    get().setTheme(newMode);
  },

  loadTheme: async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode === 'light' || savedMode === 'dark') {
        set({ mode: savedMode, theme: themes[savedMode] });
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  },
}));
