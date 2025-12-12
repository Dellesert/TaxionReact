/**
 * Universal Navigation Hook
 * Универсальный хук навигации для мобилки и десктопа
 */

import { useNavigation } from '@react-navigation/native';
import { useIsWideScreen } from './useIsWideScreen';
import { DesktopNavigationParams, DesktopNavigationContext } from '@shared/contexts/DesktopNavigationContext';
import { useCallback, useContext } from 'react';

interface NavigationOptions {
  screen?: string;
  params?: any;
}

export const useUniversalNavigation = () => {
  const isWideScreen = useIsWideScreen();
  const mobileNavigation = useNavigation();

  // Use context directly to avoid hook rules violations
  // This allows the hook to work outside of DesktopNavigationProvider (e.g., for InAppNotificationContainer)
  const desktopNavigation = useContext(DesktopNavigationContext);

  /**
   * Navigate to a screen
   * On mobile: uses React Navigation
   * On desktop: switches tabs and passes params
   */
  const navigate = useCallback(
    (screenName: string, options?: NavigationOptions) => {

      if (isWideScreen && desktopNavigation) {
        // Desktop navigation - only if we have the context available
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
        desktopNavigation.navigateToTab(desktopTab, params);
      } else {
        // Mobile navigation - use React Navigation
        

        // Special handling for Tasks with taskId - navigate directly to TaskDetail
        if (screenName === 'Tasks' && options?.taskId) {
          // @ts-ignore - Navigation to root level screen
          mobileNavigation.navigate('TaskDetail', {
            taskId: options.taskId,
          });
        }
        // Special handling for Polls - check both options.screen and options.params
        else if (screenName === 'Polls' && (options?.screen === 'PollDetail' || options?.params?.pollId)) {
          const pollId = options?.params?.pollId || options?.pollId;
          // @ts-ignore - Navigation to root level screen
          mobileNavigation.navigate('PollDetail', {
            pollId,
          });
        }
        // Handle nested navigation (e.g., { screen: 'Chat', params: { chatId: 1 } })
        else if (options?.screen) {
          // @ts-ignore - Navigation types are complex
          mobileNavigation.navigate(screenName, options);
        }
        // Regular navigation with params
        else if (options?.params || options) {
          // @ts-ignore
          mobileNavigation.navigate(screenName, options?.params || options);
        }
        // Simple navigation without params
        else {
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
