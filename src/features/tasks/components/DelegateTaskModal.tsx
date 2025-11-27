/**
 * Delegate Task Modal Component
 * Модальное окно для делегирования задачи
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { delegateTask } from '../api/task.api';
import { getUsers } from '@/api/user.api';
import { User } from '@/types/user.types';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useTheme } from '@shared/hooks/useTheme';
import Avatar from '@shared/components/common/Avatar';

interface DelegateTaskModalProps {
  visible: boolean;
  taskId: number;
  onClose: () => void;
  onDelegated?: () => void;
}

export const DelegateTaskModal: React.FC<DelegateTaskModalProps> = ({
  visible,
  taskId,
  onClose,
  onDelegated,
}) => {
  const { theme, isDark } = useTheme();
  const { showError } = useNotification();
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<
    { title: string; data: User[]; key: string }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load users when modal opens
  useEffect(() => {
    if (visible && users.length === 0) {
      loadUsers();
    }
  }, [visible]);

  // Group users by department when users or search query changes
  useEffect(() => {
    groupUsersByDepartment();
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setError(null);

      if (!currentUser) {
        setError('Пользователь не авторизован');
        setIsLoadingUsers(false);
        return;
      }

      // Use server-side filtering for task assignment
      const filters: any = {
        is_active: true,
        for_task_assignment: true,
      };

      const response = await getUsers(filters, { limit: 100, offset: 0 });

      // Filter out the current user from the list
      let availableUsers = (response.data || []).filter(
        (user) => user.id !== currentUser.id
      );

      // Sort users: department heads first, then by name
      availableUsers.sort((a, b) => {
        const aIsDeptHead = a.role === 'department_head';
        const bIsDeptHead = b.role === 'department_head';

        if (aIsDeptHead && !bIsDeptHead) return -1;
        if (!aIsDeptHead && bIsDeptHead) return 1;

        return a.name.localeCompare(b.name);
      });

      console.log('👥 Loaded available users for delegation:', availableUsers);
      setUsers(availableUsers);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.message || 'Не удалось загрузить список пользователей');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const groupUsersByDepartment = () => {
    // Filter users by search query
    let filteredUsers = users;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredUsers = users.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.position?.toLowerCase().includes(query) ||
          user.department?.name.toLowerCase().includes(query)
      );
    }

    // Group users by department
    const departmentMap = new Map<string, User[]>();
    const noDepartmentUsers: User[] = [];

    filteredUsers.forEach((user) => {
      if (user.department) {
        const deptName = user.department.name;
        if (!departmentMap.has(deptName)) {
          departmentMap.set(deptName, []);
        }
        departmentMap.get(deptName)!.push(user);
      } else {
        noDepartmentUsers.push(user);
      }
    });

    // Sort users within each department: department heads first, then by name
    const sortUsersByRole = (a: User, b: User) => {
      const aIsDeptHead = a.role === 'department_head';
      const bIsDeptHead = b.role === 'department_head';

      if (aIsDeptHead && !bIsDeptHead) return -1;
      if (!aIsDeptHead && bIsDeptHead) return 1;

      return a.name.localeCompare(b.name);
    };

    departmentMap.forEach((users) => users.sort(sortUsersByRole));
    noDepartmentUsers.sort(sortUsersByRole);

    // Create sections array
    const newSections: { title: string; data: User[]; key: string }[] = [];

    // Get current user's department
    const currentUserDeptName = currentUser?.department?.name;

    // Add current user's department first
    if (currentUserDeptName && departmentMap.has(currentUserDeptName)) {
      const myDeptUsers = departmentMap.get(currentUserDeptName)!;
      newSections.push({
        title: currentUserDeptName,
        data: myDeptUsers,
        key: `dept-${currentUserDeptName}`,
      });
      departmentMap.delete(currentUserDeptName);
    }

    // Add other department sections (sorted alphabetically)
    const sortedDepartments = Array.from(departmentMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    sortedDepartments.forEach(([deptName, users]) => {
      newSections.push({
        title: deptName,
        data: users,
        key: `dept-${deptName}`,
      });
    });

    // Add users without department if any
    if (noDepartmentUsers.length > 0) {
      newSections.push({
        title: 'Без отдела',
        data: noDepartmentUsers,
        key: 'no-dept',
      });
    }

    setSections(newSections);
  };

  const handleDelegate = async () => {
    if (!selectedUserId) {
      showError('Выберите пользователя для делегирования');
      return;
    }

    try {
      setIsLoading(true);
      await delegateTask(taskId, { to_user_id: selectedUserId });
      setSearchQuery('');
      setSelectedUserId(null);
      onDelegated?.();
      onClose();
    } catch (error) {
      console.error('❌ Error delegating task:', error);
      showError('Не удалось делегировать задачу');
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = item.id === selectedUserId;

    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
          isSelected && {
            backgroundColor: isDark ? 'rgba(233, 68, 68, 0.2)' : '#FEF2F2',
          },
        ]}
        onPress={() => setSelectedUserId(item.id)}
        disabled={isLoading}
      >
        <View style={styles.userInfo}>
          <Avatar
            name={item.name}
            imageUrl={item.avatar}
            size={40}
            status={item.status}
            showStatus={true}
          />
          <View style={styles.userDetails}>
            <View style={styles.userNameContainer}>
              <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
              {item.role === 'department_head' && (
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color="#F59E0B"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            {item.position && (
              <Text style={[styles.userPosition, { color: theme.textSecondary }]}>{item.position}</Text>
            )}
            {item.department && (
              <Text style={[styles.userDepartment, { color: theme.textTertiary }]}>{item.department.name}</Text>
            )}
          </View>
        </View>
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={24} color="#E94444" />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color={theme.border} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        {/* Modal Header */}
        <View style={[styles.modalHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            disabled={isLoading}
          >
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Делегировать задачу</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons
            name="search"
            size={20}
            color={theme.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Поиск по имени, email или должности..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            editable={!isLoading}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.searchClearButton}
            >
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* User List */}
        {isLoadingUsers ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#E94444" />
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Загрузка пользователей...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadUsers}>
              <Text style={styles.retryButtonText}>Повторить</Text>
            </TouchableOpacity>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.centerContainer}>
            <Ionicons name="people-outline" size={48} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              {searchQuery
                ? 'Пользователи не найдены'
                : 'Нет доступных пользователей'}
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            renderItem={renderUserItem}
            renderSectionHeader={({ section }) => (
              <View
                style={[
                  styles.sectionHeader,
                  { backgroundColor: theme.background },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                  {section.title}
                </Text>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            stickySectionHeadersEnabled={true}
          />
        )}

        {/* Footer with Delegate Button */}
        <View style={[styles.modalFooter, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.delegateButton,
              (isLoading || !selectedUserId) && styles.delegateButtonDisabled,
            ]}
            onPress={handleDelegate}
            disabled={isLoading || !selectedUserId}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.delegateButtonText}>Делегировать</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
    width: 32,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  searchClearButton: {
    padding: 4,
  },
  listContainer: {
    paddingBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  userDetails: {
    flex: 1,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  userPosition: {
    fontSize: 13,
  },
  userDepartment: {
    fontSize: 12,
  },
  checkboxContainer: {
    marginLeft: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#E94444',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  delegateButton: {
    paddingVertical: 14,
    backgroundColor: '#E94444',
    borderRadius: 8,
    alignItems: 'center',
  },
  delegateButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  delegateButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
