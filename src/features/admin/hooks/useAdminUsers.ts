import { useState, useEffect } from 'react';
import * as userApi from '@api/user.api';
import { User, UserRole } from '@/types/user.types';
import { useNotification } from '@shared/contexts/NotificationContext';

export const useAdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const { showError, showSuccess } = useNotification();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await userApi.getUsers({}, { limit: 100, offset: 0 });
      setUsers(response.data || []);
    } catch (error: any) {
      showError('Не удалось загрузить список пользователей');
    } finally {
      setIsLoading(false);
    }
  };

  const changeUserRole = async (userId: number, newRole: UserRole) => {
    try {
      await userApi.updateUser(userId, { role: newRole });
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      showSuccess('Роль пользователя изменена');
    } catch (error: any) {
      showError('Не удалось изменить роль пользователя');
    }
  };

  const blockUser = async (userId: number) => {
    try {
      // await userApi.blockUser(userId); // TODO: Implement API method
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, is_active: false } : u))
      );
      showSuccess('Пользователь заблокирован');
    } catch (error: any) {
      showError('Не удалось заблокировать пользователя');
    }
  };

  const unblockUser = async (userId: number) => {
    try {
      // await userApi.unblockUser(userId); // TODO: Implement API method
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, is_active: true } : u))
      );
      showSuccess('Пользователь разблокирован');
    } catch (error: any) {
      showError('Не удалось разблокировать пользователя');
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === '' ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = selectedRole === 'all' || user.role === selectedRole;

    return matchesSearch && matchesRole;
  });

  return {
    users,
    filteredUsers,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedRole,
    setSelectedRole,
    loadUsers,
    changeUserRole,
    blockUser,
    unblockUser,
  };
};
