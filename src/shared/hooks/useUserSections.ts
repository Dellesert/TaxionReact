/**
 * Custom Hook: useUserSections
 * Группировка пользователей по подразделениям
 *
 * Backend handles all sorting (prioritize_my_dept, dept_head_first, sort_by name)
 * This hook only groups users by department while preserving backend order
 */

import { useMemo } from 'react';
import { User } from '@/types/user.types';

export interface UserSection {
  title: string;
  data: User[];
  departmentId: number | null;
}

interface UseUserSectionsReturn {
  sections: UserSection[];
}

export const useUserSections = (filteredUsers: User[]): UseUserSectionsReturn => {
  const sections = useMemo(() => {
    // Group users by department while preserving backend order
    const departmentMap = new Map<string, User[]>();
    const noDepartmentUsers: User[] = [];
    const seenDepartments: string[] = []; // Track order of departments as they appear

    // Backend already handles search and sorting, so use filteredUsers directly
    filteredUsers.forEach((user) => {
      if (user.department) {
        const deptName = user.department.name;
        if (!departmentMap.has(deptName)) {
          departmentMap.set(deptName, []);
          seenDepartments.push(deptName); // Preserve order from backend
        }
        departmentMap.get(deptName)!.push(user);
      } else {
        noDepartmentUsers.push(user);
      }
    });

    // Create sections array (preserving backend order)
    const result: UserSection[] = [];

    // Add departments in the order they appeared (backend already sorted them)
    seenDepartments.forEach((deptName) => {
      const users = departmentMap.get(deptName)!;
      result.push({
        title: deptName,
        data: users, // Users already sorted by backend (prioritize_my_dept + dept_head_first + name)
        departmentId: users[0]?.department_id || null,
      });
    });

    // Add users without department if any
    if (noDepartmentUsers.length > 0) {
      result.push({
        title: 'Без подразделения',
        data: noDepartmentUsers,
        departmentId: null,
      });
    }

    return result;
  }, [filteredUsers]);

  return { sections };
};
