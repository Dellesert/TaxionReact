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
    SEND_2FA: '/auth/2fa/send',
    VERIFY_2FA: '/auth/2fa/verify',
    PASSKEY_LOGIN_BEGIN: '/auth/passkey/login/begin',
    PASSKEY_LOGIN_DISCOVERABLE_BEGIN: '/auth/passkey/login/discoverable/begin',
    PASSKEY_LOGIN_FINISH: '/auth/passkey/login/finish',
    PASSKEY_REGISTER_BEGIN: '/auth/passkey/register/begin',
    PASSKEY_REGISTER_FINISH: '/auth/passkey/register/finish',
    PASSKEY_LIST: '/auth/passkey',
    PASSKEY_DELETE: (id: number) => `/auth/passkey/${id}`,
    PASSKEY_UPDATE: (id: number) => `/auth/passkey/${id}`,
  },

  // User
  USER: {
    PROFILE: '/profile',
    PROFILE_BY_ID: (id: number) => `/profile/${id}`,
    UPDATE_PASSWORD: '/profile/password',
    UPDATE_STATUS: '/profile/status',
    // Admin endpoints
    ADMIN_LIST: '/admin/users',
    ADMIN_STATS: '/admin/users/stats',
    ADMIN_BY_ID: (id: number) => `/admin/users/${id}`,
    ADMIN_CREATE: '/admin/users',
    ADMIN_UPDATE: (id: number) => `/admin/users/${id}`,
    ADMIN_DELETE: (id: number) => `/admin/users/${id}`,
    UPDATE_ROLE: (id: number) => `/admin/users/${id}/role`,
    UPDATE_USER_STATUS: (id: number) => `/admin/users/${id}/status`,
    ACTIVATE: (id: number) => `/admin/users/${id}/activate`,
    DEACTIVATE: (id: number) => `/admin/users/${id}/deactivate`,
  },

  // Department
  DEPARTMENT: {
    LIST: '/admin/departments',
    CREATE: '/admin/departments',
    BY_ID: (id: number) => `/admin/departments/${id}`,
    UPDATE: (id: number) => `/admin/departments/${id}`,
    DELETE: (id: number) => `/admin/departments/${id}`,
    USERS: (id: number) => `/admin/departments/${id}/users`,
  },

  // Subdepartment
  SUBDEPARTMENT: {
    LIST: '/admin/subdepartments',
    CREATE: '/admin/subdepartments',
    BY_ID: (id: number) => `/admin/subdepartments/${id}`,
    UPDATE: (id: number) => `/admin/subdepartments/${id}`,
    DELETE: (id: number) => `/admin/subdepartments/${id}`,
  },

  // Chat
  CHAT: {
    LIST: '/chats/',
    PINNED: '/chats/pinned',
    CREATE: '/chats/',
    DIRECT: (userId: number) => `/chats/direct/${userId}`,
    TASK: (taskId: number) => `/chats/task/${taskId}`,
    BY_ID: (id: number) => `/chats/${id}/`,
    UPDATE: (id: number) => `/chats/${id}/`,
    DELETE: (id: number) => `/chats/${id}/`,
    JOIN: (id: number) => `/chats/${id}/join`,
    // NEW API endpoints (v1)
    MESSAGES_LATEST: (id: number) => `/chats/${id}/messages/latest`,
    MESSAGES_BEFORE: (chatId: number, messageId: number) => `/chats/${chatId}/messages/before/${messageId}`,
    MESSAGES_AFTER: (chatId: number, messageId: number) => `/chats/${chatId}/messages/after/${messageId}`,
    MESSAGES_CONTEXT: (chatId: number, messageId: number) => `/chats/${chatId}/messages/context/${messageId}`,
    READ: (id: number) => `/chats/${id}/read`,
    // DEPRECATED (old endpoints - will be removed)
    MESSAGES: (id: number) => `/messages/chat/${id}`, // deprecated - use MESSAGES_LATEST
    SEND_MESSAGE: '/messages',
    MEMBERS: (id: number) => `/chats/${id}/members/`,
    ADD_MEMBERS: (id: number) => `/chats/${id}/members/`,
    REMOVE_MEMBER: (chatId: number, userId: number) => `/chats/${chatId}/members/${userId}/`,
    CLEAR_HISTORY: (id: number) => `/chats/${id}/clear-history`,
    UNREAD_COUNT: '/chats/unread-count',
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
    MARK_CHAT_READ: (chatId: number) => `/messages/chat/${chatId}/read`, // DEPRECATED - use CHAT.READ
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
    UPDATE_COMMENT: (commentId: number) => `/comments/${commentId}`,
    DELETE_COMMENT: (commentId: number) => `/comments/${commentId}`,
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
    DELETE: (id: number) => `/notifications/${id}`,
    DELETE_ALL: '/notifications',
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
  DEFAULT_LIMIT: 10,
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
  NOTIFICATION_NEW: 'notification:new',
} as const;
