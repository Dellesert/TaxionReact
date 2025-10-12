/**
 * Navigation Types
 * Типы навигации для React Navigation
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Chat Stack
export type ChatStackParamList = {
  ChatList: undefined;
  Chat: {
    chatId: number;
    chatName?: string;
  };
};

// Main Tab Navigator
export type MainTabParamList = {
  Chats: NavigatorScreenParams<ChatStackParamList>;
  TaskList: undefined;
  Calendar: undefined;
  PollList: undefined;
  Profile: undefined;
};

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// Root Stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// Navigation Props Types
export type ChatListNavigationProp = NativeStackNavigationProp<
  ChatStackParamList,
  'ChatList'
>;

export type ChatScreenNavigationProp = NativeStackNavigationProp<
  ChatStackParamList,
  'Chat'
>;
