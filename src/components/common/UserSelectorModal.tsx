/**
 * UserSelectorModal
 * Универсальный компонент для выбора пользователей с группировкой по подразделениям
 * Используется в чатах, задачах и опросах
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@/types/user.types';
import { getUsers } from '@api/user.api';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import Avatar from '@components/common/Avatar';

interface UserSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  selectedUserIds: number[];
  onSelectionChange: (userIds: number[]) => void;
  multiSelect?: boolean;
  title?: string;
  excludeUserIds?: number[]; // Исключить определенных пользователей из списка
  mode?: 'checkbox' | 'radio'; // Стиль отображения выбора
  onDone?: () => void; // Callback when Done button is pressed
  filterForTaskAssignment?: boolean; // Фильтр для назначения задач (только свой отдел + руководители других)
}

const UserSelectorModal: React.FC<UserSelectorModalProps> = ({
  visible,
  onClose,
  selectedUserIds,
  onSelectionChange,
  multiSelect = true,
  title = 'Выбрать участников',
  excludeUserIds = [],
  mode = 'checkbox',
  onDone,
  filterForTaskAssignment = false,
}) => {
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUsers();
    }
  }, [visible]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const currentUser = useAuthStore.getState().user;

      // Фильтр - только активные пользователи
      let filters: any = {
        is_active: true,
      };

      const response = await getUsers(filters, { limit: 100, offset: 0 });

      let usersList: User[] = [];
      if (response && response.data && Array.isArray(response.data)) {
        usersList = response.data;
      } else if (response && Array.isArray(response)) {
        usersList = response;
      }

      // Фильтруем исключенных пользователей
      // Обычные сотрудники не должны видеть администраторов
      const filteredUsers = usersList.filter((user) => {
        // Исключаем текущего пользователя
        if (user.id === currentUser?.id) return false;

        // Исключаем переданных пользователей
        if (excludeUserIds.includes(user.id)) return false;

        // Если текущий пользователь - обычный сотрудник, исключаем администраторов
        if (currentUser?.role === 'employee') {
          if (user.role === 'admin' || user.role === 'super_admin') return false;
        }

        // Фильтр для назначения задач: только сотрудники своего отдела и руководители других отделов
        if (filterForTaskAssignment && currentUser?.department_id) {
          // Включаем пользователей из своего отдела
          if (user.department_id === currentUser.department_id) {
            return true;
          }
          // Включаем руководителей других отделов
          if (user.role === 'department_head' && user.department_id !== currentUser.department_id) {
            return true;
          }
          // Исключаем всех остальных
          return false;
        }

        return true;
      });

      // Sort users: department heads first, then others
      filteredUsers.sort((a, b) => {
        const aIsDeptHead = a.role === 'department_head';
        const bIsDeptHead = b.role === 'department_head';

        if (aIsDeptHead && !bIsDeptHead) return -1;
        if (!aIsDeptHead && bIsDeptHead) return 1;

        // If both are dept heads or both are not, sort by name
        return a.name.localeCompare(b.name);
      });

      setUsers(filteredUsers);
    } catch (error) {
      console.error('❌ Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const searchText = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchText) ||
        user.email.toLowerCase().includes(searchText) ||
        user.position?.toLowerCase().includes(searchText)
    );
  }, [users, searchQuery]);

  // Группируем пользователей по подразделениям
  const userSections = useMemo(() => {
    const currentUser = useAuthStore.getState().user;
    const currentUserDepartmentId = currentUser?.department_id;

    // Группируем пользователей
    const byDepartment = new Map<number | null, User[]>();

    filteredUsers.forEach((user) => {
      const deptId = user.department_id || null;
      if (!byDepartment.has(deptId)) {
        byDepartment.set(deptId, []);
      }
      byDepartment.get(deptId)!.push(user);
    });

    const sections: Array<{ title: string; data: User[]; departmentId: number | null }> = [];

    // Сначала добавляем подразделение текущего пользователя
    if (currentUserDepartmentId && byDepartment.has(currentUserDepartmentId)) {
      const users = byDepartment.get(currentUserDepartmentId)!;
      const departmentName = users[0]?.department?.name || 'Мое подразделение';
      sections.push({
        title: departmentName,
        data: users,
        departmentId: currentUserDepartmentId,
      });
      byDepartment.delete(currentUserDepartmentId);
    }

    // Затем добавляем остальные подразделения (с названием)
    const departmentsWithNames: Array<{ id: number; name: string; users: User[] }> = [];
    byDepartment.forEach((users, deptId) => {
      if (deptId !== null) {
        const departmentName = users[0]?.department?.name || `Подразделение ${deptId}`;
        departmentsWithNames.push({ id: deptId, name: departmentName, users });
      }
    });

    // Сортируем по названию
    departmentsWithNames.sort((a, b) => a.name.localeCompare(b.name));
    departmentsWithNames.forEach((dept) => {
      sections.push({
        title: dept.name,
        data: dept.users,
        departmentId: dept.id,
      });
    });

    // В конце добавляем пользователей без подразделения
    if (byDepartment.has(null)) {
      const users = byDepartment.get(null)!;
      sections.push({
        title: 'Без подразделения',
        data: users,
        departmentId: null,
      });
    }

    return sections;
  }, [filteredUsers]);

  const toggleUserSelection = (userId: number) => {
    if (multiSelect) {
      if (selectedUserIds.includes(userId)) {
        onSelectionChange(selectedUserIds.filter((id) => id !== userId));
      } else {
        onSelectionChange([...selectedUserIds, userId]);
      }
    } else {
      onSelectionChange([userId]);
      onClose();
    }
  };

  const toggleDepartmentSelection = (departmentUsers: User[]) => {
    if (!multiSelect) return; // Only for multi-select mode

    const departmentUserIds = departmentUsers.map(u => u.id);
    const allSelected = departmentUserIds.every(id => selectedUserIds.includes(id));

    if (allSelected) {
      // Deselect all users in this department
      onSelectionChange(selectedUserIds.filter(id => !departmentUserIds.includes(id)));
    } else {
      // Select all users in this department
      const newSelectedUsers = [...selectedUserIds];
      departmentUserIds.forEach(id => {
        if (!newSelectedUsers.includes(id)) {
          newSelectedUsers.push(id);
        }
      });
      onSelectionChange(newSelectedUsers);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleDone = () => {
    if (onDone) {
      onDone();
    } else {
      onClose();
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#10B981';
      case 'busy':
        return '#EF4444';
      case 'away':
        return '#F59E0B';
      default:
        return '#9CA3AF';
    }
  };

  // Get role text in Russian
  const getRoleText = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Супер администратор';
      case 'admin':
        return 'Администратор';
      case 'department_head':
        return 'Руководитель отдела';
      case 'employee':
        return 'Сотрудник';
      default:
        return 'Пользователь';
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUserIds.includes(item.id);
    const isRadioMode = mode === 'radio' || !multiSelect;

    return (
      <TouchableOpacity
        style={[styles.userItem, {  borderBottomColor: theme.border }, isSelected && { backgroundColor: theme.backgroundSecondary }]}
        onPress={() => toggleUserSelection(item.id)}
      >
        <View style={styles.userInfo}>
          <Avatar
            name={item.name}
            imageUrl={item.avatar}
            size={48}
            status={item.status}
            showStatus={true}
          />
          <View style={styles.userDetails}>
            <View style={styles.userNameContainer}>
              <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
              {item.role === 'department_head' && (
                <Ionicons name="shield-checkmark" size={16} color="#F59E0B" style={styles.deptHeadIcon} />
              )}
            </View>
            <Text style={[styles.userRole, { color: theme.textSecondary }]}>{getRoleText(item.role)}</Text>
            {item.position && (
              <Text style={[styles.userPosition, { color: theme.textTertiary }]}>{item.position}</Text>
            )}
          </View>
        </View>
        {/* Radio для single-select, checkbox для multi-select */}
        {isRadioMode ? (
          <View style={[styles.radio, { borderColor: theme.border }, isSelected && { borderColor: theme.primary }]}>
            {isSelected && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
          </View>
        ) : (
          <View style={[styles.checkbox, { borderColor: theme.border }, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
            {isSelected && <Ionicons name="checkmark" size={18} color="white" />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 12,
    },
    clearButton: {
      padding: 4,
    },
    clearButtonText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '500',
    },
    doneButton: {
      padding: 4,
    },
    doneButtonText: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: '600',
    },
    selectedCount: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    selectedCountText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.primary,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      color: theme.text,
    },
    listContent: {
      paddingVertical: 8,
      paddingBottom: 120,
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
      gap: 6,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    deptHeadIcon: {
      marginLeft: 4,
    },
    userRole: {
      fontSize: 14,
    },
    userPosition: {
      fontSize: 12,
      marginTop: 2,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textTertiary,
      marginTop: 16,
    },
    sectionHeaderContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sectionCheckbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    partialCheckmark: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    sectionHeaderText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      textTransform: 'uppercase',
    },
    sectionHeaderCount: {
      fontSize: 12,
      color: theme.textTertiary,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          {multiSelect && selectedUserIds.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Очистить</Text>
            </TouchableOpacity>
          )}
          {multiSelect && (
            <TouchableOpacity onPress={handleDone} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>
                Готово {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Users Count */}
        {selectedUserIds.length > 0 && multiSelect && (
          <View style={styles.selectedCount}>
            <Ionicons name="people" size={20} color={theme.primary} />
            <Text style={styles.selectedCountText}>Выбрано: {selectedUserIds.length}</Text>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск участников..."
            placeholderTextColor={theme.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Users List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>Загрузка пользователей...</Text>
          </View>
        ) : (
          <SectionList
            sections={userSections}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderUserItem}
            renderSectionHeader={({ section }) => {
              if (!multiSelect) {
                // Radio mode - non-clickable headers
                return (
                  <View style={styles.sectionHeaderContainer}>
                    <Text style={styles.sectionHeaderText}>{section.title}</Text>
                    <Text style={styles.sectionHeaderCount}>
                      {section.data.length} {section.data.length === 1 ? 'пользователь' : 'пользователей'}
                    </Text>
                  </View>
                );
              }

              // Multi-select mode - clickable headers with checkboxes
              const departmentUserIds = section.data.map(u => u.id);
              const selectedCount = departmentUserIds.filter(id => selectedUserIds.includes(id)).length;
              const allSelected = selectedCount === departmentUserIds.length;
              const someSelected = selectedCount > 0 && selectedCount < departmentUserIds.length;

              return (
                <TouchableOpacity
                  style={styles.sectionHeaderContainer}
                  onPress={() => toggleDepartmentSelection(section.data)}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.sectionCheckbox, { borderColor: theme.border }, (allSelected || someSelected) && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                      {allSelected ? (
                        <Ionicons name="checkmark" size={18} color="white" />
                      ) : someSelected ? (
                        <View style={[styles.partialCheckmark, { backgroundColor: 'white' }]} />
                      ) : null}
                    </View>
                    <Text style={styles.sectionHeaderText}>{section.title}</Text>
                  </View>
                  <Text style={styles.sectionHeaderCount}>
                    {section.data.length} {section.data.length === 1 ? 'пользователь' : 'пользователей'}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={true}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={theme.border} />
                <Text style={styles.emptyText}>Пользователи не найдены</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default UserSelectorModal;
