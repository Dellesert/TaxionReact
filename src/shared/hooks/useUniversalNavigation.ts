/**
 * Universal Navigation Hook
 * Универсальный хук навигации для мобилки и десктопа
 */

import { useNavigation } from '@react-navigation/native';
import { useIsWideScreen } from './useIsWideScreen';
import { useDesktopNavigation, DesktopNavigationParams } from '@shared/contexts/DesktopNavigationContext';
import { useCallback } from 'react';

interface NavigationOptions {
  screen?: string;
  params?: any;
}

export const useUniversalNavigation = () => {
  const isWideScreen = useIsWideScreen();
  const mobileNavigation = useNavigation();
  const desktopNavigation = useDesktopNavigation();

  /**
   * Navigate to a screen
   * On mobile: uses React Navigation
   * On desktop: switches tabs and passes params
   */
  const navigate = useCallback(
    (screenName: string, options?: NavigationOptions) => {
      console.log('[UniversalNavigation] Navigate called:', {
        isWideScreen,
        screenName,
        options
      });

      if (isWideScreen) {
        // Desktop navigation
        // Map screen names to desktop tab names
        let tabName = screenName;
        let params: DesktopNavigationParams | undefined;

        // Handle nested navigation (e.g., { screen: 'Chat', params: { chatId: 1 } })
        if (options?.screen) {
          // For nested navigators, use the parent screen name as tab
          tabName = screenName;
          params = options.params;
        } else if (options?.params) {
          params = options.params;
        }

        // Map React Navigation screen names to desktop tab names
        const screenToTabMap: Record<string, string> = {
          Chats: 'Chats',
          Chat: 'Chats',
          ChatList: 'Chats',
          Tasks: 'Tasks',
          TaskDetail: 'Tasks',
          TaskList: 'Tasks',
          Polls: 'Polls',
          PollDetail: 'Polls',
          PollList: 'Polls',
          Calendar: 'Calendar',
          Notifications: 'Notifications',
          NotificationList: 'Notifications',
          Profile: 'Profile',
          Admin: 'Admin',
        };

        const desktopTab = screenToTabMap[tabName] || tabName;
        console.log('[UniversalNavigation] Desktop navigation:', {
          tabName,
          desktopTab,
          params
        });
        desktopNavigation.navigateToTab(desktopTab, params);
      } else {
        // Mobile navigation - use React Navigation
        console.log('[UniversalNavigation] Mobile navigation');
        if (options?.screen) {
          // @ts-ignore - Navigation types are complex
          mobileNavigation.navigate(screenName, options);
        } else if (options?.params) {
          // @ts-ignore
          mobileNavigation.navigate(screenName, options.params);
        } else {
          // @ts-ignore
          mobileNavigation.navigate(screenName);
        }
      }
    },
    [isWideScreen, desktopNavigation, mobileNavigation]
  );

  return {
    navigate,
    isDesktop: isWideScreen,
  };
};
