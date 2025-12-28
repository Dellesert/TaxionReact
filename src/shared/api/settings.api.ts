/**
 * Settings API
 * API клиент для получения публичных настроек системы
 */

import api from './axios.config';
import { API_ENDPOINTS } from '@shared/constants/api.constants';

/**
 * Password policy response from backend
 */
export interface PasswordPolicy {
  min_length: number;
  require_complexity: boolean;
  complexity_rules?: string[];
}

interface PasswordPolicyResponse {
  policy: PasswordPolicy;
  request_id: string;
}

/**
 * Default password policy (fallback)
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  min_length: 8,
  require_complexity: true,
  complexity_rules: [
    'Минимум одна буква (a-z, A-Z)',
    'Минимум одна цифра или спецсимвол (!@#$%^&*)',
  ],
};

/**
 * Get password policy from server
 * This is a public endpoint that doesn't require authentication
 */
export const getPasswordPolicy = async (): Promise<PasswordPolicy> => {
  try {
    const response = await api.get<PasswordPolicyResponse>(API_ENDPOINTS.SETTINGS.PASSWORD_POLICY);
    return response.data.policy;
  } catch (error) {
    // Return default policy on error
    console.warn('Failed to fetch password policy, using defaults:', error);
    return DEFAULT_PASSWORD_POLICY;
  }
};
