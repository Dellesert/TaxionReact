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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { delegateTask } from '../api/task.api';
import { getUsers } from '@/api/user.api';
import { User } from '@/types/user.types';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { useNotification } from '@contexts/NotificationContext';
import Avatar from '@components/common/Avatar';

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

  useEffect(() => {
    if (visible) {
      loadUsers();
    }
  }, [visible]);

  useEffect(() => {
    groupUsersByDepartment();
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);

      if (!currentUser) {
        showError('Пользователь не авторизован');
        setIsLoadingUsers(false);
        return;
      }

      // Use server-side filtering for task assignment
      // This automatically handles role-based filtering
      const filters: any = {
        is_active: true,
        for_task_assignment: true,
      };

      const response = await getUsers(filters, { limit: 100, offset: 0 });

      // Filter out the current user from the list
      let availableUsers = (response.data || []).filter(
        (user) => user.id !== currentUser.id
      );

      console.log('👥 Loaded available users for delegation:', availableUsers);
      setUsers(availableUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      showError('Не удалось загрузить список пользователей');
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

    // Filter out admins/super admins and group by department
    filteredUsers.forEach((user) => {
      // Skip admins and super admins
      if (user.role === 'admin' || user.role === 'super_admin') {
        return;
      }

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

  const handleReset = () => {
    setSearchQuery('');
    setSelectedUserId(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDelegate = async () => {
    if (!selectedUserId) {
      showError('Выберите пользователя для делегирования');
      return;
    }

    try {
      setIsLoading(true);
      await delegateTask(taskId, { to_user_id: selectedUserId });
      handleReset();
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
          { backgroundColor: theme.card },
          isSelected && {
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff',
          },
        ]}
        onPress={() => setSelectedUserId(item.id)}
        disabled={isLoading}
      >
        <Avatar
          name={item.name}
          imageUrl={item.avatar}
          size={44}
          status={item.status}
          showStatus={true}
        />

        <View style={styles.userInfo}>
          <View style={styles.userNameContainer}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {item.name}
            </Text>
            {item.role === 'department_head' && (
              <Ionicons
                name="shield-checkmark"
                size={16}
                color="#F59E0B"
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
          <Text
            style={[styles.userPosition, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {item.position || item.email}
          </Text>
          {item.department && (
            <Text
              style={[styles.userDepartment, { color: theme.textTertiary }]}
              numberOfLines={1}
            >
              {item.department.name}
            </Text>
          )}
        </View>

        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {searchQuery ? 'Пользователи не найдены' : 'Список пользователей пуст'}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: theme.card,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Делегировать задачу
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={isLoading}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.card,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <Ionicons name="search" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Поиск по имени, должности или email..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={!isLoading}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* User List */}
          {isLoadingUsers ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Загрузка пользователей...
              </Text>
            </View>
          ) : sections.length === 0 ? (
            renderEmptyState()
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
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={true}
              stickySectionHeadersEnabled={true}
              nestedScrollEnabled={true}
            />
          )}

          {/* Footer */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: theme.card,
                borderTopColor: theme.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonCancel,
                { backgroundColor: isDark ? theme.border : '#f3f4f6' },
              ]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text
                style={[styles.buttonCancelText, { color: theme.textSecondary }]}
              >
                Отмена
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonDelegate,
                (isLoading || !selectedUserId) && styles.buttonDisabled,
              ]}
              onPress={handleDelegate}
              disabled={isLoading || !selectedUserId}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonDelegateText}>Делегировать</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    height: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  list: {
    flex: 1,
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
  },
  userPosition: {
    fontSize: 13,
    marginBottom: 2,
  },
  userDepartment: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {},
  buttonCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDelegate: {
    backgroundColor: '#3b82f6',
  },
  buttonDelegateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
