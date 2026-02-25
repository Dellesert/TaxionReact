import { useMemo } from 'react';
import { useAuthStore } from '@shared/store/authStore';

/**
 * Hook для проверки прав доступа к нерабочим дням (отсутствиям)
 *
 * Правила:
 * - Создание/редактирование/удаление: super_admin, admin, department_head
 * - Обычный сотрудник (employee) может только просматривать
 */
export const useAbsencePermissions = () => {
  const { user } = useAuthStore();

  return useMemo(() => {
    const role = user?.role;

    const canManage = role === 'super_admin' || role === 'admin' || role === 'department_head';

    return {
      canCreate: canManage,
      canEdit: canManage,
      canDelete: canManage,
      canManageSubstitutions: canManage,
    };
  }, [user]);
};
