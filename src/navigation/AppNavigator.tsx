/**
 * App Navigator
 * Корневая навигация приложения
 */

import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@shared/hooks/useAuth';
import { useTheme } from '@shared/hooks/useTheme';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
// ChatScreen removed - using nested navigation instead
import TaskDetailScreen from '@/features/tasks/screens/TaskDetailScreen';
import PollDetailScreen from '@/features/polls/screens/PollDetailScreen';
import NotificationListScreen from '@/features/notifications/screens/NotificationListScreen';
import ActiveSessionsScreen from '@/features/profile/screens/ActiveSessionsScreen';
import PasskeyManagementScreen from '@/features/profile/screens/PasskeyManagementScreen';
import AboutScreen from '@/features/profile/screens/AboutScreen';
import { InAppNotificationContainer } from '@shared/components/common/InAppNotificationContainer';
import * as Linking from 'expo-linking';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  TaskDetail: { taskId: number };
  EventDetail: { eventId: number };
  PollDetail: { pollId: number };
  NotificationList: undefined;
  ActiveSessions: undefined;
  PasskeyManagement: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    'tachyon://',
  ],
  config: {
    screens: {
      Auth: {
        path: '',
        screens: {
          Login: 'login',
          TwoFactor: 'two-factor',
          AcceptInvitation: 'invite/:token?',
          ResetPassword: 'reset-password/:token',
          ForgotPassword: 'forgot-password',
        },
      },
      Main: {
        screens: {
          Home: 'home',
          Chats: 'chats',
          Tasks: 'tasks',
          Calendar: 'calendar',
          Polls: 'polls',
          Profile: 'profile',
        },
      },
      TaskDetail: 'task/:taskId',
      EventDetail: 'event/:eventId',
      PollDetail: 'poll/:pollId',
      NotificationList: 'notifications',
      ActiveSessions: 'sessions',
      PasskeyManagement: 'passkeys',
      About: 'about',
    },
  },
};

interface AppNavigatorProps {}

const AppNavigator = React.forwardRef<any, AppNavigatorProps>((props, ref) => {
  const { isAuthenticated, isInitializing } = useAuth();
  const { theme } = useTheme();

  // Create navigation theme based on current app theme
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
  };

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={ref} theme={navigationTheme} linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          // Main Stack
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            
            <Stack.Screen
              name="PollDetail"
              component={PollDetailScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="NotificationList"
              component={NotificationListScreen}
              options={{
                headerShown: true,
                headerTitle: 'Уведомления',
                headerBackTitle: 'Назад',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="ActiveSessions"
              component={ActiveSessionsScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="PasskeyManagement"
              component={PasskeyManagementScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="About"
              component={AboutScreen}
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
          </>
        )}
      </Stack.Navigator>
      {isAuthenticated && <InAppNotificationContainer />}
    </NavigationContainer>
  );
});

AppNavigator.displayName = 'AppNavigator';

export default AppNavigator;
