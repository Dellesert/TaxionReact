/**
 * Custom Hook: useCreateChatData
 * Управление данными для создания чата (загрузка пользователей)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  loadUsers: (searchTerm?: string, isInitialLoad?: boolean) => Promise<void>;
}

export const useCreateChatData = (): UseCreateChatDataReturn => {
  const { showError } = useNotification();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search query for backend search (300ms delay)
  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadUsers = useCallback(async (searchTerm?: string, isInitialLoad = false) => {
    try {
      // Only show loading spinner on initial load, not during search
      if (isInitialLoad) {
        setIsLoading(true);
      }

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
          search: searchTerm || undefined,

          // Sorting
          prioritize_my_dept: true, // My department first
          dept_head_first: true, // Department heads first within each department
          sort_by: 'name', // Sort by name
          sort_order: 'asc', // Ascending order
        };

        const response = await getUsers(filters, { limit: 1000, offset: 0 });
        console.log('✅ Users API response:', response);
        console.log('🔍 Search query:', searchTerm);
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
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [showError]);

  // Load users on mount
  useEffect(() => {
    loadUsers(undefined, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load users when debounced search changes (but not on initial render)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadUsers(debouncedSearch, false);
  }, [debouncedSearch, loadUsers]);

  // Backend handles search, but we also do client-side filtering as fallback
  // This ensures case-insensitive search works even if backend is case-sensitive
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users;
    }

    const query = searchQuery.toLowerCase().trim();
    return users.filter((user) => {
      const name = user.name?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      const position = user.position?.toLowerCase() || '';
      const department = user.department?.name?.toLowerCase() || '';

      return (
        name.includes(query) ||
        email.includes(query) ||
        position.includes(query) ||
        department.includes(query)
      );
    });
  }, [users, searchQuery]);

  return {
    users,
    filteredUsers,
    isLoading,
    searchQuery,
    setSearchQuery,
    loadUsers,
  };
};
