/**
 * API Constants
 * Константы для работы с API бэкенда
 */

// Base URLs
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8080';

// Microservices Ports (for reference)
export const MICROSERVICES = {
  USER_SERVICE: 8081,
  CHAT_SERVICE: 8082,
  TASK_SERVICE: 8083,
  CALENDAR_SERVICE: 8084,
  POLL_SERVICE: 8085,
  NOTIFICATION_SERVICE: 8087,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },

  // User
  USER: {
    PROFILE: '/profile',
    PROFILE_BY_ID: (id: number) => `/profile/${id}`,
    UPDATE_PASSWORD: '/profile/password',
    UPDATE_STATUS: '/profile/status',
    LIST: '/users/',
    BY_ID: (id: number) => `/users/${id}/`,
    CREATE: '/users/',
    UPDATE: (id: number) => `/users/${id}/`,
    DELETE: (id: number) => `/users/${id}/`,
  },

  // Department
  DEPARTMENT: {
    LIST: '/departments',
    CREATE: '/departments',
    BY_ID: (id: number) => `/departments/${id}`,
    UPDATE: (id: number) => `/departments/${id}`,
    DELETE: (id: number) => `/departments/${id}`,
    USERS: (id: number) => `/departments/${id}/users`,
  },

  // Chat
  CHAT: {
    LIST: '/chats/',
    CREATE: '/chats/',
    DIRECT: (userId: number) => `/chats/direct/${userId}`,
    TASK: (taskId: number) => `/chats/task/${taskId}`,
    BY_ID: (id: number) => `/chats/${id}/`,
    UPDATE: (id: number) => `/chats/${id}/`,
    DELETE: (id: number) => `/chats/${id}/`,
    JOIN: (id: number) => `/chats/${id}/join`,
    MESSAGES: (id: number) => `/messages/chat/${id}`,
    SEND_MESSAGE: '/messages',
    MEMBERS: (id: number) => `/chats/${id}/members/`,
    ADD_MEMBERS: (id: number) => `/chats/${id}/members/`,
    REMOVE_MEMBER: (chatId: number, userId: number) => `/chats/${chatId}/members/${userId}/`,
    CLEAR_HISTORY: (id: number) => `/chats/${id}/clear-history`,
  },

  // Message
  MESSAGE: {
    BY_ID: (id: number) => `/messages/${id}`,
    UPDATE: (id: number) => `/messages/${id}`,
    DELETE: (id: number) => `/messages/${id}`,
    DELETE_PERMANENT: (id: number) => `/messages/${id}/permanent`,
    RESTORE: (id: number) => `/messages/${id}/restore`,
    PIN: (id: number) => `/messages/${id}/pin`,
    UNPIN: (id: number) => `/messages/${id}/unpin`,
    ADD_REACTION: (id: number) => `/messages/${id}/reactions`,
    REMOVE_REACTION: (id: number, emoji: string) => `/messages/${id}/reactions/${emoji}`,
    MARK_READ: (id: number) => `/messages/${id}/read`,
    MARK_CHAT_READ: (chatId: number) => `/messages/chat/${chatId}/read`,
    SEARCH: '/messages/search',
  },

  // Task
  TASK: {
    LIST: '/tasks/',
    CREATE: '/tasks/',
    BY_ID: (id: number) => `/tasks/${id}`,
    UPDATE: (id: number) => `/tasks/${id}`,
    DELETE: (id: number) => `/tasks/${id}`,
    UPDATE_STATUS: (id: number) => `/tasks/${id}/status`,
    ASSIGN: (id: number) => `/tasks/${id}/assign`,
    UNASSIGN: (id: number) => `/tasks/${id}/assign`,
    COMMENTS: (id: number) => `/tasks/${id}/comments`,
    ADD_COMMENT: (id: number) => `/tasks/${id}/comments`,
    UPDATE_COMMENT: (id: number) => `/comments/${id}`,
    DELETE_COMMENT: (id: number) => `/comments/${id}`,
    STATS: '/tasks/stats',
  },

  // Project
  PROJECT: {
    LIST: '/projects',
    CREATE: '/projects',
    BY_ID: (id: number) => `/projects/${id}`,
    UPDATE: (id: number) => `/projects/${id}`,
    DELETE: (id: number) => `/projects/${id}`,
    TASKS: (id: number) => `/projects/${id}/tasks`,
  },

  // Calendar / Events
  EVENT: {
    LIST: '/events',
    CREATE: '/events',
    BY_ID: (id: number) => `/events/${id}`,
    UPDATE: (id: number) => `/events/${id}`,
    DELETE: (id: number) => `/events/${id}`,
    CALENDAR: '/calendar',
    SEARCH: '/events/search',
    CHECK_CONFLICT: '/events/check-conflict',
    PARTICIPANTS: (id: number) => `/events/${id}/participants`,
    REMOVE_PARTICIPANT: (eventId: number, userId: number) => `/events/${eventId}/participants/${userId}`,
    UPDATE_STATUS: (id: number) => `/events/${id}/status`,
    REMINDERS: (id: number) => `/events/${id}/reminders`,
    DELETE_REMINDER: (eventId: number, reminderId: number) => `/events/${eventId}/reminders/${reminderId}`,
  },

  // Poll
  POLL: {
    LIST: '/polls',
    CREATE: '/polls',
    BY_ID: (id: number) => `/polls/${id}`,
    UPDATE: (id: number) => `/polls/${id}`,
    DELETE: (id: number) => `/polls/${id}`,
    UPDATE_STATUS: (id: number) => `/polls/${id}/status`,
    VOTE: (id: number) => `/polls/${id}/vote`,
    RESULTS: (id: number) => `/polls/${id}/results`,
    MY_VOTES: (id: number) => `/polls/${id}/my-votes`, // Исправлено с /votes на /my-votes
    VOTERS: (id: number) => `/polls/${id}/voters`,
    COMMENTS: (id: number) => `/polls/${id}/comments`,
    ADD_COMMENT: (id: number) => `/polls/${id}/comments`,
    DELETE_COMMENT: (pollId: number, commentId: number) => `/polls/${pollId}/comments/${commentId}`,
    SEARCH: '/polls/search',
    STATS: '/polls/stats',
  },

  // Notification
  NOTIFICATION: {
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    BY_ID: (id: number) => `/notifications/${id}`,
    MARK_READ: (id: number) => `/notifications/${id}/read`,
    MARK_MULTIPLE_READ: '/notifications/read',
    MARK_ALL_READ: '/notifications/read-all',
    STATS: '/notifications/stats',
    SEARCH: '/notifications/search',
    PREFERENCES: '/notifications/preferences',
    UPDATE_PREFERENCES: '/notifications/preferences',
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Request Timeouts
export const TIMEOUTS = {
  DEFAULT: 10000, // 10 seconds
  UPLOAD: 30000,  // 30 seconds
  DOWNLOAD: 60000, // 60 seconds
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  DEFAULT_OFFSET: 0,
  MAX_LIMIT: 100,
} as const;

// WebSocket Events
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  MESSAGE_NEW: 'message:new',
  MESSAGE_UPDATE: 'message:update',
  MESSAGE_DELETE: 'message:delete',
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_STATUS_CHANGE: 'user:status:change',
} as const;
