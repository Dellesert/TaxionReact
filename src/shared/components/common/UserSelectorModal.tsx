/**
 * UserSelectorModal
 * Универсальный компонент для выбора пользователей с группировкой по подразделениям или группам
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { User, UserGroupWithMembers } from '@/types/user.types';
import { getUsers } from '@api/user.api';
import { getUserGroups } from '@api/user-group.api';
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
import { useDebounce } from '@shared/hooks/useDebounce';
import Avatar from '@shared/components/common/Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isDesktop = isWeb && SCREEN_WIDTH >= 768;

type ViewMode = 'departments' | 'groups';

interface UserSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  selectedUserIds: number[];
  onSelectionChange: (userIds: number[], selectedUsers?: User[]) => void;
  multiSelect?: boolean;
  title?: string;
  excludeUserIds?: number[]; // Исключить определенных пользователей из списка
  mode?: 'checkbox' | 'radio'; // Стиль отображения выбора
  onDone?: () => void; // Callback when Done button is pressed
  filterForTaskAssignment?: boolean; // Фильтр для назначения задач (только свой отдел + руководители других)
  includeCurrentUser?: boolean; // Включить текущего пользователя в список (для графиков)
  showGroupView?: boolean; // Показывать переключатель "По отделениям / По группам" (default: true)
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
  showGroupView = true,
}) => {
  const { theme } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('departments');
  const [userGroups, setUserGroups] = useState<UserGroupWithMembers[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

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
        exclude_roles: 'super_admin', // Exclude only super admins

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
      console.error('Failed to load users:', error);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, [filterForTaskAssignment, excludeUserIds]);

  // Load user groups
  const loadGroups = React.useCallback(async () => {
    try {
      setIsLoadingGroups(true);
      const groups = await getUserGroups(true) as UserGroupWithMembers[];
      setUserGroups(groups);
    } catch (error) {
      console.error('Failed to load user groups:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  // Load users when modal opens (initial load)
  const isFirstLoad = React.useRef(true);
  useEffect(() => {
    if (visible) {
      if (isFirstLoad.current) {
        loadUsers(undefined, true);
        if (showGroupView) {
          loadGroups();
        }
        isFirstLoad.current = false;
      } else {
        loadUsers(undefined, false);
        if (showGroupView) {
          loadGroups();
        }
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
  const departmentSections = useMemo(() => {
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

  // Группируем пользователей по группам
  const groupSections = useMemo(() => {
    if (!userGroups || userGroups.length === 0) {
      // No groups — show all users in one "Без группы" section
      if (filteredUsers.length > 0) {
        return [{
          title: 'Без группы',
          data: filteredUsers,
          departmentId: null as number | null,
        }];
      }
      return [];
    }

    const searchQuery_ = searchQuery.toLowerCase().trim();
    const userIdsInGroups = new Set<number>();
    const sections: Array<{ title: string; data: User[]; departmentId: number | null }> = [];

    userGroups.forEach((group) => {
      if (!group.members || group.members.length === 0) return;

      // Filter members by search query and excludeUserIds
      let members = group.members.filter((m) => !excludeUserIds.includes(m.id));

      if (searchQuery_) {
        members = members.filter((user) => {
          const name = user.name?.toLowerCase() || '';
          const email = user.email?.toLowerCase() || '';
          const position = user.position?.toLowerCase() || '';
          return name.includes(searchQuery_) || email.includes(searchQuery_) || position.includes(searchQuery_);
        });
      }

      if (members.length === 0) return;

      members.forEach((m) => userIdsInGroups.add(m.id));

      sections.push({
        title: group.name,
        data: members,
        departmentId: null,
      });
    });

    // Add ungrouped users
    const ungroupedUsers = filteredUsers.filter((u) => !userIdsInGroups.has(u.id));
    if (ungroupedUsers.length > 0) {
      sections.push({
        title: 'Без группы',
        data: ungroupedUsers,
        departmentId: null,
      });
    }

    return sections;
  }, [userGroups, filteredUsers, searchQuery, excludeUserIds]);

  // Select the active sections based on view mode
  const baseSections = viewMode === 'groups' ? groupSections : departmentSections;

  // Apply collapsed state: collapsed sections get empty data array
  const userSections = useMemo(() => {
    return baseSections.map(section => ({
      ...section,
      data: collapsedSections.has(section.title) ? [] : section.data,
    }));
  }, [baseSections, collapsedSections]);

  const toggleSectionCollapse = React.useCallback((sectionTitle: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionTitle)) {
        next.delete(sectionTitle);
      } else {
        next.add(sectionTitle);
      }
      return next;
    });
  }, []);

  const toggleUserSelection = (userId: number) => {
    if (multiSelect) {
      if (selectedUserIds.includes(userId)) {
        const newIds = selectedUserIds.filter((id) => id !== userId);
        const selectedUsers = users.filter((u) => newIds.includes(u.id));
        onSelectionChange(newIds, selectedUsers);
      } else {
        const newIds = [...selectedUserIds, userId];
        const selectedUsers = users.filter((u) => newIds.includes(u.id));
        onSelectionChange(newIds, selectedUsers);
      }
    } else {
      const selectedUser = users.find((u) => u.id === userId);
      onSelectionChange([userId], selectedUser ? [selectedUser] : []);
      onClose();
    }
  };

  const toggleDepartmentSelection = (departmentUsers: User[]) => {
    if (!multiSelect) return; // Only for multi-select mode

    const departmentUserIds = departmentUsers.map(u => u.id);
    const allSelected = departmentUserIds.every(id => selectedUserIds.includes(id));

    if (allSelected) {
      // Deselect all users in this department
      const newIds = selectedUserIds.filter(id => !departmentUserIds.includes(id));
      const selectedUsers = users.filter((u) => newIds.includes(u.id));
      onSelectionChange(newIds, selectedUsers);
    } else {
      // Select all users in this department
      const newSelectedIds = [...selectedUserIds];
      departmentUserIds.forEach(id => {
        if (!newSelectedIds.includes(id)) {
          newSelectedIds.push(id);
        }
      });
      const selectedUsers = users.filter((u) => newSelectedIds.includes(u.id));
      onSelectionChange(newSelectedIds, selectedUsers);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([], []);
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

  const keyExtractor = React.useCallback((item: User, index: number) => {
    // Use index as part of key since user can appear in multiple group sections
    return `${item.id}-${index}`;
  }, []);

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
    desktopOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      padding: 20,
    },
    desktopModal: {
      width: '100%',
      maxWidth: 600,
      maxHeight: '90%',
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: theme.background,
      ...Platform.select({
        web: {
          boxShadow: '0px 10px 40px rgba(0, 0, 0, 0.2)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.2,
          shadowRadius: 40,
          elevation: 10,
        },
      }),
    },
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
    // Segmented control styles
    segmentedControl: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 8,
      backgroundColor: theme.backgroundSecondary,
      padding: 2,
    },
    segmentButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 6,
    },
    segmentButtonActive: {
      backgroundColor: theme.background,
      ...Platform.select({
        web: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        },
      }),
    },
    segmentButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    segmentButtonTextActive: {
      color: theme.text,
      fontWeight: '600',
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
    collapseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
      paddingLeft: 8,
    },
  });

  const renderContent = () => (
    <>
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

      {/* View Mode Toggle */}
      {showGroupView && userGroups.length > 0 && (
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'departments' && styles.segmentButtonActive]}
            onPress={() => setViewMode('departments')}
          >
            <Text style={[styles.segmentButtonText, viewMode === 'departments' && styles.segmentButtonTextActive]}>
              По отделениям
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'groups' && styles.segmentButtonActive]}
            onPress={() => setViewMode('groups')}
          >
            <Text style={[styles.segmentButtonText, viewMode === 'groups' && styles.segmentButtonTextActive]}>
              По группам
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Users List */}
      {isLoading || (viewMode === 'groups' && isLoadingGroups) ? (
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
            const isCollapsed = collapsedSections.has(section.title);
            // Get real user count from baseSections (since collapsed sections have empty data)
            const realSection = baseSections.find(s => s.title === section.title);
            const realData = realSection?.data || section.data;
            const userCount = realData.length;

            if (!multiSelect) {
              // Radio mode - tap header to collapse/expand
              return (
                <TouchableOpacity
                  style={styles.sectionHeaderContainer}
                  onPress={() => toggleSectionCollapse(section.title)}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <Ionicons
                      name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                      size={18}
                      color={theme.textSecondary}
                    />
                    <Text style={styles.sectionHeaderText}>{section.title}</Text>
                  </View>
                  <Text style={styles.sectionHeaderCount}>
                    {userCount} {userCount === 1 ? 'пользователь' : 'пользователей'}
                  </Text>
                </TouchableOpacity>
              );
            }

            // Multi-select mode - checkbox toggles selection, chevron toggles collapse
            const sectionUserIds = realData.map(u => u.id);
            const selectedCount = sectionUserIds.filter(id => selectedUserIds.includes(id)).length;
            const allSelected = selectedCount === sectionUserIds.length;
            const someSelected = selectedCount > 0 && selectedCount < sectionUserIds.length;

            return (
              <View style={styles.sectionHeaderContainer}>
                <TouchableOpacity
                  style={styles.sectionHeaderLeft}
                  onPress={() => toggleDepartmentSelection(realData)}
                >
                  <View style={[styles.sectionCheckbox, { borderColor: theme.border }, (allSelected || someSelected) && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                    {allSelected ? (
                      <Ionicons name="checkmark" size={18} color="white" />
                    ) : someSelected ? (
                      <View style={[styles.partialCheckmark, { backgroundColor: 'white' }]} />
                    ) : null}
                  </View>
                  <Text style={styles.sectionHeaderText}>{section.title}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.collapseButton}
                  onPress={() => toggleSectionCollapse(section.title)}
                >
                  <Text style={styles.sectionHeaderCount}>
                    {userCount} {userCount === 1 ? 'пользователь' : 'пользователей'}
                  </Text>
                  <Ionicons
                    name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                    size={18}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
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
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent={isDesktop}
      animationType={isDesktop ? 'fade' : 'slide'}
      presentationStyle={isDesktop ? 'overFullScreen' : Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      {isDesktop ? (
        // Desktop version: centered modal with overlay
        <TouchableOpacity
          style={styles.desktopOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            style={styles.desktopModal}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.container}>
              {renderContent()}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      ) : (
        // Mobile version: fullscreen
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          {renderContent()}
        </SafeAreaView>
      )}
    </Modal>
  );
};

export default UserSelectorModal;
