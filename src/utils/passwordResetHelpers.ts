/**
 * Helper functions for password reset validation
 */

/**
 * Validate email address format
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Введите email' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Введите корректный email' };
  }

  return { isValid: true };
};

/**
 * Validate reset code
 */
export const validateResetCode = (code: string): { isValid: boolean; error?: string } => {
  if (!code.trim()) {
    return { isValid: false, error: 'Введите код восстановления' };
  }

  return { isValid: true };
};

/**
 * Validate new password for reset
 */
export const validateNewPassword = (
  password: string,
  confirmPassword: string
): { isValid: boolean; error?: string } => {
  if (!password || !confirmPassword) {
    return { isValid: false, error: 'Заполните все поля' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Пароли не совпадают' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Пароль должен содержать минимум 8 символов' };
  }

  return { isValid: true };
};

/**
 * Format expiry time in Russian locale
 */
export const formatExpiryTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
