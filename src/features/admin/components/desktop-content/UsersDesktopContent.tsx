/**
 * Users Desktop Content
 * Desktop версия управления пользователями с поиском в header
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { ExpandableFilterButton } from '@shared/components/common/ExpandableFilterButton';
import { DataTable, DataTableColumn } from '@shared/components/common/DataTable';
import { ActionMenu, ActionMenuItem } from '@shared/components/common/ActionMenu';
import * as userApi from '@api/user.api';
import { User, UserRole } from '@/types/user.types';
import { Avatar } from '@shared/components/common/Avatar';

const UsersDesktopContent: React.FC = () => {
  const { theme } = useTheme();
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

  // Action menu state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [menuButtonPosition, setMenuButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const menuButtonRefs = useRef<{ [key: number]: any }>({});

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.electron;

  // Debounce search query for backend search (300ms delay)
  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadUsers = React.useCallback(async () => {
    try {
      setIsLoading(true);

      const filters: any = {
        search: debouncedSearch || undefined,
        role: selectedRole !== 'all' ? selectedRole : undefined,
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
      <View style={{ flex: 1, backgroundColor: theme.background }}>
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

  const handleChangeRole = (targetUser: User) => {
    const roles: UserRole[] = ['employee', 'department_head'];

    showOptions(
      'Изменить роль',
      roles.map(role => ({
        text: getRoleLabel(role),
        onPress: () => updateUserRole(targetUser, role),
        icon: role === targetUser.role ? 'checkmark-circle' : undefined,
        style: role === targetUser.role ? 'primary' : 'default',
      })),
      `Текущая роль: ${getRoleLabel(targetUser.role)}`
    );
  };

  const updateUserRole = async (targetUser: User, newRole: UserRole) => {
    try {
      await userApi.updateUserRole(targetUser.id, newRole);
      showSuccess(`Роль пользователя изменена на "${getRoleLabel(newRole)}"`);
      loadUsers();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Не удалось изменить роль пользователя';
      showError(errorMessage);
    }
  };

  const handleToggleUserStatus = async (targetUser: User) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      showConfirm(
        targetUser.is_active ? 'Деактивировать пользователя' : 'Активировать пользователя',
        `Вы уверены, что хотите ${targetUser.is_active ? 'деактивировать' : 'активировать'} пользователя "${targetUser.name}"?`,
        () => resolve(true),
        () => resolve(false),
        {
          confirmText: targetUser.is_active ? 'Деактивировать' : 'Активировать',
          cancelText: 'Отмена',
          destructive: targetUser.is_active,
        }
      );
    });
    if (!confirmed) return;

    try {
      if (targetUser.is_active) {
        await userApi.deactivateUser(targetUser.id);
      } else {
        await userApi.activateUser(targetUser.id);
      }
      showSuccess(`Пользователь ${targetUser.is_active ? 'деактивирован' : 'активирован'}`);
      loadUsers();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Не удалось изменить статус пользователя';
      showError(errorMessage);
    }
  };

  const handleToggleUserHidden = async (targetUser: User) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      showConfirm(
        targetUser.is_hidden ? 'Показать пользователя' : 'Скрыть пользователя',
        `Вы уверены, что хотите ${targetUser.is_hidden ? 'показать' : 'скрыть'} пользователя "${targetUser.name}"?${!targetUser.is_hidden ? '\nСкрытый пользователь не будет виден в списках для обычных сотрудников.' : ''}`,
        () => resolve(true),
        () => resolve(false),
        {
          confirmText: targetUser.is_hidden ? 'Показать' : 'Скрыть',
          cancelText: 'Отмена',
          destructive: !targetUser.is_hidden,
        }
      );
    });
    if (!confirmed) return;

    try {
      if (targetUser.is_hidden) {
        await userApi.unhideUser(targetUser.id);
      } else {
        await userApi.hideUser(targetUser.id);
      }
      showSuccess(`Пользователь ${targetUser.is_hidden ? 'показан' : 'скрыт'}`);
      loadUsers();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Не удалось изменить видимость пользователя';
      showError(errorMessage);
    }
  };

  // Action menu handlers
  const handleOpenActionMenu = useCallback((targetUser: User) => {
    setSelectedUser(targetUser);
    const button = menuButtonRefs.current[targetUser.id];
    if (button) {
      button.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setMenuButtonPosition({ x: pageX, y: pageY, width, height });
        setShowActionMenu(true);
      });
    }
  }, []);

  const handleCloseActionMenu = useCallback(() => {
    setShowActionMenu(false);
    setTimeout(() => {
      setSelectedUser(null);
      setMenuButtonPosition(undefined);
    }, 300);
  }, []);

  const actionMenuItems = useMemo<ActionMenuItem[]>(() => {
    if (!selectedUser) return [];
    if (selectedUser.role !== 'employee' && selectedUser.role !== 'department_head') return [];

    return [
      {
        key: 'role',
        icon: 'shield-outline' as keyof typeof Ionicons.glyphMap,
        label: 'Изменить роль',
        color: theme.primary,
        onPress: () => handleChangeRole(selectedUser),
      },
      {
        key: 'status',
        icon: (selectedUser.is_active ? 'close-circle-outline' : 'checkmark-circle-outline') as keyof typeof Ionicons.glyphMap,
        label: selectedUser.is_active ? 'Деактивировать' : 'Активировать',
        color: selectedUser.is_active ? '#EF4444' : '#10B981',
        onPress: () => handleToggleUserStatus(selectedUser),
      },
      {
        key: 'hidden',
        icon: (selectedUser.is_hidden ? 'eye-outline' : 'eye-off-outline') as keyof typeof Ionicons.glyphMap,
        label: selectedUser.is_hidden ? 'Показать' : 'Скрыть',
        color: selectedUser.is_hidden ? '#10B981' : '#F59E0B',
        onPress: () => handleToggleUserHidden(selectedUser),
      },
    ];
  }, [selectedUser, theme.primary]);

  // Client-side filtering as fallback
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

  // Client-side pagination
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedRole]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, currentPage]);

  const columns = useMemo<DataTableColumn<User>[]>(() => [
    {
      key: 'name',
      title: 'Сотрудник',
      flex: 2,
      minWidth: 180,
      sortable: true,
      sortValue: (u) => u.name?.toLowerCase() || '',
      render: (u, t) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Avatar imageUrl={u.avatar} name={u.name} size={32} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13, color: t.text, fontWeight: '500' }}>{u.name}</Text>
              {!u.is_active && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Неактивен</Text>
                </View>
              )}
              {u.is_hidden && (
                <View style={styles.hiddenBadge}>
                  <Text style={styles.hiddenBadgeText}>Скрыт</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      flex: 2,
      minWidth: 160,
      sortable: true,
      sortValue: (u) => u.email?.toLowerCase() || '',
      render: (u, t) => (
        <Text style={{ fontSize: 13, color: t.textSecondary }}>{u.email}</Text>
      ),
    },
    {
      key: 'position',
      title: 'Должность',
      flex: 1.5,
      minWidth: 120,
      sortable: true,
      sortValue: (u) => u.position?.toLowerCase() || '',
      render: (u, t) => (
        <Text style={{ fontSize: 13, color: t.textSecondary }}>{u.position || '—'}</Text>
      ),
    },
    {
      key: 'department',
      title: 'Отдел',
      flex: 1.5,
      minWidth: 120,
      sortable: true,
      sortValue: (u) => u.department?.name?.toLowerCase() || '',
      render: (u, t) => (
        <Text style={{ fontSize: 13, color: t.textSecondary }}>{u.department?.name || '—'}</Text>
      ),
    },
    {
      key: 'role',
      title: 'Роль',
      flex: 1,
      minWidth: 100,
      sortable: true,
      sortValue: (u) => u.role || '',
      render: (u) => (
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(u.role) + '20' }]}>
          <Text style={[styles.roleBadgeText, { color: getRoleColor(u.role) }]}>
            {getRoleLabel(u.role)}
          </Text>
        </View>
      ),
    },
    {
      key: 'actions',
      title: 'Действия',
      width: 80,
      render: (u, t) => {
        if (u.role !== 'employee' && u.role !== 'department_head') return null;
        return (
          <TouchableOpacity
            ref={(ref: any) => { menuButtonRefs.current[u.id] = ref; }}
            style={[styles.actionMenuButton, { backgroundColor: t.backgroundSecondary }]}
            onPress={(e) => {
              e.stopPropagation();
              handleOpenActionMenu(u);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={t.text} />
          </TouchableOpacity>
        );
      },
    },
  ], []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <DataTable<User>
        columns={columns}
        data={paginatedUsers}
        keyExtractor={(u) => String(u.id)}
        isLoading={isLoading}
        emptyIcon="people-outline"
        emptyTitle={searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}
        emptySubtitle={searchQuery ? 'Попробуйте изменить запрос' : undefined}
        containerStyle={{ margin: 0, borderWidth: 0, borderRadius: 0 }}
        getRowStyle={(u) => !u.is_active ? { opacity: 0.6 } : undefined}
        pagination={{
          currentPage,
          totalItems: filteredUsers.length,
          pageSize: PAGE_SIZE,
          onPageChange: setCurrentPage,
        }}
      />

      {/* User Action Menu */}
      <ActionMenu
        visible={showActionMenu}
        items={actionMenuItems}
        onClose={handleCloseActionMenu}
        isDesktop={true}
        buttonPosition={menuButtonPosition}
      />

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
  hiddenBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hiddenBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
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
  actionMenuButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
