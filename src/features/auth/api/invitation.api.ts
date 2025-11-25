/**
 * Invitation API
 * API клиент для работы с приглашениями
 */

import api from '@api/axios.config';

export interface ValidateInvitationResponse {
  email: string;
  name: string;
  role: string;
  department_id?: number;
  department?: {
    id: number;
    name: string;
  };
  position?: string;
  expires_at: string;
  is_valid: boolean;
}

export interface AcceptInvitationRequest {
  password: string;
  confirm_password: string;
}

export interface AcceptInvitationResponse {
  message: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  auth_mode?: string;
  session?: any;
}

/**
 * Validate invitation token
 */
export const validateInvitation = async (token: string): Promise<ValidateInvitationResponse> => {
  const response = await api.get<any>(
    `/invitations/validate/${token}`
  );

  // Backend returns: { invitation: {...}, valid: true, request_id: "..." }
  const rawData = response.data;

  // Extract invitation data and add is_valid flag from root level
  const result = {
    ...rawData.invitation,
    is_valid: rawData.valid || rawData.invitation?.is_valid || false,
  };

  return result;
};

/**
 * Accept invitation and create account
 */
export const acceptInvitation = async (
  token: string,
  data: AcceptInvitationRequest
): Promise<AcceptInvitationResponse> => {
  const response = await api.post<any>(
    `/invitations/accept/${token}`,
    data
  );

  // Backend might return user data directly or wrapped
  return response.data?.data || response.data;
};
