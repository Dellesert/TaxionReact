/**
 * UserSelectorModal
 * Универсальный компонент для выбора пользователей с группировкой по подразделениям
 * Используется в чатах, задачах и опросах
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
import { useDebounce } from '@shared/hooks/useDebounce';
import Avatar from '@shared/components/common/Avatar';

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
  includeCurrentUser?: boolean; // Включить текущего пользователя в список (для графиков)
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
  includeCurrentUser = false,
}) => {
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  // Debounce search query for backend search (300ms delay)
  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadUsers = React.useCallback(async (searchTerm?: string, isInitialLoad = false) => {
    try {
      // Only show loading spinner on initial load, not during search
      if (isInitialLoad) {
        setIsLoading(true);
      }

      const currentUser = useAuthStore.getState().user;

      // Use server-side filtering, sorting, and search
      let filters: any = {
        is_active: true,
        exclude_me: !includeCurrentUser, // Exclude current user on backend (unless includeCurrentUser is true)
        exclude_roles: 'admin,super_admin', // Exclude admins for all users

        // Backend search (debounced)
        search: searchTerm || undefined,

        // Sorting
        prioritize_my_dept: true, // My department first
        dept_head_first: true, // Department heads first
        sort_by: 'name', // Sort by name
        sort_order: 'asc', // Ascending order
      };

      // For task assignment, use backend filter
      if (filterForTaskAssignment) {
        filters.for_task_assignment = true;
      }

      const response = await getUsers(filters, { limit: 100, offset: 0 });

      let usersList: User[] = [];
      if (response && response.data && Array.isArray(response.data)) {
        usersList = response.data;
      } else if (response && Array.isArray(response)) {
        usersList = response;
      }

      // Client-side only: filter out excludeUserIds (passed as prop)
      const filteredUsers = usersList.filter((user) => {
        // Исключаем переданных пользователей (excludeUserIds prop)
        if (excludeUserIds.includes(user.id)) return false;
        return true;
      });

      // Backend now handles all filtering, sorting, and search
      setUsers(filteredUsers);
    } catch (error) {
      console.error('❌ Failed to load users:', error);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [filterForTaskAssignment, excludeUserIds]);

  // Load users when modal opens (initial load)
  const isFirstLoad = React.useRef(true);
  useEffect(() => {
    if (visible) {
      if (isFirstLoad.current) {
        loadUsers(undefined, true);
        isFirstLoad.current = false;
      } else {
        loadUsers(undefined, false);
      }
    }
  }, [visible]);

  // Load users when debounced search changes (but not on initial render)
  const isFirstRender = React.useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (visible) {
      loadUsers(debouncedSearch, false);
    }
  }, [debouncedSearch, loadUsers, visible]);

  // Client-side filtering for instant feedback while waiting for backend
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

  // Группируем пользователей по подразделениям (preserving backend order)
  const userSections = useMemo(() => {
    // Group users by department while preserving backend order
    const departmentMap = new Map<string, User[]>();
    const noDepartmentUsers: User[] = [];
    const seenDepartments: string[] = []; // Track order of departments as they appear

    // Use filteredUsers for client-side search results
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
    const sections: Array<{ title: string; data: User[]; departmentId: number | null }> = [];

    // Add departments in the order they appeared (backend already sorted them)
    seenDepartments.forEach((deptName) => {
      const usersInDept = departmentMap.get(deptName)!;
      sections.push({
        title: deptName,
        data: usersInDept, // Users already sorted by backend (dept_head_first + name)
        departmentId: usersInDept[0]?.department_id || null,
      });
    });

    // Add users without department if any
    if (noDepartmentUsers.length > 0) {
      sections.push({
        title: 'Без подразделения',
        data: noDepartmentUsers,
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

  // Memoize handlers
  const handleSearchChange = React.useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleSearchClear = React.useCallback(() => {
    setSearchQuery('');
    // Restore focus after clearing
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  const keyExtractor = React.useCallback((item: User) => item.id.toString(), []);

  const renderUserItem = React.useCallback(({ item }: { item: User }) => {
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
  }, [selectedUserIds, mode, multiSelect, theme, toggleUserSelection]);

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
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Поиск участников..."
            placeholderTextColor={theme.inputPlaceholder}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleSearchClear}>
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
            keyExtractor={keyExtractor}
            renderItem={renderUserItem}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            windowSize={21}
            keyboardShouldPersistTaps="handled"
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
