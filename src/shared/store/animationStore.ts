/**
 * Animation Store
 * Zustand store для управления настройкой уменьшения анимаций (Electron)
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AnimationState {
  reduceAnimations: boolean;
  setReduceAnimations: (value: boolean) => void;
  loadAnimationPreference: () => Promise<void>;
}

const ANIMATION_STORAGE_KEY = 'app_reduce_animations';

export const useAnimationStore = create<AnimationState>((set) => ({
  reduceAnimations: false,

  setReduceAnimations: async (value: boolean) => {
    try {
      await AsyncStorage.setItem(ANIMATION_STORAGE_KEY, JSON.stringify(value));
    } catch (error) {
      // Silent fail - same pattern as themeStore
    }
    set({ reduceAnimations: value });
  },

  loadAnimationPreference: async () => {
    try {
      const saved = await AsyncStorage.getItem(ANIMATION_STORAGE_KEY);
      if (saved !== null) {
        set({ reduceAnimations: JSON.parse(saved) });
      }
    } catch (error) {
      // Silent fail - fallback to false (animations enabled)
    }
  },
}));
