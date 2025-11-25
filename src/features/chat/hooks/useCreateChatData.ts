/**
 * Custom Hook: useCreateChatData
 * Управление данными для создания чата (загрузка пользователей)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from '@/types/user.types';
import { getUsers } from '@api/user.api';
import { isMockMode, mockGetUsers } from '@shared/utils/mockData';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useAuthStore } from '@shared/store/authStore';
import {
  filterOutCurrentUser,
  filterOutAdmins,
  filterUsersBySearch,
} from '../utils/createChatHelpers';
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
  const currentUser = useAuthStore((state) => state.user);

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);

      let usersList: User[] = [];

      if (isMockMode()) {
        console.log('🔧 Using mock users data');
        usersList = await mockGetUsers();
        console.log(`👥 Loaded ${usersList.length} mock users`);
      } else {
        console.log('📋 Loading users from API...');
        console.log('🌐 API_BASE_URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
        console.log('🔧 Mock mode:', process.env.EXPO_PUBLIC_USE_MOCK_DATA);

        // Request all users (increase limit if needed), only active users
        const response = await getUsers({ is_active: true }, { limit: 1000, offset: 0 });
        console.log('✅ Users API response:', response);

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

      setUsers(usersList);
    } catch (error: unknown) {
      console.error('❌ Failed to load users:', error);

      const err = error as { code?: string; status?: number; message?: string };
      const errorMessage = getLoadUsersErrorMessage(err);
      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filter users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filter out current user
    filtered = filterOutCurrentUser(filtered, currentUser?.id);

    // Hide admins and super_admins
    filtered = filterOutAdmins(filtered);

    // Apply search query
    filtered = filterUsersBySearch(filtered, searchQuery);

    return filtered;
  }, [users, currentUser?.id, searchQuery]);

  return {
    users,
    filteredUsers,
    isLoading,
    searchQuery,
    setSearchQuery,
    loadUsers,
  };
};
