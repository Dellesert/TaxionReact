/**
 * Chat Navigator
 * Стек навигации для чатов
 */

import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@hooks/useTheme';
import { ChatStackParamList } from './types';
import ChatListScreen from '@screens/chat/ChatListScreen';
import CreateChatScreen from '@screens/chat/CreateChatScreen';
import ChatScreen from '@screens/chat/ChatScreen';
import ChatSettingsScreen from '@screens/chat/ChatSettingsScreen';

const Stack = createNativeStackNavigator<ChatStackParamList>();

const ChatNavigator: React.FC = () => {
  const { theme } = useTheme();

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
