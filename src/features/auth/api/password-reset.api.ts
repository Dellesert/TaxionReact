import axios from '@api/axios.config';

export interface RequestPasswordResetRequest {
  email: string;
}

export interface RequestPasswordResetResponse {
  message: string;
}

export interface ValidateResetTokenResponse {
  valid: boolean;
  email: string;
  expires_at: string;
}

export interface ResetPasswordRequest {
  password: string;
  confirm_password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

/**
 * Request password reset (self-service)
 */
export const requestPasswordReset = async (
  data: RequestPasswordResetRequest
): Promise<RequestPasswordResetResponse> => {
  const response = await axios.post('/password-resets/request', data);
  return response.data;
};

/**
 * Validate password reset token
 */
export const validateResetToken = async (token: string): Promise<ValidateResetTokenResponse> => {
  const response = await axios.get(`/password-resets/validate/${token}`);
  return response.data.reset_info;
};

/**
 * Reset password using token
 */
export const resetPassword = async (
  token: string,
  data: ResetPasswordRequest
): Promise<ResetPasswordResponse> => {
  const response = await axios.post(`/password-resets/reset/${token}`, data);
  return response.data;
};
