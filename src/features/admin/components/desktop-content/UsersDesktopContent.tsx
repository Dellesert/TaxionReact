/**
 * Users Desktop Content
 * Desktop версия управления пользователями
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useDebounce } from '@shared/hooks/useDebounce';
import * as userApi from '@api/user.api';
import { User, UserRole } from '@/types/user.types';
import { Avatar } from '@shared/components/common/Avatar';

const SIDEBAR_WIDTH = 320;

const UsersDesktopContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = windowWidth - SIDEBAR_WIDTH;
  const isNarrow = contentWidth < 600;
  const gridColumns = isNarrow ? 1 : 2;
  const cardMaxWidth = `${(100 / gridColumns).toFixed(3)}%` as `${number}%`;
  const horizontalPadding = isNarrow ? 16 : 32;
  const { user: currentUser } = useAuthStore();
  const { showError, showSuccess } = useNotification();
  const { showOptions, showConfirm } = useActionModal();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');

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
        return 'Руководитель отдела';
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

  // Backend now handles all filtering and search
  const filteredUsers = users;

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: horizontalPadding,
      paddingTop: isNarrow ? 20 : 32,
      paddingBottom: isNarrow ? 16 : 24,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTop: {
      marginBottom: isNarrow ? 12 : 20,
    },
    headerTitle: {
      fontSize: isNarrow ? 22 : 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    headerDescription: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    searchAndFilterRow: {
      flexDirection: isNarrow ? 'column' : 'row',
      alignItems: isNarrow ? 'stretch' : 'center',
      gap: 12,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      flex: isNarrow ? undefined : 1,
      maxWidth: isNarrow ? undefined : 500,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
    },
    filterChips: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: isNarrow ? 'wrap' : undefined,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 10,
    },
    filterChipText: {
      fontSize: 14,
      fontWeight: '600',
    },
    userCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
      height: '100%',
    },
    usersList: {
      flexDirection: isNarrow ? 'column' : 'row',
      flexWrap: isNarrow ? undefined : 'wrap',
      marginHorizontal: isNarrow ? 0 : -8,
    },
    userCardWrapper: {
      width: '100%',
      maxWidth: isNarrow ? '100%' : cardMaxWidth,
      paddingHorizontal: isNarrow ? 0 : 8,
      marginBottom: 16,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Header with title, description, search and filters */}
      <View style={[dynamicStyles.header, { backgroundColor: isDark ? theme.card : '#FAFAFA' }]}>
        <View style={dynamicStyles.headerTop}>
          <Text style={dynamicStyles.headerTitle}>Управление пользователями</Text>
          <Text style={dynamicStyles.headerDescription}>
            Добавление, редактирование и управление правами пользователей
          </Text>
        </View>

        {/* Search and Filter Row */}
        <View style={dynamicStyles.searchAndFilterRow}>
          <View style={dynamicStyles.searchContainer}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              style={dynamicStyles.searchInput}
              placeholder="Поиск пользователей..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Role Filters */}
          <View style={dynamicStyles.filterChips}>
            <TouchableOpacity
              style={[
                dynamicStyles.filterChip,
                { backgroundColor: selectedRole === 'all' ? theme.primary : theme.backgroundSecondary },
              ]}
              onPress={() => setSelectedRole('all')}
            >
              <Text
                style={[
                  dynamicStyles.filterChipText,
                  { color: selectedRole === 'all' ? '#FFF' : theme.text },
                ]}
              >
                Все
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                dynamicStyles.filterChip,
                { backgroundColor: selectedRole === 'employee' ? theme.primary : theme.backgroundSecondary },
              ]}
              onPress={() => setSelectedRole('employee')}
            >
              <Text
                style={[
                  dynamicStyles.filterChipText,
                  { color: selectedRole === 'employee' ? '#FFF' : theme.text },
                ]}
              >
                Сотрудники
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                dynamicStyles.filterChip,
                { backgroundColor: selectedRole === 'department_head' ? theme.primary : theme.backgroundSecondary },
              ]}
              onPress={() => setSelectedRole('department_head')}
            >
              <Text
                style={[
                  dynamicStyles.filterChipText,
                  { color: selectedRole === 'department_head' ? '#FFF' : theme.text },
                ]}
              >
                Руководители
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                dynamicStyles.filterChip,
                { backgroundColor: selectedRole === 'admin' ? theme.primary : theme.backgroundSecondary },
              ]}
              onPress={() => setSelectedRole('admin')}
            >
              <Text
                style={[
                  dynamicStyles.filterChipText,
                  { color: selectedRole === 'admin' ? '#FFF' : theme.text },
                ]}
              >
                Админы
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="people-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {searchQuery ? 'Пользователи не найдены' : 'Нет пользователей'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.contentInner}>
            <View style={dynamicStyles.usersList}>
              {filteredUsers.map((user) => (
                <View key={user.id} style={dynamicStyles.userCardWrapper}>
                  <View
                    style={[
                      dynamicStyles.userCard,
                      !user.is_active && { opacity: 0.6 },
                    ]}
                  >
                    {/* User Header */}
                    <View style={styles.userHeader}>
                      <Avatar imageUrl={user.avatar} name={user.name} size={48} />
                      <View style={styles.userInfo}>
                        <View style={styles.userNameRow}>
                          <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
                          {!user.is_active && (
                            <View style={styles.inactiveBadge}>
                              <Text style={styles.inactiveBadgeText}>Неактивен</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user.email}</Text>
                        {user.position && (
                          <Text style={[styles.userPosition, { color: theme.textTertiary }]}>{user.position}</Text>
                        )}
                        {user.department && (
                          <Text style={[styles.userDepartment, { color: theme.textTertiary }]}>
                            {user.department.name}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Role Badge and Actions */}
                    <View style={styles.userFooter}>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                        <Text style={[styles.roleBadgeText, { color: getRoleColor(user.role) }]}>
                          {getRoleLabel(user.role)}
                        </Text>
                      </View>

                      <View style={styles.actionButtons}>
                        {/* Only show role change button for employee and department_head */}
                        {(user.role === 'employee' || user.role === 'department_head') && (
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.1)' },
                            ]}
                            onPress={() => handleChangeRole(user)}
                          >
                            <Ionicons name="shield-outline" size={18} color={theme.primary} />
                            <Text style={[styles.actionButtonText, { color: theme.primary }]}>Роль</Text>
                          </TouchableOpacity>
                        )}
                        {/* Only show activate/deactivate button for employee and department_head */}
                        {(user.role === 'employee' || user.role === 'department_head') && (
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              {
                                backgroundColor: user.is_active
                                  ? isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.1)'
                                  : isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)',
                              },
                            ]}
                            onPress={() => handleToggleUserStatus(user)}
                          >
                            <Ionicons
                              name={user.is_active ? 'close-circle-outline' : 'checkmark-circle-outline'}
                              size={18}
                              color={user.is_active ? '#EF4444' : '#10B981'}
                            />
                            <Text
                              style={[
                                styles.actionButtonText,
                                { color: user.is_active ? '#EF4444' : '#10B981' },
                              ]}
                            >
                              {user.is_active ? 'Деактивировать' : 'Активировать'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
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
    fontSize: 16,
    marginTop: 16,
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  inactiveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  userPosition: {
    fontSize: 13,
    marginBottom: 2,
  },
  userDepartment: {
    fontSize: 13,
  },
  userFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
  },
  noAccessText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
});

export default UsersDesktopContent;
