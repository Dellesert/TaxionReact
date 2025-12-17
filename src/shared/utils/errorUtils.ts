/**
 * Error Utilities
 * Утилиты для обработки и форматирования ошибок API
 */

import { ApiError, APIErrorResponse, FieldError } from '@types/common.types';

// Enum для всех возможных error_code
export enum ErrorCode {
  // Authentication
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCOUNT_DEACTIVATED = 'AUTH_ACCOUNT_DEACTIVATED',
  AUTH_2FA_REQUIRED = 'AUTH_2FA_REQUIRED',
  AUTH_PASSKEY_ONLY = 'AUTH_PASSKEY_ONLY',
  AUTH_SUPER_ADMIN_WEB_ONLY = 'AUTH_SUPER_ADMIN_WEB_ONLY',
  AUTH_PASSWORD_EXPIRED = 'AUTH_PASSWORD_EXPIRED',

  // 2FA
  AUTH_2FA_NOT_ENABLED = 'AUTH_2FA_NOT_ENABLED',
  AUTH_2FA_INVALID_CODE = 'AUTH_2FA_INVALID_CODE',
  AUTH_2FA_CODE_EXPIRED = 'AUTH_2FA_CODE_EXPIRED',
  AUTH_2FA_SEND_FAILED = 'AUTH_2FA_SEND_FAILED',

  // Passkey
  AUTH_PASSKEY_INVALID = 'AUTH_PASSKEY_INVALID',
  AUTH_PASSKEY_REGISTRATION_FAILED = 'AUTH_PASSKEY_REGISTRATION_FAILED',

  // Validation
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_EMAIL = 'VALIDATION_INVALID_EMAIL',
  VALIDATION_PASSWORD_TOO_SHORT = 'VALIDATION_PASSWORD_TOO_SHORT',
  VALIDATION_PASSWORD_TOO_WEAK = 'VALIDATION_PASSWORD_TOO_WEAK',

  // File Upload
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_DELETE_FAILED = 'FILE_DELETE_FAILED',
  FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
  FILE_INVALID_TYPE = 'FILE_INVALID_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_NO_FILE_PROVIDED = 'FILE_NO_FILE_PROVIDED',
  FILE_INVALID_FORMAT = 'FILE_INVALID_FORMAT',
  FILE_THUMBNAIL_NOT_AVAILABLE = 'FILE_THUMBNAIL_NOT_AVAILABLE',

  // General
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
}

