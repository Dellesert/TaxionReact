/**
 * Logger Utility
 * Утилита логирования — в production подавляет все логи кроме console.error
 *
 * Для нового кода используйте вместо console.log/warn:
 *   import { logger } from '@shared/utils/logger';
 *   logger.log('Debug info', data);
 *   logger.error('Critical error', error);  // Работает всегда
 *
 * Для существующего кода: babel-plugin-transform-remove-console
 * автоматически удаляет console.log/info/debug в production-билдах
 */

const noop = (): void => {};

export const logger = {
  log: __DEV__ ? console.log.bind(console) : noop,
  info: __DEV__ ? console.info.bind(console) : noop,
  warn: __DEV__ ? console.warn.bind(console) : noop,
  error: console.error.bind(console),
  debug: __DEV__ ? console.debug.bind(console) : noop,
};
