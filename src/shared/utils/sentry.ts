/**
 * Sentry Configuration
 * Конфигурация Sentry для отслеживания ошибок в production
 */

import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

/**
 * Инициализация Sentry (вызывать в App.tsx при запуске)
 */
export function initSentry(): void {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.warn('[Sentry] DSN не настроен, пропускаем инициализацию');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    environment: process.env.EXPO_PUBLIC_ENV || 'development',
  });
}

/**
 * Захват исключения для отправки в Sentry
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  if (!SENTRY_DSN || __DEV__) return;

  Sentry.captureException(error, { extra: context });
}

/**
 * Захват сообщения
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  if (!SENTRY_DSN || __DEV__) return;

  Sentry.captureMessage(message, level);
}

/**
 * Установить пользователя для контекста ошибок
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!SENTRY_DSN) return;

  Sentry.setUser(user);
}
