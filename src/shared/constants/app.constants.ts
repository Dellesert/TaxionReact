/**
 * Application Constants
 * Общие константы приложения
 */

// Storage Keys
export const STORAGE_KEYS = {
  SESSION_ID: 'session_id', // Session-based authentication
  USER_DATA: 'user_data',
  THEME: 'theme',
  LANGUAGE: 'language',
  NOTIFICATION_PREFERENCES: 'notification_preferences',
  // Multi-account keys
  ACCOUNTS: 'accounts', // JSON array of SavedAccount[]
  ACTIVE_ACCOUNT_ID: 'active_account_id', // Current active user ID
  SESSION_ID_PREFIX: 'session_id_', // + userId -> per-account session
  USER_DATA_PREFIX: 'user_data_', // + userId -> per-account user data
} as const;

// Multi-account limits
export const ACCOUNT_LIMITS = {
  MAX_ACCOUNTS: 5,
} as const;

// Session Configuration
export const SESSION_CONFIG = {
  SESSION_LIFETIME: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  SESSION_WARNING_TIME: 5 * 60 * 1000, // Show warning 5 minutes before expiration
} as const;

// User Roles
export const USER_ROLES = {
  EMPLOYEE: 'employee',
  DEPARTMENT_HEAD: 'department_head',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

// User Status
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  AWAY: 'away',
} as const;

// Chat Types
export const CHAT_TYPES = {
  PERSONAL: 'personal',
  GROUP: 'group',
  CHANNEL: 'channel',
} as const;

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  VOICE: 'voice',
  VIDEO: 'video',
  SYSTEM: 'system',
} as const;

// Task Status
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done',
  CANCELLED: 'cancelled',
} as const;

// Task Priority
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// Event Types
export const EVENT_TYPES = {
  PERSONAL: 'personal',
  MEETING: 'meeting',
  DEADLINE: 'deadline',
} as const;

// Event Participant Status
export const EVENT_PARTICIPANT_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  MAYBE: 'maybe',
} as const;

// Poll Types
export const POLL_TYPES = {
  SINGLE_CHOICE: 'single_choice',
  MULTIPLE_CHOICE: 'multiple_choice',
  RANKING: 'ranking',
  RATING: 'rating',
  OPEN_TEXT: 'open_text',
} as const;

// Poll Status
export const POLL_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
  CANCELLED: 'cancelled',
} as const;

// Poll Visibility
export const POLL_VISIBILITY = {
  PUBLIC: 'public',
  DEPARTMENT: 'department',
  INVITE_ONLY: 'invite_only',
  PRIVATE: 'private',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  TASK: 'task',
  EVENT: 'event',
  POLL: 'poll',
  SYSTEM: 'system',
  MENTION: 'mention',
  REACTION: 'reaction',
} as const;

// Notification Priority
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

// Themes
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// Languages
export const LANGUAGES = {
  EN: 'en',
  RU: 'ru',
} as const;

// Date Formats
export const DATE_FORMATS = {
  FULL: 'dd.MM.yyyy HH:mm:ss',
  DATE_TIME: 'dd.MM.yyyy HH:mm',
  DATE: 'dd.MM.yyyy',
  TIME: 'HH:mm',
  SHORT: 'dd.MM.yy',
  MONTH_YEAR: 'MMMM yyyy',
  DAY_MONTH: 'dd MMMM',
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5 MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// Validation
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 50,
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_MESSAGE_LENGTH: 5000,
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
} as const;

// Debounce Times
export const DEBOUNCE_TIME = {
  SEARCH: 300,
  TYPING: 500,
  AUTO_SAVE: 1000,
} as const;

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// App Info
export const APP_INFO = {
  NAME: 'Tachyon Messenger',
  VERSION: '1.0.0',
  BUILD: '1',
} as const;
