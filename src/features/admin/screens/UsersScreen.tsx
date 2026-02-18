// Refactored to use feature-based architecture
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import * as userApi from '@api/user.api';
import { User, UserRole } from '@/types/user.types';
import { Avatar } from '@shared/components/common/Avatar';

const UsersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );
  const { user: currentUser } = useAuthStore();
  const { showError, showSuccess } = useNotification();
  const { showOptions, showConfirm } = useActionModal();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');

  // Debounce search query for backend search (300ms delay)
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.electron;

  // Clear TitleBar controls when entering users screen
  useTitleBarControlsIntegration({
    pageTitle: 'Управление пользователями',
    leftControls: null,
    rightControls: null,
    enabled: isElectron,
  });

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

      setUsers(response.data);
    } catch (error: any) {
      showError('Не удалось загрузить список пользователей');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, selectedRole, showError]);

  // Check admin access
  if (currentUser?.role !== 'admin' && currentUser?.role !== 'super_admin') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color="#EF4444" />
          <Text style={styles.noAccessTitle}>Нет доступа</Text>
          <Text style={styles.noAccessText}>
            Только администраторы могут управлять пользователями
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Load users when debounced search or selected role changes
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
    // Use showConfirm for all platforms (web and mobile)
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.card }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Управление пользователями</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search and Filter */}
        <View style={[styles.searchContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={[styles.searchBox, { backgroundColor: theme.backgroundSecondary }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Поиск пользователей..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Role Filter */}
        <ScrollView
          horizontal
          style={[styles.filterContainer, { backgroundColor: theme.card }]}
          contentContainerStyle={styles.filterContent}
          showsHorizontalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: selectedRole === 'all' ? theme.primary : theme.backgroundSecondary },
            ]}
            onPress={() => setSelectedRole('all')}
          >
            <Text style={[styles.filterChipText, { color: selectedRole === 'all' ? '#FFF' : theme.text }]}>
              Все
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: selectedRole === 'employee' ? theme.primary : theme.backgroundSecondary },
            ]}
            onPress={() => setSelectedRole('employee')}
          >
            <Text style={[styles.filterChipText, { color: selectedRole === 'employee' ? '#FFF' : theme.text }]}>
              Сотрудники
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: selectedRole === 'department_head' ? theme.primary : theme.backgroundSecondary },
            ]}
            onPress={() => setSelectedRole('department_head')}
          >
            <Text style={[styles.filterChipText, { color: selectedRole === 'department_head' ? '#FFF' : theme.text }]}>
              Руководители
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterChip,
              { backgroundColor: selectedRole === 'admin' ? theme.primary : theme.backgroundSecondary },
            ]}
            onPress={() => setSelectedRole('admin')}
          >
            <Text style={[styles.filterChipText, { color: selectedRole === 'admin' ? '#FFF' : theme.text }]}>
              Админы
            </Text>
          </TouchableOpacity>
        </ScrollView>

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
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentInner}>
              <View style={styles.usersGrid}>
                {filteredUsers.map((user) => (
                  <View key={user.id} style={styles.userCardWrapper}>
                    <View
                      style={[
                        styles.userCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                        !user.is_active && { opacity: 0.6 },
                      ]}
                    >
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

                <View style={styles.userFooter}>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) + '20' }]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleColor(user.role) }]}>
                      {getRoleLabel(user.role)}
                    </Text>
                  </View>

                  <View style={styles.userActions}>
                    {/* Only show role change button for employee and department_head */}
                    {(user.role === 'employee' || user.role === 'department_head') && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
                        onPress={() => handleChangeRole(user)}
                      >
                        <Ionicons name="shield-outline" size={18} color={theme.primary} />
                      </TouchableOpacity>
                    )}
                    {/* Only show activate/deactivate button for employee and department_head */}
                    {(user.role === 'employee' || user.role === 'department_head') && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
                        onPress={() => handleToggleUserStatus(user)}
                      >
                        <Ionicons
                          name={user.is_active ? 'close-circle-outline' : 'checkmark-circle-outline'}
                          size={18}
                          color={user.is_active ? '#EF4444' : '#10B981'}
                        />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterContainer: {
    maxHeight: 60,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
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
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  userCardWrapper: {
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 16,
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
  userCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    ...(Platform.OS === 'web' && { height: '100%' }),
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '500',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  userPosition: {
    fontSize: 13,
    marginTop: 2,
  },
  userDepartment: {
    fontSize: 13,
    marginTop: 2,
  },
  userFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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

export default UsersScreen;
