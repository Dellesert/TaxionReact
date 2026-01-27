/**
 * useTitleBarControlsIntegration
 * Хук для интеграции контролов экрана с TitleBar в Electron
 */

import { useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTitleBarControls } from '@shared/contexts/TitleBarControlsContext';

interface UseTitleBarControlsIntegrationOptions {
  /** Заголовок страницы для отображения в TitleBar */
  pageTitle: string;
  /** Компонент с контролами для левой части тайтлбара */
  leftControls?: ReactNode | null;
  /** Компонент с контролами для правой части тайтлбара */
  rightControls?: ReactNode | null;
  /** Включена ли интеграция */
  enabled?: boolean;
}

/**
 * Хук для синхронизации заголовка и контролов экрана с TitleBar в Electron
 * Использует useFocusEffect для корректной работы при навигации
 *
 * @example
 * // В TaskListScreen.tsx:
 * useTitleBarControlsIntegration({
 *   pageTitle: 'Задачи',
 *   leftControls: <ViewControlGroup ... />,
 *   rightControls: <FilterButton ... />,
 *   enabled: true
 * });
 */
export const useTitleBarControlsIntegration = ({
  pageTitle,
  leftControls = null,
  rightControls = null,
  enabled = true,
}: UseTitleBarControlsIntegrationOptions) => {
  const titleBarControls = useTitleBarControls();

  // Check if we're in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

  // Use useFocusEffect to set controls when screen gains focus
  // This ensures controls are restored when navigating back
  useFocusEffect(
    useCallback(() => {
      if (!isElectron || !enabled) {
        return;
      }

      // Set title and controls when screen gains focus
      titleBarControls.setPageTitle(pageTitle);
      titleBarControls.setLeftControls(leftControls);
      titleBarControls.setRightControls(rightControls);

      // No cleanup needed - next focused screen will set its own controls
    }, [isElectron, enabled, pageTitle, leftControls, rightControls, titleBarControls])
  );

  return {
    isElectron,
  };
};
