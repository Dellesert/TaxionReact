/**
 * App Navigator
 * Корневая навигация приложения
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@hooks/useAuth';
import { useWebSocket } from '@hooks/useWebSocket';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import ChatDetailScreen from '@screens/chat/ChatDetailScreen';
import TaskDetailScreen from '@screens/task/TaskDetailScreen';
import EventDetailScreen from '@screens/calendar/EventDetailScreen';
import PollDetailScreen from '@screens/poll/PollDetailScreen';
import NotificationListScreen from '@screens/notification/NotificationListScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  ChatDetail: { chatId: number };
  TaskDetail: { taskId: number };
  EventDetail: { eventId: number };
  PollDetail: { pollId: number };
  NotificationList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isInitializing, user } = useAuth();

  // Initialize WebSocket when authenticated
  const { isConnected } = useWebSocket();

  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('User authenticated:', user.name);
      console.log('WebSocket connected:', isConnected);
    }
  }, [isAuthenticated, user, isConnected]);

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
              name="EventDetail"
              component={EventDetailScreen}
              options={{
                headerShown: true,
                headerTitle: 'Событие',
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
