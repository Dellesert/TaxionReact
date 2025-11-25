/**
 * Custom Hook: useUserSections
 * Группировка пользователей по подразделениям
 */

import { useMemo } from 'react';
import { User } from '@/types/user.types';
import { useAuthStore } from '@shared/store/authStore';
import { sortUsers } from '@shared/utils/createChatHelpers';
import { formatDepartmentName } from '@shared/utils/createChatFormatters';

export interface UserSection {
  title: string;
  data: User[];
  departmentId: number | null;
}

interface UseUserSectionsReturn {
  sections: UserSection[];
}

export const useUserSections = (filteredUsers: User[]): UseUserSectionsReturn => {
  const currentUser = useAuthStore((state) => state.user);

  const sections = useMemo(() => {
    const currentUserDepartmentId = currentUser?.department_id;

    // Group users by department
    const byDepartment = new Map<number | null, User[]>();

    filteredUsers.forEach((user) => {
      const deptId = user.department_id || null;
      if (!byDepartment.has(deptId)) {
        byDepartment.set(deptId, []);
      }
      byDepartment.get(deptId)!.push(user);
    });

    // Sort users within each department
    byDepartment.forEach((users, key) => {
      byDepartment.set(key, sortUsers(users));
    });

    const result: UserSection[] = [];

    // First, add current user's department
    if (currentUserDepartmentId && byDepartment.has(currentUserDepartmentId)) {
      const users = byDepartment.get(currentUserDepartmentId)!;
      const departmentName = users[0]?.department?.name || 'Мое подразделение';
      result.push({
        title: departmentName,
        data: users,
        departmentId: currentUserDepartmentId,
      });
      byDepartment.delete(currentUserDepartmentId);
    }

    // Then add other departments (with names)
    const departmentsWithNames: Array<{ id: number; name: string; users: User[] }> = [];
    byDepartment.forEach((users, deptId) => {
      if (deptId !== null) {
        const departmentName = formatDepartmentName(users[0]?.department?.name, deptId);
        departmentsWithNames.push({ id: deptId, name: departmentName, users });
      }
    });

    // Sort by name
    departmentsWithNames.sort((a, b) => a.name.localeCompare(b.name));
    departmentsWithNames.forEach((dept) => {
      result.push({
        title: dept.name,
        data: dept.users,
        departmentId: dept.id,
      });
    });

    // Finally, add users without department
    if (byDepartment.has(null)) {
      const users = byDepartment.get(null)!;
      result.push({
        title: 'Без подразделения',
        data: users,
        departmentId: null,
      });
    }

    return result;
  }, [filteredUsers, currentUser?.department_id]);

  return { sections };
};
