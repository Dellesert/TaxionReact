/**
 * Users Desktop Content
 * Desktop версия управления пользователями
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { ExpandableFilterButton } from '@shared/components/common/ExpandableFilterButton';
import * as userApi from '@api/user.api';
import { User, UserRole } from '@/types/user.types';
import { Avatar } from '@shared/components/common/Avatar';
import { AdminListSkeleton } from '../states/AdminListSkeleton';

const FadeIn: React.FC<{ children: React.ReactNode; style?: any; enabled?: boolean }> = ({ children, style, enabled = true }) => {
  const opacity = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  useEffect(() => {
    if (enabled) {
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, [opacity, enabled]);
  return <Animated.View style={[{ flex: 1, opacity }, style]}>{children}</Animated.View>;
};

const UsersDesktopContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  const mountTime = useRef(Date.now());
  const { user: currentUser } = useAuthStore();
  const { showError, showSuccess } = useNotification();
  const { showOptions, showConfirm } = useActionModal();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [filterButtonPosition, setFilterButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const filterButtonRef = useRef<View>(null) as React.RefObject<View>;

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.electron;

  // Debounce search query for backend search (300ms delay)
  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadUsers = React.useCallback(async () => {
    try {
      setIsLoading(true);

      // Backend filters with search and sorting
      const filters: any = {
        // Text search (backend now supports it)
        search: debouncedSearch || undefined,
        // Role filter (from UI dropdown)
        role: selectedRole !== 'all' ? selectedRole : undefined,
        // Sorting by name
        sort_by: 'name',
        sort_order: 'asc',
      };

      const response = await userApi.getUsers(filters, { limit: 1000, offset: 0 });
      setUsers(response.data || []);
    } catch (error: any) {
      showError('Не удалось загрузить список пользователей');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedRole, showError]);

  // Role filter options
  const ROLE_FILTERS: { key: UserRole | 'all'; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'employee', label: 'Сотрудники' },
    { key: 'department_head', label: 'Руководители' },
    { key: 'admin', label: 'Админы' },
  ];

  const handleFilterToggle = useCallback(() => {
    if (filterButtonRef.current) {
      // @ts-ignore - Web-only method
      const rect = filterButtonRef.current.getBoundingClientRect?.();
      if (rect) {
        setFilterButtonPosition({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }
    setFilterMenuVisible(prev => !prev);
  }, []);

  const handleRoleSelect = useCallback((role: UserRole | 'all') => {
    setSelectedRole(role);
    setFilterMenuVisible(false);
  }, []);

  const getRoleFilterLabel = () => {
    const found = ROLE_FILTERS.find(f => f.key === selectedRole);
    return found?.label || 'Все';
  };

  // TitleBar center controls - search input
  const titleBarCenterControls = useMemo(() => {
    if (!isElectron) return null;
    return (
      <View style={titleBarStyles.searchContainer}>
        <Ionicons name="search" size={14} color={theme.textSecondary} />
        <TextInput
          style={[titleBarStyles.searchInput, { color: theme.text }]}
          placeholder="Поиск пользователей..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [isElectron, searchQuery, theme]);

  // TitleBar right controls - filter button
  const titleBarRightControls = useMemo(() => {
    if (!isElectron) return null;
    return (
      <ExpandableFilterButton
        label={getRoleFilterLabel()}
        title="Фильтр по роли"
        onPress={handleFilterToggle}
        hasActiveFilters={selectedRole !== 'all'}
        buttonRef={filterButtonRef}
      />
    );
  }, [isElectron, selectedRole, handleFilterToggle]);

  // Integrate with TitleBar
  useTitleBarControlsIntegration({
    pageTitle: 'Пользователи',
    centerControls: titleBarCenterControls,
    rightControls: titleBarRightControls,
    isPageLoading: isLoading,
    enabled: isElectron,
  });

  // Check admin access
  if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color="#EF4444" />
          <Text style={styles.noAccessTitle}>Нет доступа</Text>
          <Text style={styles.noAccessText}>
            Только администраторы могут управлять пользователями
          </Text>
        </View>
      </View>
    );
  }

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'super_admin':
        return 'Супер Админ';
      case 'admin':
        return 'Админ';
      case 'department_head':
        return 'Руководитель';
      case 'employee':
        return 'Сотрудник';
      default:
        return role;
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case 'super_admin':
        return '#DC2626';
      case 'admin':
        return '#EA580C';
      case 'department_head':
        return '#2563EB';
      case 'employee':
        return '#059669';
      default:
        return '#6B7280';
    }
  };

  const handleChangeRole = (user: User) => {
    // Only allow changing between employee and department_head
    const roles: UserRole[] = ['employee', 'department_head'];

    // Use showOptions for all platforms (web and mobile)
    showOptions(
      'Изменить роль',
      roles.map(role => ({
        text: getRoleLabel(role),
        onPress: () => updateUserRole(user, role),
        icon: role === user.role ? 'checkmark-circle' : undefined,
        style: role === user.role ? 'primary' : 'default',
      })),
      `Текущая роль: ${getRoleLabel(user.role)}`
    );
  };

  const updateUserRole = async (user: User, newRole: UserRole) => {
    try {
      await userApi.updateUserRole(user.id, newRole);
      showSuccess(`Роль пользователя изменена на "${getRoleLabel(newRole)}"`);
      loadUsers();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Не удалось изменить роль пользователя';
      showError(errorMessage);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      showConfirm(
        user.is_active ? 'Деактивировать пользователя' : 'Активировать пользователя',
        `Вы уверены, что хотите ${user.is_active ? 'деактивировать' : 'активировать'} пользователя "${user.name}"?`,
        () => resolve(true),
        () => resolve(false),
        {
          confirmText: user.is_active ? 'Деактивировать' : 'Активировать',
          cancelText: 'Отмена',
          destructive: user.is_active,
        }
      );
    });
    if (!confirmed) return;

    try {
      if (user.is_active) {
        await userApi.deactivateUser(user.id);
      } else {
        await userApi.activateUser(user.id);
      }
      showSuccess(`Пользователь ${user.is_active ? 'деактивирован' : 'активирован'}`);
      loadUsers();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Не удалось изменить статус пользователя';
      showError(errorMessage);
    }
  };

  // Client-side filtering as fallback (in case backend ignores search/role params)
  const filteredUsers = useMemo(() => {
    let result = users;

    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.position?.toLowerCase().includes(query) ||
        u.department?.name?.toLowerCase().includes(query)
      );
    }

    if (selectedRole !== 'all') {
      result = result.filter(u => u.role === selectedRole);
    }

    return result;
  }, [users, debouncedSearch, selectedRole]);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Content */}
      {isLoading ? (
        <AdminListSkeleton variant="user" count={6} />
      ) : filteredUsers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}
          </Text>
        </View>
      ) : (
        <FadeIn enabled={Date.now() - mountTime.current > 150}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.contentInner}>
            <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {/* Table header */}
              <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary, width: 40 }]}>№</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 2 }]}>Сотрудник</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 2 }]}>Email</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 1.5 }]}>Должность</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 1.5 }]}>Отдел</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 1 }]}>Роль</Text>
                <View style={{ width: 80 }} />
              </View>
              {/* Table rows */}
              {filteredUsers.map((user, index) => (
                <View
                  key={user.id}
                  style={[
                    styles.tableRow,
                    index < filteredUsers.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                    !user.is_active && { opacity: 0.6 },
                  ]}
                  // @ts-ignore - Web-only event handlers
                  onMouseEnter={(e: any) => {
                    if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.backgroundSecondary;
                  }}
                  onMouseLeave={(e: any) => {
                    if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, width: 40 }]}>{index + 1}</Text>
                  <View style={[styles.tableCellUser, { flex: 2 }]}>
                    <Avatar imageUrl={user.avatar} name={user.name} size={32} />
                    <View style={styles.userNameRow}>
                      <Text style={[styles.tableCellText, { color: theme.text, fontWeight: '500' }]}>{user.name}</Text>
                      {!user.is_active && (
                        <View style={styles.inactiveBadge}>
                          <Text style={styles.inactiveBadgeText}>Неактивен</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 2 }]}>{user.email}</Text>
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 1.5 }]}>{user.position || '—'}</Text>
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 1.5 }]}>{user.department?.name || '—'}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                      <Text style={[styles.roleBadgeText, { color: getRoleColor(user.role) }]}>
                        {getRoleLabel(user.role)}
                      </Text>
                    </View>
                  </View>
                  <View style={{ width: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    {(user.role === 'employee' || user.role === 'department_head') && (
                      <TouchableOpacity
                        style={[styles.tableActionButton, { backgroundColor: theme.backgroundTertiary }]}
                        onPress={() => handleChangeRole(user)}
                      >
                        <Ionicons name="shield-outline" size={14} color={theme.primary} />
                      </TouchableOpacity>
                    )}
                    {(user.role === 'employee' || user.role === 'department_head') && (
                      <TouchableOpacity
                        style={[styles.tableActionButton, { backgroundColor: theme.backgroundTertiary }]}
                        onPress={() => handleToggleUserStatus(user)}
                      >
                        <Ionicons
                          name={user.is_active ? 'close-circle-outline' : 'checkmark-circle-outline'}
                          size={14}
                          color={user.is_active ? '#EF4444' : '#10B981'}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        </FadeIn>
      )}

      {/* Role Filter Dropdown */}
      <Modal
        visible={filterMenuVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFilterMenuVisible(false)}
      >
        <TouchableOpacity
          style={filterDropdownStyles.overlay}
          activeOpacity={1}
          onPress={() => setFilterMenuVisible(false)}
        >
          <View
            style={[
              filterDropdownStyles.menu,
              {
                backgroundColor: theme.card,
                top: filterButtonPosition
                  ? filterButtonPosition.y + filterButtonPosition.height + 8
                  : 60,
                right: 16,
              },
            ]}
          >
            {ROLE_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  filterDropdownStyles.menuItem,
                  selectedRole === filter.key && {
                    backgroundColor: theme.backgroundSecondary,
                  },
                ]}
                onPress={() => handleRoleSelect(filter.key)}
              >
                <Text
                  style={[
                    filterDropdownStyles.menuItemText,
                    { color: theme.text },
                    selectedRole === filter.key && {
                      color: theme.primary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  {filter.label}
                </Text>
                {selectedRole === filter.key && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 16,
  },
  tableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  tableHeader: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCellUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tableCellText: {
    fontSize: 13,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inactiveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EF4444',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tableActionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    cursor: 'pointer',
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    color: '#EF4444',
    marginTop: 16,
  },
  noAccessText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});

const titleBarStyles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 28,
    gap: 6,
    minWidth: 260,
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: 28,
    // @ts-ignore - Web-only
    outlineStyle: 'none',
  } as any,
});

const filterDropdownStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menu: {
    position: 'absolute',
    minWidth: 180,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    // @ts-ignore
    cursor: 'pointer',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});

export default UsersDesktopContent;
