/**
 * Mock Data для разработки без бэкенда
 */

import { User, TokenPair } from '@types/user.types';
import { Chat, Message } from '@types/chat.types';

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true';

export const MOCK_USER: User = {
  id: 'mock-user-1',
  email: 'demo@tachyon.com',
  full_name: 'Демо Пользователь',
  avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=3B82F6&color=fff',
  role: 'user',
  status: 'online',
  department: {
    id: 'dept-1',
    name: 'Разработка',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  position: 'Frontend Developer',
  phone: '+7 (999) 123-45-67',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_TOKENS: TokenPair = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
};

export const mockLogin = async (email: string, password: string) => {
  if (!USE_MOCK) {
    throw new Error('Mock mode is disabled');
  }

  // Имитация задержки сети
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Простая валидация для демо
  if (email === 'demo@tachyon.com' && password === 'demo123') {
    return {
      user: MOCK_USER,
      tokens: MOCK_TOKENS,
    };
  }

  // Любой email/password принимаем в demo режиме
  return {
    user: {
      ...MOCK_USER,
      email,
      full_name: email.split('@')[0],
    },
    tokens: MOCK_TOKENS,
  };
};

export const mockRegister = async (userData: any) => {
  if (!USE_MOCK) {
    throw new Error('Mock mode is disabled');
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));

  return {
    user: {
      ...MOCK_USER,
      email: userData.email,
      full_name: userData.full_name,
    },
    tokens: MOCK_TOKENS,
  };
};

export const isMockMode = () => USE_MOCK;

// Mock Chats
export const MOCK_CHATS: Chat[] = [
  {
    id: 1,
    type: 'group',
    name: 'Команда разработки',
    description: 'Общий чат команды разработки',
    avatar_url: 'https://ui-avatars.com/api/?name=Dev+Team&background=E94444&color=fff',
    created_by: 1,
    members: [],
    members_count: 5,
    is_pinned: true,
    is_muted: false,
    unread_count: 3,
    last_message: {
      id: '1',
      chat_id: '1',
      sender: MOCK_USER,
      content: 'Привет всем! Как дела с проектом?',
      type: 'text',
      created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      is_read: false,
      is_edited: false,
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 2,
    type: 'private',
    name: 'Анна Иванова',
    avatar_url: 'https://ui-avatars.com/api/?name=Anna+Ivanova&background=3B82F6&color=fff',
    created_by: 1,
    members: [],
    members_count: 2,
    is_pinned: false,
    is_muted: false,
    unread_count: 0,
    last_message: {
      id: '2',
      chat_id: '2',
      sender: MOCK_USER,
      content: 'Отлично, спасибо!',
      type: 'text',
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      is_read: true,
      is_edited: false,
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 3,
    type: 'group',
    name: 'Проект Тахион',
    description: 'Обсуждение проекта Тахион',
    avatar_url: 'https://ui-avatars.com/api/?name=Tachyon&background=10B981&color=fff',
    created_by: 1,
    members: [],
    members_count: 8,
    is_pinned: false,
    is_muted: false,
    unread_count: 1,
    last_message: {
      id: '3',
      chat_id: '3',
      sender: MOCK_USER,
      content: 'Завтра встреча в 10:00',
      type: 'text',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      is_read: false,
      is_edited: false,
    },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

export const mockGetChats = async (): Promise<Chat[]> => {
  if (!USE_MOCK) {
    throw new Error('Mock mode is disabled');
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_CHATS;
};
