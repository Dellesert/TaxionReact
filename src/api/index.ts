/**
 * API Index
 * Centralized export of all API clients
 */

export * as authApi from '../features/auth/api/auth.api';
export * as userApi from './user.api';
export * as chatApi from './chat.api';
export * as taskApi from './task.api';
export * as calendarApi from '../features/calendar/api/calendar.api';
export * as pollApi from './poll.api';
export * as notificationApi from './notification.api';

export { default as api } from './axios.config';
