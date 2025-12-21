/**
 * Navigation Types
 * Типы навигации для React Navigation
 */

import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Chat } from '@/features/chat/types/chat.types';

// Chat Stack
export type ChatStackParamList = {
  ChatList: undefined;
  CreateChat: {
    initialChatType?: 'private' | 'group' | 'channel';
    onChatCreated?: (chat: Chat) => void;
  };
  Chat: {
    chatId: number;
    chatName?: string;
    unreadCount?: number; // Количество непрочитанных сообщений
  };
  ChatSettings: {
    chatId: number;
    chatName?: string;
  };
};

// Task Stack
export type TaskStackParamList = {
  TaskList: {
    filterCategory?: string;
    taskIds?: number[];
  } | undefined;
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

// Calendar Stack
export type CalendarStackParamList = {
  CalendarMain: undefined;
  EventDetail: {
    eventId: number;
    fromChat?: boolean;
  };
};

// Admin Stack
export type AdminStackParamList = {
  AdminHub: undefined;
  Departments: undefined;
  EditDepartment: {
    departmentId: number;
  };
  Users: undefined;
  EditUser: {
    userId: number;
  };
  MetricsAnalytics: undefined;
  PerformanceAnalytics: undefined;
  DepartmentsAnalytics: undefined;
  SecurityAnalytics: undefined;
};

// Profile Stack
export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  ActiveSessions: undefined;
  PasskeyManagement: undefined;
  About: undefined;
  NotificationSettings: undefined;
};

// Notification Stack
export type NotificationStackParamList = {
  NotificationList: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Chats: NavigatorScreenParams<ChatStackParamList>;
  Tasks: NavigatorScreenParams<TaskStackParamList>;
  Calendar: NavigatorScreenParams<CalendarStackParamList>;
  Polls: NavigatorScreenParams<PollStackParamList>;
  Notifications: NavigatorScreenParams<NotificationStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
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
