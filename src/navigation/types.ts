/**
 * Navigation Types
 * Типы навигации для React Navigation
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Chat Stack
export type ChatStackParamList = {
  ChatList: undefined;
  CreateChat: {
    initialChatType?: 'private' | 'group' | 'channel';
  };
  Chat: {
    chatId: number;
    chatName?: string;
  };
  ChatSettings: {
    chatId: number;
    chatName?: string;
  };
};

// Task Stack
export type TaskStackParamList = {
  TaskList: undefined;
  CreateTask: undefined;
  TaskDetail: {
    taskId: number;
  };
};

// Poll Stack
export type PollStackParamList = {
  PollList: undefined;
  PollDetail: {
    pollId: number;
    fromChat?: boolean;
    pollTitle?: string;
  };
  CreatePoll: undefined;
  EditPoll: {
    pollId: number;
  };
  PollVoters: {
    pollId: number;
  };
};

// Admin Stack
export type AdminStackParamList = {
  Departments: undefined;
  EditDepartment: {
    departmentId: number;
  };
  Users: undefined;
  EditUser: {
    userId: number;
  };
};

// Main Tab Navigator
export type MainTabParamList = {
  Chats: NavigatorScreenParams<ChatStackParamList>;
  Tasks: NavigatorScreenParams<TaskStackParamList>;
  Calendar: undefined;
  Polls: NavigatorScreenParams<PollStackParamList>;
  Profile: undefined;
  Admin: NavigatorScreenParams<AdminStackParamList>;
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
