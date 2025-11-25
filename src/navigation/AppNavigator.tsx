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
import ChatDetailScreen from '@/features/chat/screens/ChatDetailScreen';
import TaskDetailScreen from '@screens/task/TaskDetailScreen';
import PollDetailScreen from '@screens/poll/PollDetailScreen';
import NotificationListScreen from '@screens/notification/NotificationListScreen';
import ActiveSessionsScreen from '@screens/profile/ActiveSessionsScreen';
import PasskeyManagementScreen from '@screens/profile/PasskeyManagementScreen';
import AboutScreen from '@/screens/profile/AboutScreen';
import { InAppNotificationContainer } from '@components/common/InAppNotificationContainer';
import * as Linking from 'expo-linking';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ChatDetail: { chatId: number };
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
        screens: {
          Login: 'login',
          TwoFactor: 'two-factor',
          AcceptInvitation: 'accept-invitation/:token?',
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
      ChatDetail: 'chat/:chatId',
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

const AppNavigator: React.FC = () => {
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
    <NavigationContainer theme={navigationTheme} linking={linking}>
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
              name="ChatDetail"
              component={ChatDetailScreen}
              options={{
                headerShown: true,
                headerTitle: 'Чат',
                headerBackTitle: 'Назад',
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="TaskDetail"
              component={TaskDetailScreen}
              options={{
                headerShown: true,
                headerTitle: 'Задача',
                headerBackTitle: 'Назад',
                animation: 'slide_from_right',
              }}
            />
            
            <Stack.Screen
              name="PollDetail"
              component={PollDetailScreen}
              options={{
                headerShown: true,
                headerTitle: 'Опрос',
                headerBackTitle: 'Назад',
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
};

export default AppNavigator;
