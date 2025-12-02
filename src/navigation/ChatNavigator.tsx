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
import ChatSplitView from '@/features/chat/screens/ChatSplitView';

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
        // Telegram-style slide transition (native only, web uses default)
        animation: 'slide_from_right',
        animationDuration: 300,
        // На веб используем простую анимацию
        presentation: 'card',
        // Включаем gesture для более плавного свайпа назад
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
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
          // Красивая slide анимация справа
          animation: 'slide_from_right',
          // Более быстрая анимация для iOS чтобы navbar появлялся раньше
          animationDuration: Platform.OS === 'ios' ? 250 : 300,
          // Настройка анимации для iOS
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
    </Stack.Navigator>
  );
};

export default ChatNavigator;
