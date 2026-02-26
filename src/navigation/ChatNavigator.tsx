/**
 * Chat Navigator
 * Стек навигации для чатов
 */

import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { ChatStackParamList } from './types';
import ChatListScreen from '@/features/chat/screens/ChatListScreen';
import CreateChatScreen from '@/features/chat/screens/CreateChatScreen';
import ChatScreen from '@/features/chat/screens/ChatScreen';
import ChatSettingsScreen from '@/features/chat/screens/ChatSettingsScreen';
import ThreadScreen from '@/features/chat/screens/ThreadScreen';
import ChatSplitView from '@/features/chat/screens/ChatSplitView';
import { SwipeBackView } from '@shared/components/common/SwipeBackView';

const Stack = createNativeStackNavigator<ChatStackParamList>();

const ChatNavigator: React.FC = () => {
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();

  // Desktop режим с split-view
  if (isWideScreen) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      >
        <Stack.Screen
          name="ChatList"
          component={ChatSplitView}
        />
        {/* ChatSettings and CreateChat handled by modals in ChatSplitView/ChatListScreen */}
        {/* Chat screen остается для совместимости, но не используется в desktop */}
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
        />
      </Stack.Navigator>
    );
  }

  // Mobile режим
  return (
    <Stack.Navigator
      screenLayout={({ children }) => <SwipeBackView>{children}</SwipeBackView>}
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.backgroundSecondary,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
          color: theme.text,
        },
        headerShadowVisible: true,
        contentStyle: {
          backgroundColor: theme.background,
        },
        // Fast native slide transition
        animation: 'default',
        animationDuration: 150,
        // Card presentation
        presentation: 'card',
        // Enable gestures for smooth swipe back (iOS native)
        gestureEnabled: true,
        fullScreenGestureEnabled: Platform.OS === 'ios',
      }}
    >
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CreateChat"
        component={CreateChatScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: true,
          headerBackTitleVisible: false,
          headerBackTitle: '',
          // Fast default animation
          animation: 'default',
          animationDuration: 150,
          // Replace animation config
          ...(Platform.OS === 'ios' && {
            animationTypeForReplace: 'pop',
          }),
        }}
      />
      <Stack.Screen
        name="ChatSettings"
        component={ChatSettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Thread"
        component={ThreadScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default ChatNavigator;
