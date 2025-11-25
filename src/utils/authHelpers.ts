/**
 * Helper functions for authentication
 */

import { extractErrorCode, ErrorCode, isSuperAdminWebOnly } from './errorUtils';
import type { ApiError } from '../types/common.types';

/**
 * Check if error indicates 2FA is not enabled
 */
export const is2FANotEnabledError = (error: any): boolean => {
  const errorCode = extractErrorCode(error);
  if (errorCode === ErrorCode.AUTH_2FA_NOT_ENABLED) {
    return true;
  }

  // Fallback check
  const errorMessage =
    (error?.message?.toLowerCase() || '') + ' ' + (error?.details?.error?.toLowerCase() || '');
  return (
    error?.status === 400 ||
    errorMessage.includes('two factor') ||
    errorMessage.includes('2fa') ||
    errorMessage.includes('not enabled')
  );
};

/**
 * Check if error indicates 2FA is required
 */
export const is2FARequiredError = (error: any): boolean => {
  const errorCode = extractErrorCode(error);
  if (errorCode === ErrorCode.AUTH_2FA_REQUIRED) {
    return true;
  }

  // Fallback check
  const errorMessage =
    (error?.message?.toLowerCase() || '') + ' ' + (error?.details?.error?.toLowerCase() || '');
  return error?.status === 403 && errorMessage.includes('2fa is required');
};

/**
 * Check if error indicates super admin web-only restriction
 */
export const isSuperAdminWebOnlyError = (error: any): boolean => {
  const errorCode = extractErrorCode(error);
  if (errorCode === ErrorCode.AUTH_SUPER_ADMIN_WEB_ONLY) {
    return true;
  }

  // Check if it's an ApiError
  if (error && typeof error === 'object' && 'error_code' in error) {
    return isSuperAdminWebOnly(error as ApiError);
  }

  // Fallback check
  const errorMessage =
    (error?.message?.toLowerCase() || '') + ' ' + (error?.details?.error?.toLowerCase() || '');
  return error?.status === 403 && (errorMessage.includes('super admin') || errorMessage.includes('restricted to web'));
};

/**
 * Check if error indicates passkey-only account
 */
export const isPasskeyOnlyError = (error: any): boolean => {
  const errorCode = extractErrorCode(error);
  return errorCode === ErrorCode.AUTH_PASSKEY_ONLY;
};

/**
 * Check if account is deactivated
 */
export const isAccountDeactivatedError = (error: any): boolean => {
  const errorCode = extractErrorCode(error);
  return errorCode === ErrorCode.AUTH_ACCOUNT_DEACTIVATED;
};

/**
 * Check if credentials are invalid
 */
export const isInvalidCredentialsError = (error: any): boolean => {
  const errorCode = extractErrorCode(error);
  return errorCode === ErrorCode.AUTH_INVALID_CREDENTIALS;
};

/**
 * Validate login form fields
 */
export const validateLoginFields = (
  email: string,
  password: string
): { isValid: boolean; error?: string } => {
  if (!email || !password) {
    return { isValid: false, error: 'Заполните все поля' };
  }
  return { isValid: true };
};
