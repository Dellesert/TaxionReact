/**
 * UserSelector
 * Компонент-кнопка для выбора пользователей
 * Открывает UserSelectorModal при нажатии
 */

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { User } from '@/types/user.types';
import { getUsers } from '@api/user.api';
import UserSelectorModal from './UserSelectorModal';

interface UserSelectorProps {
  selectedUserIds: number[];
  onSelectionChange: (userIds: number[]) => void;
  multiSelect?: boolean;
  placeholder?: string;
  excludeUserIds?: number[];
  mode?: 'checkbox' | 'radio';
  modalTitle?: string;
  filterForTaskAssignment?: boolean; // Фильтр для назначения задач (только свой отдел + руководители других)
}

const UserSelector: React.FC<UserSelectorProps> = ({
  selectedUserIds,
  onSelectionChange,
  multiSelect = true,
  placeholder = 'Выберите участников',
  excludeUserIds = [],
  mode = 'checkbox',
  modalTitle,
  filterForTaskAssignment = false,
}) => {
  const { theme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Load users when needed
  React.useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Use server-side filtering and sorting
      let filters: any = {
        is_active: true,
        exclude_me: true, // Exclude current user on backend
        exclude_roles: 'admin,super_admin', // Exclude admins for all users

        // Sorting
        dept_head_first: true, // Department heads first
        sort_by: 'name', // Sort by name
        sort_order: 'asc', // Ascending order
        prioritize_my_dept: true, // My department first
      };

      // For task assignment, use backend filter
      if (filterForTaskAssignment) {
        filters.for_task_assignment = true;
      }

      const response = await getUsers(filters, { limit: 100, offset: 0 });

      console.log('👥 Loaded users for selector button:', response.data);
      console.log('🔍 filterForTaskAssignment:', filterForTaskAssignment);

      let usersList: User[] = [];
      if (response && response.data && Array.isArray(response.data)) {
        usersList = response.data;
      } else if (response && Array.isArray(response)) {
        usersList = response;
      }

      // Backend now handles all filtering and sorting
      setUsers(usersList);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const selectedUsers = useMemo(() => {
    return users.filter((user) => selectedUserIds.includes(user.id));
  }, [users, selectedUserIds]);

  const removeUser = (userId: number) => {
    onSelectionChange(selectedUserIds.filter((id) => id !== userId));
  };

  const renderSelectedUsers = () => {
    if (selectedUsers.length === 0) {
      return (
        <Text style={[styles.placeholderText, { color: theme.inputPlaceholder }]}>
          {placeholder}
        </Text>
      );
    }

    const MAX_DISPLAY = 5;
    const displayUsers = selectedUsers.slice(0, MAX_DISPLAY);
    const remainingCount = selectedUsers.length - MAX_DISPLAY;

    return (
      <View style={styles.selectedUsersContainer}>
        {displayUsers.map((user) => (
          <View key={user.id} style={[styles.selectedUserChip, { backgroundColor: theme.primary }]}>
            <Text style={styles.selectedUserText} numberOfLines={1}>
              {user.name}
            </Text>
            <TouchableOpacity
              onPress={() => removeUser(user.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        ))}
        {remainingCount > 0 && (
          <View style={[styles.selectedUserChip, { backgroundColor: theme.primary }]}>
            <Text style={styles.selectedUserText}>
              +{remainingCount}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      width: '100%',
    },
    pickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      backgroundColor: theme.backgroundSecondary,
      minHeight: 48,
    },
    pickerButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 8,
    },
    placeholderText: {
      fontSize: 15,
    },
    selectedUsersContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    selectedUserChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      paddingVertical: 4,
      paddingLeft: 10,
      paddingRight: 6,
      gap: 4,
    },
    selectedUserText: {
      fontSize: 13,
      color: '#FFFFFF',
      fontWeight: '500',
      maxWidth: 120,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setIsModalVisible(true)}>
        <View style={styles.pickerButtonContent}>
          <Ionicons name="people-outline" size={20} color={theme.textSecondary} />
          <View style={{ flex: 1 }}>{renderSelectedUsers()}</View>
        </View>
        <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      <UserSelectorModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        selectedUserIds={selectedUserIds}
        onSelectionChange={onSelectionChange}
        multiSelect={multiSelect}
        title={modalTitle || placeholder}
        excludeUserIds={excludeUserIds}
        mode={mode}
        filterForTaskAssignment={filterForTaskAssignment}
      />
    </View>
  );
};

export default UserSelector;
