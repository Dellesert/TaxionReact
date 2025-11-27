/**
 * Custom Hook: useCreateChatData
 * Управление данными для создания чата (загрузка пользователей)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@/types/user.types';
import { getUsers } from '@api/user.api';
import { isMockMode, mockGetUsers } from '@shared/utils/mockData';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useDebounce } from '@shared/hooks/useDebounce';
import { getLoadUsersErrorMessage } from '../utils/createChatFormatters';

interface UseCreateChatDataReturn {
  users: User[];
  filteredUsers: User[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loadUsers: () => Promise<void>;
}

export const useCreateChatData = (): UseCreateChatDataReturn => {
  const { showError } = useNotification();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search query for backend search (300ms delay)
  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);

      let usersList: User[] = [];

      if (isMockMode()) {
        console.log('🔧 Using mock users data');
        usersList = await mockGetUsers();
        console.log(`👥 Loaded ${usersList.length} mock users`);
      } else {
        console.log('📋 Loading users from API with backend filters and search...');

        // Use server-side filtering, sorting, and search for chats
        const filters: any = {
          is_active: true,
          exclude_me: true, // Exclude current user on backend
          exclude_roles: 'admin,super_admin', // Exclude admins for all users

          // Backend search (debounced)
          search: debouncedSearch || undefined,

          // Sorting
          prioritize_my_dept: true, // My department first
          dept_head_first: true, // Department heads first within each department
          sort_by: 'name', // Sort by name
          sort_order: 'asc', // Ascending order
        };

        const response = await getUsers(filters, { limit: 1000, offset: 0 });
        console.log('✅ Users API response:', response);
        console.log('🔍 Search query:', debouncedSearch);
        console.log('📊 First 5 users:', response.data?.slice(0, 5).map((u: User) => ({
          name: u.name,
          dept: u.department?.name,
          role: u.role
        })));

        // PaginatedResponse has data field with array of users
        if (response && response.data && Array.isArray(response.data)) {
          usersList = response.data;
          console.log('📦 Got users from response.data (array)');
        } else if (response && Array.isArray(response)) {
          usersList = response;
          console.log('📦 Got users from response (array)');
        } else if (response && 'users' in response && Array.isArray(response.users)) {
          usersList = response.users as User[];
          console.log('📦 Got users from response.users (array)');
        } else {
          usersList = [];
          console.warn('⚠️ Unexpected response structure:', response);
        }

        console.log(`👥 Found ${usersList.length} users from API`);

        if (usersList.length > 0) {
          console.log('First user sample:', usersList[0]);
        } else {
          console.warn('⚠️ No users found in response');
        }
      }

      console.log('📊 Users with departments:', usersList.filter((u) => u.department).length);
      console.log('📊 Users with department_id:', usersList.filter((u) => u.department_id).length);

      // Backend now handles all filtering, sorting, and search
      setUsers(usersList);
    } catch (error: unknown) {
      console.error('❌ Failed to load users:', error);

      const err = error as { code?: string; status?: number; message?: string };
      const errorMessage = getLoadUsersErrorMessage(err);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, showError]);

  // Load users on mount and when debounced search changes
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Backend handles search, so filteredUsers is same as users
  const filteredUsers = useMemo(() => {
    return users;
  }, [users]);

  return {
    users,
    filteredUsers,
    isLoading,
    searchQuery,
    setSearchQuery,
    loadUsers,
  };
};
