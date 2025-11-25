import { useState, useCallback } from 'react';
import { validatePassword, validatePasswordConfirmation, parseInvitationError } from '../utils/invitationHelpers';
import * as invitationApi from '../api/invitation.api';

interface UseInvitationAcceptanceReturn {
  isLoading: boolean;
  acceptInvitation: (code: string, password: string, confirmPassword: string) => Promise<void>;
}

/**
 * Hook for accepting invitations and creating account
 */
export const useInvitationAcceptance = (): UseInvitationAcceptanceReturn => {
  const [isLoading, setIsLoading] = useState(false);

  const acceptInvitation = useCallback(
    async (code: string, password: string, confirmPassword: string): Promise<void> => {
      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.error);
      }

      // Validate password confirmation
      const confirmValidation = validatePasswordConfirmation(password, confirmPassword);
      if (!confirmValidation.isValid) {
        throw new Error(confirmValidation.error);
      }

      setIsLoading(true);

      try {
        await invitationApi.acceptInvitation(code.trim(), {
          password,
          confirm_password: confirmPassword,
        });
      } catch (error: any) {
        console.error('Accept invitation error:', error);
        const errorMessage = parseInvitationError(error);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    acceptInvitation,
  };
};
