/**
 * useTitleBarControlsIntegration
 * Хук для интеграции контролов экрана с TitleBar в Electron
 */

import { useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTitleBarControls } from '@shared/contexts/TitleBarControlsContext';

interface UseTitleBarControlsIntegrationOptions {
  /** Заголовок страницы для отображения в TitleBar */
  pageTitle: string;
  /** Компонент с контролами для левой части тайтлбара */
  leftControls?: ReactNode | null;
  /** Компонент с контролами для центральной части тайтлбара */
  centerControls?: ReactNode | null;
  /** Компонент с контролами для правой части тайтлбара */
  rightControls?: ReactNode | null;
  /** Индикатор загрузки рядом с заголовком (только лоадер, без текста) */
  isPageLoading?: boolean;
  /** Включена ли интеграция */
  enabled?: boolean;
}

/**
 * Хук для синхронизации заголовка и контролов экрана с TitleBar в Electron
 * Использует useEffect для обновления при изменении props и useFocusEffect для навигации
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
  centerControls = null,
  rightControls = null,
  isPageLoading = false,
  enabled = true,
}: UseTitleBarControlsIntegrationOptions) => {
  const titleBarControls = useTitleBarControls();

  // Check if we're in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

  // Use useEffect to set controls when component mounts or props change
  // This is needed for desktop mode where navigation works via conditional rendering
  // (not React Navigation), so useFocusEffect doesn't trigger on tab switch
  useEffect(() => {
    if (!isElectron || !enabled) {
      return;
    }

    // Set title and controls when component mounts or props change
    titleBarControls.setPageTitle(pageTitle);
    titleBarControls.setLeftControls(leftControls);
    titleBarControls.setCenterControls(centerControls);
    titleBarControls.setRightControls(rightControls);
    titleBarControls.setIsPageLoading(isPageLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isElectron, enabled, pageTitle, leftControls, centerControls, rightControls, isPageLoading]);

  // Also use useFocusEffect to restore controls when navigating back within a stack
  // This handles the case when navigating from Detail screen back to List screen
  useFocusEffect(
    useCallback(() => {
      if (!isElectron || !enabled) {
        return;
      }

      // Restore title and controls when screen gains focus (e.g., navigating back)
      titleBarControls.setPageTitle(pageTitle);
      titleBarControls.setLeftControls(leftControls);
      titleBarControls.setCenterControls(centerControls);
      titleBarControls.setRightControls(rightControls);
      titleBarControls.setIsPageLoading(isPageLoading);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isElectron, enabled, pageTitle, leftControls, centerControls, rightControls, isPageLoading])
  );

  return {
    isElectron,
  };
};
