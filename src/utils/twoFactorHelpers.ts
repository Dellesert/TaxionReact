/**
 * Two-Factor Authentication Helpers
 * Pure functions for 2FA code validation and processing
 */

/**
 * Validate that the code is complete (6 digits)
 */
export const isCodeComplete = (code: string[]): boolean => {
  return code.length === 6 && code.every((digit) => digit !== '');
};

/**
 * Extract only numeric characters from input
 */
export const extractNumericInput = (text: string): string => {
  return text.replace(/[^0-9]/g, '');
};

/**
 * Join code array into a single string
 */
export const joinCode = (code: string[]): string => {
  return code.join('');
};

/**
 * Split a full code string into array of digits
 */
export const splitCode = (fullCode: string): string[] => {
  return fullCode.split('').slice(0, 6);
};

/**
 * Validate full 2FA code
 */
export const validate2FACode = (code: string[]): { isValid: boolean; error?: string } => {
  const fullCode = joinCode(code);

  if (fullCode.length === 0) {
    return { isValid: false, error: 'Введите код подтверждения' };
  }

  if (fullCode.length !== 6) {
    return { isValid: false, error: 'Введите полный код из 6 цифр' };
  }

  if (!/^\d{6}$/.test(fullCode)) {
    return { isValid: false, error: 'Код должен содержать только цифры' };
  }

  return { isValid: true };
};

/**
 * Create an empty 6-digit code array
 */
export const createEmptyCode = (): string[] => {
  return ['', '', '', '', '', ''];
};

/**
 * Check if user is super admin (restricted from mobile access)
 */
export const isSuperAdmin = (role: string): boolean => {
  return role === 'super_admin';
};
