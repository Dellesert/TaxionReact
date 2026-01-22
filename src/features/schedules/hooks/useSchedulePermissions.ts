import { useMemo } from 'react';
import { useAuthStore } from '@shared/store/authStore';
import type { Schedule } from '../types/schedule.types';

/**
 * Hook для проверки прав доступа к графикам
 *
 * Правила:
 * - Создание графиков: super_admin, admin, department_head
 * - Редактирование/удаление: super_admin, admin, department_head (своего отдела), создатель
 */
export const useSchedulePermissions = (schedule?: Schedule | null) => {
  const { user } = useAuthStore();

  const permissions = useMemo(() => {
    const role = user?.role;
    const userId = user?.id;

    // Может ли пользователь создавать графики
    const canCreate = role === 'super_admin' || role === 'admin' || role === 'department_head';

    // Может ли пользователь редактировать/удалять конкретный график
    let canEdit = false;
    let canDelete = false;

    if (schedule) {
      // Super admin и admin могут всё
      if (role === 'super_admin' || role === 'admin') {
        canEdit = true;
        canDelete = true;
      }
      // Создатель может редактировать и удалять свой график
      else if (schedule.created_by === userId) {
        canEdit = true;
        canDelete = true;
      }
      // Руководитель отдела может редактировать графики своего отдела
      else if (role === 'department_head' && schedule.department_id) {
        // TODO: проверить, является ли пользователь руководителем этого отдела
        // Пока разрешаем руководителям редактировать все графики с department_id
        canEdit = true;
        canDelete = true;
      }
    }

    // Может ли добавлять/редактировать/удалять записи в графике
    const canManageEntries = canEdit;

    return {
      canCreate,
      canEdit,
      canDelete,
      canManageEntries,
      isAdmin: role === 'super_admin' || role === 'admin',
      isDepartmentHead: role === 'department_head',
      isEmployee: role === 'employee',
    };
  }, [user, schedule]);

  return permissions;
};
