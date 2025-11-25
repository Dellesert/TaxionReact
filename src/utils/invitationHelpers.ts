/**
 * Helper functions for invitation validation and formatting
 */

export interface InvitationData {
  is_valid: boolean;
  name: string;
  email: string;
  role: string;
  department?: {
    name: string;
  };
}

/**
 * Get localized role label
 */
export const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'super_admin':
      return 'Супер Админ';
    case 'admin':
      return 'Админ';
    case 'department_head':
      return 'Руководитель отдела';
    case 'employee':
      return 'Сотрудник';
    default:
      return role;
  }
};

/**
 * Validate password requirements
 */
export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Введите пароль' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Пароль должен содержать минимум 8 символов' };
  }

  return { isValid: true };
};

/**
 * Validate password confirmation
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
): { isValid: boolean; error?: string } => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Подтвердите пароль' };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: 'Пароли не совпадают' };
  }

  return { isValid: true };
};

/**
 * Validate invitation code
 */
export const validateInvitationCode = (code: string): { isValid: boolean; error?: string } => {
  if (!code.trim()) {
    return { isValid: false, error: 'Введите код приглашения' };
  }

  return { isValid: true };
};

/**
 * Parse error message from API response
 */
export const parseInvitationError = (error: any): string => {
  let errorMessage = 'Не удалось активировать приглашение';

  if (error?.details?.error) {
    const serverError = error.details.error.toLowerCase();

    if (serverError.includes('already') || serverError.includes('accepted')) {
      return 'Это приглашение уже было активировано. Используйте свой email и пароль для входа.';
    } else if (serverError.includes('expired')) {
      return 'Срок действия приглашения истёк. Обратитесь к администратору.';
    } else {
      return error.details.error;
    }
  } else if (error?.message) {
    return error.message;
  }

  return errorMessage;
};

/**
 * Get step subtitle text
 */
export const getStepSubtitle = (step: 'enter_code' | 'create_password' | 'success'): string => {
  switch (step) {
    case 'enter_code':
      return 'Введите код из письма';
    case 'create_password':
      return 'Создайте пароль для входа';
    case 'success':
      return 'Аккаунт успешно активирован!';
    default:
      return '';
  }
};
