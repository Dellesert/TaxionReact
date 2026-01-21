import { useCallback, useEffect } from 'react';
import { useAbsenceStore } from '../store/absenceStore';

interface UseUserAbsencesParams {
  userId: number;
  startDate?: string;
  endDate?: string;
}

export const useUserAbsences = ({ userId, startDate, endDate }: UseUserAbsencesParams) => {
  const {
    userAbsences,
    isLoadingUser,
    error,
    loadUserAbsences,
    clearError,
  } = useAbsenceStore();

  const refresh = useCallback(() => {
    loadUserAbsences(userId, startDate, endDate);
  }, [loadUserAbsences, userId, startDate, endDate]);

  useEffect(() => {
    if (userId) {
      loadUserAbsences(userId, startDate, endDate);
    }
  }, [userId, startDate, endDate]);

  return {
    absences: userAbsences,
    isLoading: isLoadingUser,
    error,
    refresh,
    clearError,
  };
};
