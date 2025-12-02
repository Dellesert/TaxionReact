/**
 * useIsWideScreen hook
 * Хук для определения широкого экрана (desktop/tablet landscape)
 */

import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

// Минимальная ширина для desktop режима (768px - стандартная ширина планшета)
const WIDE_SCREEN_THRESHOLD = 768;

export const useIsWideScreen = (): boolean => {
  const [isWideScreen, setIsWideScreen] = useState(() => {
    const { width } = Dimensions.get('window');
    return width >= WIDE_SCREEN_THRESHOLD;
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setIsWideScreen(window.width >= WIDE_SCREEN_THRESHOLD);
    });

    return () => subscription?.remove();
  }, []);

  return isWideScreen;
};
