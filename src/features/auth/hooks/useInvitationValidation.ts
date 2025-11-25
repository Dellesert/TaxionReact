import { useState, useCallback } from 'react';
import { InvitationData, validateInvitationCode } from '../utils/invitationHelpers';
import * as invitationApi from '../api/invitation.api';

interface UseInvitationValidationReturn {
  invitationData: InvitationData | null;
  isLoading: boolean;
  validateCode: (code: string) => Promise<boolean>;
  resetValidation: () => void;
}

/**
 * Hook for validating invitation codes
 */
export const useInvitationValidation = (): UseInvitationValidationReturn => {
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const validateCode = useCallback(async (code: string): Promise<boolean> => {
    // Client-side validation
    const validation = validateInvitationCode(code);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    setIsLoading(true);

    try {
      const data = await invitationApi.validateInvitation(code.trim());

      if (!data || !data.is_valid) {
        throw new Error('Приглашение недействительно или истекло');
      }

      setInvitationData(data);
      return true;
    } catch (error: any) {
      console.error('Validation error:', error);
      throw new Error(
        error?.message || error?.response?.data?.error || 'Не удалось проверить код приглашения'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetValidation = useCallback(() => {
    setInvitationData(null);
  }, []);

  return {
    invitationData,
    isLoading,
    validateCode,
    resetValidation,
  };
};