// Маппинг error_code на человекочитаемые сообщения на русском
const errorMessages: Record<ErrorCode, string> = {
  // Authentication
  [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Неверный email или пароль',
  [ErrorCode.AUTH_ACCOUNT_DEACTIVATED]: 'Ваш аккаунт деактивирован. Обратитесь к администратору.',
  [ErrorCode.AUTH_2FA_REQUIRED]: 'Требуется двухфакторная аутентификация',
  [ErrorCode.AUTH_PASSKEY_ONLY]: 'Для этого аккаунта доступен только вход через Passkey',
  [ErrorCode.AUTH_SUPER_ADMIN_WEB_ONLY]: 'Супер-администратор может входить только через веб-панель',
  [ErrorCode.AUTH_PASSWORD_EXPIRED]: 'Срок действия пароля истёк. Необходимо изменить пароль.',

  // 2FA
  [ErrorCode.AUTH_2FA_NOT_ENABLED]: 'Двухфакторная аутентификация не включена',
  [ErrorCode.AUTH_2FA_INVALID_CODE]: 'Неверный код подтверждения',
  [ErrorCode.AUTH_2FA_CODE_EXPIRED]: 'Код подтверждения истёк. Запросите новый код.',
  [ErrorCode.AUTH_2FA_SEND_FAILED]: 'Не удалось отправить код подтверждения',

  // Passkey
  [ErrorCode.AUTH_PASSKEY_INVALID]: 'Неверный Passkey или он больше не действителен',
  [ErrorCode.AUTH_PASSKEY_REGISTRATION_FAILED]: 'Не удалось зарегистрировать Passkey',

  // Validation
  [ErrorCode.VALIDATION_REQUIRED_FIELD]: 'Это поле обязательно для заполнения',
  [ErrorCode.VALIDATION_INVALID_EMAIL]: 'Неверный формат email',
  [ErrorCode.VALIDATION_PASSWORD_TOO_SHORT]: 'Пароль слишком короткий',
  [ErrorCode.VALIDATION_PASSWORD_TOO_WEAK]: 'Пароль слишком слабый. Используйте буквы, цифры и специальные символы.',

  // File Upload
  [ErrorCode.FILE_NOT_FOUND]: 'Файл не найден',
  [ErrorCode.FILE_UPLOAD_FAILED]: 'Не удалось загрузить файл. Попробуйте еще раз.',
  [ErrorCode.FILE_DELETE_FAILED]: 'Не удалось удалить файл',
  [ErrorCode.FILE_ACCESS_DENIED]: 'Доступ к файлу запрещен',
  [ErrorCode.FILE_INVALID_TYPE]: 'Недопустимый тип файла',
  [ErrorCode.FILE_TOO_LARGE]: 'Файл слишком большой',
  [ErrorCode.FILE_NO_FILE_PROVIDED]: 'Файл не выбран',
  [ErrorCode.FILE_INVALID_FORMAT]: 'Неверный формат файла',
  [ErrorCode.FILE_THUMBNAIL_NOT_AVAILABLE]: 'Миниатюра недоступна',

  // General
  [ErrorCode.AUTH_UNAUTHORIZED]: 'Требуется авторизация',
  [ErrorCode.BAD_REQUEST]: 'Неверный запрос',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'Внутренняя ошибка сервера. Попробуйте позже.',
  [ErrorCode.USER_NOT_FOUND]: 'Пользователь не найден',
};

/**
 * Получить человекочитаемое сообщение для error_code
 */
export function getErrorMessage(errorCode: string): string {
  return errorMessages[errorCode as ErrorCode] || 'Произошла неизвестная ошибка';
}

/**
 * Форматировать ApiError в человекочитаемое сообщение
 */
export function formatApiError(error: ApiError): string {
  // Если есть error_code, используем его для получения сообщения
  if (error.error_code) {
    return getErrorMessage(error.error_code);
  }

  // Если есть структурированные детали
  if (error.details && typeof error.details === 'object' && 'error_code' in error.details) {
    const errorResponse = error.details as APIErrorResponse;
    return getErrorMessage(errorResponse.error_code);
  }

  // Fallback на message
  return error.message || 'Произошла ошибка';
}

/**
 * Извлечь error_code из ApiError
 */
export function extractErrorCode(error: ApiError): string | undefined {
  if (error.error_code) {
    return error.error_code;
  }

  if (error.details && typeof error.details === 'object' && 'error_code' in error.details) {
    const errorResponse = error.details as APIErrorResponse;
    return errorResponse.error_code;
  }

  return undefined;
}

/**
 * Извлечь request_id из ApiError
 */
export function extractRequestId(error: ApiError): string | undefined {
  if (error.request_id) {
    return error.request_id;
  }

  if (error.details && typeof error.details === 'object' && 'request_id' in error.details) {
    const errorResponse = error.details as APIErrorResponse;
    return errorResponse.request_id;
  }

  return undefined;
}

/**
 * Извлечь field errors из ApiError
 */
export function extractFieldErrors(error: ApiError): FieldError[] {
  if (error.fields) {
    return error.fields;
  }

  if (error.details && typeof error.details === 'object' && 'fields' in error.details) {
    const errorResponse = error.details as APIErrorResponse;
    return errorResponse.fields || [];
  }

  return [];
}

/**
 * Проверить, является ли ошибка специфическим error_code
 */
export function isErrorCode(error: ApiError, code: ErrorCode): boolean {
  const errorCode = extractErrorCode(error);
  return errorCode === code;
}

/**
 * Проверить, требуется ли переход на экран 2FA
 */
export function requires2FA(error: ApiError): boolean {
  return isErrorCode(error, ErrorCode.AUTH_2FA_REQUIRED);
}

/**
 * Проверить, доступен ли только Passkey
 */
export function requiresPasskeyOnly(error: ApiError): boolean {
  return isErrorCode(error, ErrorCode.AUTH_PASSKEY_ONLY);
}

/**
 * Проверить, заблокирован ли super admin
 */
export function isSuperAdminWebOnly(error: ApiError): boolean {
  return isErrorCode(error, ErrorCode.AUTH_SUPER_ADMIN_WEB_ONLY);
}

/**
 * Форматировать ошибку загрузки файла с учетом metadata
 */
export function formatFileUploadError(error: ApiError): string {
  const errorCode = extractErrorCode(error);
  let message = getErrorMessage(errorCode || '');

  // Если есть metadata, добавляем дополнительную информацию
  if (error.details && typeof error.details === 'object' && 'metadata' in error.details) {
    const errorResponse = error.details as APIErrorResponse;
    const metadata = errorResponse.metadata;

    if (metadata) {
      // Для ошибки FILE_TOO_LARGE показываем максимальный размер
      if (errorCode === ErrorCode.FILE_TOO_LARGE && metadata.max_size_mb) {
        message += ` Максимальный размер: ${metadata.max_size_mb} МБ`;
      }

      // Для ошибки FILE_INVALID_TYPE показываем разрешенные типы
      if (errorCode === ErrorCode.FILE_INVALID_TYPE && metadata.allowed_types) {
        const types = Array.isArray(metadata.allowed_types)
          ? metadata.allowed_types.join(', ')
          : metadata.allowed_types;
        message += ` Разрешенные типы: ${types}`;
      }
    }
  }

  // Если есть field errors, показываем первую ошибку
  const fieldErrors = extractFieldErrors(error);
  if (fieldErrors.length > 0) {
    const firstFieldError = fieldErrors[0];
    message = firstFieldError.message || message;
  }

  return message;
}
