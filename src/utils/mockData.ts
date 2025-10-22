/**
 * Mock Data для разработки без бэкенда
 */

import { User, TokenPair } from '@types/user.types';
import { Chat, Message } from '@types/chat.types';

const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK_DATA === 'true';

export const MOCK_USER: User = {
  id: 1,
  email: 'demo@tachyon.com',
  name: 'Демо Пользователь',
  avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=3B82F6&color=fff',
  role: 'employee',
  status: 'online',
  department_id: 1,
  department: {
    id: 1,
    name: 'Разработка',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  position: 'Frontend Developer',
  phone: '+7 (999) 123-45-67',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_TOKENS: TokenPair = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
};

// Mock Users List
export const MOCK_USERS: User[] = [
  {
    id: 1,
    email: 'demo@tachyon.com',
    name: 'Демо Пользователь',
    avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=3B82F6&color=fff',
    role: 'employee',
    status: 'online',
    department_id: 1,
    position: 'Frontend Developer',
    phone: '+7 (999) 123-45-67',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    email: 'anna@tachyon.com',
    name: 'Анна Иванова',
    avatar: 'https://ui-avatars.com/api/?name=Anna+Ivanova&background=E94444&color=fff',
    role: 'employee',
    status: 'online',
    department_id: 1,
    position: 'UI/UX Designer',
    phone: '+7 (999) 234-56-78',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    email: 'petr@tachyon.com',
    name: 'Петр Смирнов',
    avatar: 'https://ui-avatars.com/api/?name=Petr+Smirnov&background=10B981&color=fff',
    role: 'employee',
    status: 'online',
    department_id: 1,
    position: 'Backend Developer',
    phone: '+7 (999) 345-67-89',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    email: 'maria@tachyon.com',
    name: 'Мария Петрова',
    avatar: 'https://ui-avatars.com/api/?name=Maria+Petrova&background=F59E0B&color=fff',
    role: 'manager',
    status: 'busy',
    department_id: 2,
    position: 'Project Manager',
    phone: '+7 (999) 456-78-90',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    email: 'ivan@tachyon.com',
    name: 'Иван Козлов',
    avatar: 'https://ui-avatars.com/api/?name=Ivan+Kozlov&background=8B5CF6&color=fff',
    role: 'employee',
    status: 'away',
    department_id: 1,
    position: 'DevOps Engineer',
    phone: '+7 (999) 567-89-01',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 6,
    email: 'elena@tachyon.com',
    name: 'Елена Сидорова',
    avatar: 'https://ui-avatars.com/api/?name=Elena+Sidorova&background=EC4899&color=fff',
    role: 'employee',
    status: 'online',
    department_id: 2,
    position: 'QA Engineer',
    phone: '+7 (999) 678-90-12',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 7,
    email: 'alex@tachyon.com',
    name: 'Алексей Новиков',
    avatar: 'https://ui-avatars.com/api/?name=Alex+Novikov&background=6366F1&color=fff',
    role: 'admin',
    status: 'online',
    department_id: 1,
    position: 'Tech Lead',
    phone: '+7 (999) 789-01-23',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 8,
    email: 'olga@tachyon.com',
    name: 'Ольга Волкова',
    avatar: 'https://ui-avatars.com/api/?name=Olga+Volkova&background=14B8A6&color=fff',
    role: 'employee',
    status: 'offline',
    department_id: 3,
    position: 'HR Manager',
    phone: '+7 (999) 890-12-34',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 9,
    email: 'dmitry@tachyon.com',
    name: 'Дмитрий Морозов',
    avatar: 'https://ui-avatars.com/api/?name=Dmitry+Morozov&background=F97316&color=fff',
    role: 'employee',
    status: 'online',
    department_id: 1,
    position: 'Full Stack Developer',
    phone: '+7 (999) 901-23-45',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 10,
    email: 'svetlana@tachyon.com',
    name: 'Светлана Кузнецова',
    avatar: 'https://ui-avatars.com/api/?name=Svetlana+Kuznetsova&background=84CC16&color=fff',
    role: 'manager',
    status: 'busy',
    department_id: 2,
    position: 'Product Manager',
    phone: '+7 (999) 012-34-56',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockGetUsers = async (): Promise<User[]> => {
  if (!USE_MOCK) {
    throw new Error('Mock mode is disabled');
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_USERS;
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
      name: email.split('@')[0],
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
      name: userData.name || userData.full_name,
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
    avatar: 'https://ui-avatars.com/api/?name=Dev+Team&background=E94444&color=fff',
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
    avatar: 'https://ui-avatars.com/api/?name=Anna+Ivanova&background=3B82F6&color=fff',
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
    avatar: 'https://ui-avatars.com/api/?name=Tachyon&background=10B981&color=fff',
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

// Mock Messages for Chat
export const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    chat_id: '1',
    sender: {
      id: 'user-2',
      email: 'anna@tachyon.com',
      full_name: 'Анна Иванова',
      avatar: 'https://ui-avatars.com/api/?name=Anna+Ivanova&background=3B82F6&color=fff',
      role: 'user',
      status: 'online',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    content: 'Привет! Как продвигается работа над проектом?',
    type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    is_read: true,
    is_edited: false,
  },
  {
    id: '2',
    chat_id: '1',
    sender: MOCK_USER,
    content: 'Все идет по плану! Закончил верстку главного экрана',
    type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    is_read: true,
    is_edited: false,
  },
  {
    id: '3',
    chat_id: '1',
    sender: {
      id: 'user-3',
      email: 'petr@tachyon.com',
      full_name: 'Петр Смирнов',
      avatar: 'https://ui-avatars.com/api/?name=Petr+Smirnov&background=10B981&color=fff',
      role: 'user',
      status: 'online',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    content: 'Отлично! А я закончил с API интеграцией',
    type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    is_read: true,
    is_edited: false,
  },
  {
    id: '4',
    chat_id: '1',
    sender: MOCK_USER,
    content: 'Супер! Когда можем протестировать вместе?',
    type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    is_read: true,
    is_edited: false,
  },
  {
    id: '5',
    chat_id: '1',
    sender: {
      id: 'user-2',
      email: 'anna@tachyon.com',
      full_name: 'Анна Иванова',
      avatar: 'https://ui-avatars.com/api/?name=Anna+Ivanova&background=3B82F6&color=fff',
      role: 'user',
      status: 'online',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    content: 'Можем завтра в 14:00?',
    type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    is_read: true,
    is_edited: false,
  },
  {
    id: '6',
    chat_id: '1',
    sender: MOCK_USER,
    content: 'Идеально! Жду встречи 👍',
    type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    is_read: true,
    is_edited: false,
  },
  {
    id: '7',
    chat_id: '1',
    sender: {
      id: 'user-3',
      email: 'petr@tachyon.com',
      full_name: 'Петр Смирнов',
      avatar: 'https://ui-avatars.com/api/?name=Petr+Smirnov&background=10B981&color=fff',
      role: 'user',
      status: 'online',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    content: 'Кстати, нужно будет обсудить архитектуру базы данных',
    type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    is_read: true,
    is_edited: false,
  },
  {
    id: '8',
    chat_id: '1',
    sender: {
      id: 'user-2',
      email: 'anna@tachyon.com',
      full_name: 'Анна Иванова',
      avatar: 'https://ui-avatars.com/api/?name=Anna+Ivanova&background=3B82F6&color=fff',
      role: 'user',
      status: 'online',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    content: 'Да, хорошая идея. Добавим в повестку',
    type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    is_read: true,
    is_edited: false,
  },
  {
    id: '9',
    chat_id: '1',
    sender: MOCK_USER,
    content: 'У меня есть несколько идей по оптимизации',
    type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    is_read: true,
    is_edited: false,
  },
  {
    id: '10',
    chat_id: '1',
    sender: {
      id: 'user-3',
      email: 'petr@tachyon.com',
      full_name: 'Петр Смирнов',
      avatar: 'https://ui-avatars.com/api/?name=Petr+Smirnov&background=10B981&color=fff',
      role: 'user',
      status: 'online',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    content: 'Отлично! Делись завтра на встрече',
    type: 'text',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    is_read: false,
    is_edited: false,
  },
];

export const mockGetMessages = async (chatId: string): Promise<Message[]> => {
  if (!USE_MOCK) {
    throw new Error('Mock mode is disabled');
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_MESSAGES.filter((msg) => msg.chat_id === chatId);
};

// Mock Tasks
import { Task } from '@types/task.types';

export const MOCK_TASKS: Task[] = [
  {
    id: 1,
    title: 'Реализовать авторизацию пользователей',
    description: 'Добавить JWT аутентификацию с refresh токенами',
    status: 'in_progress',
    priority: 'high',
    assigned_to: 1,
    assignee: MOCK_USER,
    created_by: 2,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    tags: ['backend', 'security'],
    comments_count: 3,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 2,
    title: 'Дизайн главного экрана',
    description: 'Создать макеты для главного экрана приложения',
    status: 'review',
    priority: 'medium',
    assigned_to: 2,
    created_by: 1,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString(),
    tags: ['design', 'ui/ux'],
    comments_count: 5,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 3,
    title: 'Настроить CI/CD pipeline',
    description: 'Настроить автоматическую сборку и деплой',
    status: 'todo',
    priority: 'urgent',
    assigned_to: 3,
    created_by: 1,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    tags: ['devops', 'infrastructure'],
    comments_count: 1,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 4,
    title: 'Оптимизация запросов к БД',
    description: 'Добавить индексы и оптимизировать медленные запросы',
    status: 'done',
    priority: 'high',
    assigned_to: 1,
    assignee: MOCK_USER,
    created_by: 2,
    due_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    tags: ['backend', 'performance'],
    comments_count: 7,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 5,
    title: 'Написать документацию API',
    description: 'Документировать все эндпоинты с примерами',
    status: 'todo',
    priority: 'low',
    created_by: 1,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    tags: ['documentation'],
    comments_count: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 6,
    title: 'Реализовать систему уведомлений',
    description: 'Push уведомления для мобильного приложения',
    status: 'in_progress',
    priority: 'medium',
    assigned_to: 2,
    created_by: 1,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    tags: ['mobile', 'notifications'],
    comments_count: 2,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 7,
    title: 'Баг: не работает поиск',
    description: 'Поиск не находит пользователей с кириллицей в имени',
    status: 'todo',
    priority: 'urgent',
    assigned_to: 1,
    assignee: MOCK_USER,
    created_by: 3,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    tags: ['bug', 'frontend'],
    comments_count: 4,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
  },
  {
    id: 8,
    title: 'Тестирование новых функций',
    description: 'Написать unit и integration тесты',
    status: 'review',
    priority: 'medium',
    assigned_to: 3,
    created_by: 1,
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4).toISOString(),
    tags: ['testing', 'qa'],
    comments_count: 6,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
];

export const mockGetTasks = async (): Promise<Task[]> => {
  if (!USE_MOCK) {
    throw new Error('Mock mode is disabled');
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_TASKS;
};

export const mockGetTask = async (taskId: number): Promise<Task> => {
  if (!USE_MOCK) {
    throw new Error('Mock mode is disabled');
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  const task = MOCK_TASKS.find((t) => t.id === taskId);
  if (!task) {
    throw new Error('Task not found');
  }
  return task;
};

// Mock Calendar Events
import { Event } from '@types/calendar.types';

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);

export const MOCK_EVENTS: Event[] = [
  {
    id: 1,
    title: 'Встреча команды',
    description: 'Еженедельная встреча команды разработки',
    start_time: new Date(today.setHours(10, 0, 0, 0)).toISOString(),
    end_time: new Date(today.setHours(11, 0, 0, 0)).toISOString(),
    all_day: false,
    location: 'Конференц-зал',
    type: 'meeting',
    color: '#3B82F6',
    is_private: false,
    is_recurring: true,
    created_by: 1,
    participants: [],
    participants_count: 5,
    reminders: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 2,
    title: 'Дедлайн проекта Tachyon',
    description: 'Финальная сдача проекта клиенту',
    start_time: new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString(),
    end_time: new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString(),
    all_day: true,
    type: 'deadline',
    color: '#EF4444',
    is_private: false,
    is_recurring: false,
    created_by: 1,
    participants: [],
    participants_count: 3,
    reminders: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: 3,
    title: 'Код-ревью',
    description: 'Ревью новых фич',
    start_time: new Date(today.setHours(14, 30, 0, 0)).toISOString(),
    end_time: new Date(today.setHours(15, 30, 0, 0)).toISOString(),
    all_day: false,
    type: 'meeting',
    color: '#10B981',
    is_private: false,
    is_recurring: false,
    created_by: 1,
    participants: [],
    participants_count: 2,
    reminders: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 4,
    title: 'Обед',
    description: 'Личное время',
    start_time: new Date(today.setHours(13, 0, 0, 0)).toISOString(),
    end_time: new Date(today.setHours(14, 0, 0, 0)).toISOString(),
    all_day: false,
    type: 'personal',
    color: '#8B5CF6',
    is_private: true,
    is_recurring: true,
    created_by: 1,
    participants: [],
    participants_count: 0,
    reminders: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
  {
    id: 5,
    title: 'Презентация для клиента',
    description: 'Демо новых возможностей',
    start_time: new Date(nextWeek.setHours(15, 0, 0, 0)).toISOString(),
    end_time: new Date(nextWeek.setHours(16, 30, 0, 0)).toISOString(),
    all_day: false,
    location: 'Online (Zoom)',
    type: 'meeting',
    color: '#F59E0B',
    is_private: false,
    is_recurring: false,
    created_by: 1,
    participants: [],
    participants_count: 8,
    reminders: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export const mockGetEvents = async (): Promise<Event[]> => {
  if (!USE_MOCK) {
    throw new Error('Mock mode is disabled');
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_EVENTS;
};

// Mock Polls
import { Poll } from '@types/poll.types';

export const MOCK_POLLS: Poll[] = [
  {
    id: 1,
    title: 'Выбор технологии для нового проекта',
    description: 'Какую технологию использовать для backend нового проекта?',
    type: 'single_choice',
    status: 'active',
    visibility: 'department',
    is_anonymous: false,
    allow_comments: true,
    allow_multiple_votes: false,
    created_by: 1,
    options: [
      { id: 1, poll_id: 1, text: 'Node.js + Express', order: 1, votes_count: 8, percentage: 40, created_at: new Date().toISOString() },
      { id: 2, poll_id: 1, text: 'Go + Gin', order: 2, votes_count: 10, percentage: 50, created_at: new Date().toISOString() },
      { id: 3, poll_id: 1, text: 'Python + FastAPI', order: 3, votes_count: 2, percentage: 10, created_at: new Date().toISOString() },
    ],
    total_votes: 20,
    user_has_voted: false,
    comments_count: 5,
    end_time: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 2,
    title: 'Лучшее время для встречи команды',
    description: 'Когда вам удобнее проводить еженедельные встречи?',
    type: 'single_choice',
    status: 'active',
    visibility: 'public',
    is_anonymous: false,
    allow_comments: false,
    allow_multiple_votes: false,
    created_by: 1,
    options: [
      { id: 4, poll_id: 2, text: 'Понедельник 10:00', order: 1, votes_count: 3, percentage: 20, created_at: new Date().toISOString() },
      { id: 5, poll_id: 2, text: 'Среда 14:00', order: 2, votes_count: 7, percentage: 47, created_at: new Date().toISOString() },
      { id: 6, poll_id: 2, text: 'Пятница 11:00', order: 3, votes_count: 5, percentage: 33, created_at: new Date().toISOString() },
    ],
    total_votes: 15,
    user_has_voted: true,
    comments_count: 0,
    end_time: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 3,
    title: 'Оцените новый дизайн приложения',
    description: 'Насколько вам нравится обновленный дизайн?',
    type: 'rating',
    status: 'active',
    visibility: 'public',
    is_anonymous: true,
    allow_comments: true,
    allow_multiple_votes: false,
    created_by: 1,
    options: [
      { id: 7, poll_id: 3, text: '1', order: 1, votes_count: 0, percentage: 0, created_at: new Date().toISOString() },
      { id: 8, poll_id: 3, text: '2', order: 2, votes_count: 1, percentage: 5, created_at: new Date().toISOString() },
      { id: 9, poll_id: 3, text: '3', order: 3, votes_count: 3, percentage: 15, created_at: new Date().toISOString() },
      { id: 10, poll_id: 3, text: '4', order: 4, votes_count: 10, percentage: 50, created_at: new Date().toISOString() },
      { id: 11, poll_id: 3, text: '5', order: 5, votes_count: 6, percentage: 30, created_at: new Date().toISOString() },
    ],
    total_votes: 20,
    user_has_voted: false,
    comments_count: 8,
    end_time: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 4,
    title: 'Корпоративные мероприятия',
    description: 'Какие мероприятия вы бы хотели видеть в компании? (можно выбрать несколько)',
    type: 'multiple_choice',
    status: 'active',
    visibility: 'public',
    is_anonymous: false,
    allow_comments: true,
    allow_multiple_votes: true,
    created_by: 1,
    options: [
      { id: 12, poll_id: 4, text: 'Спортивные соревнования', order: 1, votes_count: 12, percentage: 60, created_at: new Date().toISOString() },
      { id: 13, poll_id: 4, text: 'Хакатоны', order: 2, votes_count: 18, percentage: 90, created_at: new Date().toISOString() },
      { id: 14, poll_id: 4, text: 'Тимбилдинг', order: 3, votes_count: 8, percentage: 40, created_at: new Date().toISOString() },
      { id: 15, poll_id: 4, text: 'Вечеринки', order: 4, votes_count: 14, percentage: 70, created_at: new Date().toISOString() },
    ],
    total_votes: 20,
    user_has_voted: false,
    comments_count: 12,
    end_time: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 5,
    title: 'Результаты квартала',
    description: 'Оцените работу команды в прошедшем квартале',
    type: 'single_choice',
    status: 'closed',
    visibility: 'public',
    is_anonymous: false,
    allow_comments: true,
    allow_multiple_votes: false,
    created_by: 1,
    options: [
      { id: 16, poll_id: 5, text: 'Отлично', order: 1, votes_count: 15, percentage: 50, created_at: new Date().toISOString() },
      { id: 17, poll_id: 5, text: 'Хорошо', order: 2, votes_count: 12, percentage: 40, created_at: new Date().toISOString() },
      { id: 18, poll_id: 5, text: 'Удовлетворительно', order: 3, votes_count: 3, percentage: 10, created_at: new Date().toISOString() },
    ],
    total_votes: 30,
    user_has_voted: true,
    comments_count: 18,
    start_time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    end_time: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
];

export const mockGetPolls = async (): Promise<Poll[]> => {
  if (!USE_MOCK) {
    throw new Error('Mock mode is disabled');
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_POLLS;
};
