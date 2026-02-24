/**
 * Departments Desktop Content
 * Desktop версия управления отделами с поиском в header
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { ExpandableCreateButton } from '@shared/components/common/ExpandableCreateButton';
import { DataTable, DataTableColumn } from '@shared/components/common/DataTable';
import * as userApi from '@api/user.api';
import { Department } from '@/types/user.types';

const DepartmentsDesktopContent: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { showError, showSuccess } = useNotification();
  const { showConfirm } = useActionModal();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.electron;

  // TitleBar: search (center) + create button (right)
  const titleBarCenterControls = useMemo(() => {
    if (!isElectron) return null;
    return (
      <View style={titleBarStyles.searchContainer}>
        <Ionicons name="search" size={14} color={theme.textSecondary} />
        <TextInput
          style={[titleBarStyles.searchInput, { color: theme.text }]}
          placeholder="Поиск отделов..."
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

  const titleBarRightControls = useMemo(() => {
    if (!isElectron) return null;
    return (
      <ExpandableCreateButton
        label="Добавить"
        title="Добавить отдел"
        labelWidth={64}
        onPress={() => setShowCreateModal(true)}
      />
    );
  }, [isElectron]);

  useTitleBarControlsIntegration({
    pageTitle: 'Управление отделами',
    centerControls: titleBarCenterControls,
    rightControls: titleBarRightControls,
    isPageLoading: isLoading,
    enabled: isElectron,
  });

  // Check admin access
  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color="#EF4444" />
          <Text style={styles.noAccessTitle}>Нет доступа</Text>
          <Text style={styles.noAccessText}>
            Только администраторы могут управлять отделами
          </Text>
        </View>
      </View>
    );
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setIsLoading(true);
      const data = await userApi.getDepartments();
      setDepartments(data);
    } catch (error: any) {
      console.error('Failed to load departments:', error);
      showError(`Не удалось загрузить список отделов: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) {
      showError('Введите название отдела');
      return;
    }

    try {
      setIsCreating(true);
      await userApi.createDepartment({
        name: newDepartmentName.trim(),
      });

      setNewDepartmentName('');
      setShowCreateModal(false);
      showSuccess('Отдел создан');
      loadDepartments();
    } catch (error: any) {
      console.error('Failed to create department:', error);
      showError('Не удалось создать отдел');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDepartment = async (department: Department) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      showConfirm(
        'Удаление отдела',
        `Вы уверены, что хотите удалить отдел "${department.name}"?`,
        () => resolve(true),
        () => resolve(false),
        { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
      );
    });
    if (!confirmed) return;

    try {
      await userApi.deleteDepartment(department.id);
      showSuccess('Отдел удален');
      loadDepartments();
    } catch (error: any) {
      console.error('Failed to delete department:', error);
      showError('Не удалось удалить отдел');
    }
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = useMemo<DataTableColumn<Department>[]>(() => [
    {
      key: 'name',
      title: 'Название',
      flex: 2.5,
      minWidth: 200,
      sortable: true,
      sortValue: (dept) => dept.name.toLowerCase(),
      render: (dept, t) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={[styles.departmentIcon, { backgroundColor: t.primary + '15' }]}>
            <Ionicons name="business" size={16} color={t.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: t.text, fontWeight: '500' }}>{dept.name}</Text>
            {dept.description ? (
              <Text style={{ fontSize: 11, color: t.textTertiary, marginTop: 2 }} numberOfLines={1}>
                {dept.description}
              </Text>
            ) : null}
          </View>
        </View>
      ),
    },
    {
      key: 'head',
      title: 'Руководитель',
      flex: 2,
      minWidth: 140,
      sortable: true,
      sortValue: (dept) => dept.head?.name?.toLowerCase() || '',
      render: (dept, t) => (
        <Text style={{ fontSize: 13, color: t.textSecondary }}>{dept.head?.name || '—'}</Text>
      ),
    },
    {
      key: 'members',
      title: 'Сотрудники',
      flex: 1,
      minWidth: 100,
      sortable: true,
      sortValue: (dept) => dept.user_count || dept.members_count || 0,
      render: (dept, t) => (
        <Text style={{ fontSize: 13, color: t.textSecondary }}>
          {dept.user_count || dept.members_count || 0}
        </Text>
      ),
    },
    {
      key: 'actions',
      title: 'Действия',
      width: 120,
      render: (dept, t) => (
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: t.error + '15' }]}
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteDepartment(dept);
          }}
        >
          <Text style={{ fontSize: 12, color: t.error, fontWeight: '600' }}>Удалить</Text>
        </TouchableOpacity>
      ),
    },
  ], []);

  const handleRowPress = useCallback((dept: Department) => {
    (navigation as any).navigate('EditDepartment', { departmentId: dept.id });
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Create Modal */}
      {showCreateModal && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
          <View style={[styles.modal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Создать отдел</Text>

            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundSecondary,
                },
              ]}
              placeholder="Название отдела"
              placeholderTextColor={theme.textTertiary}
              value={newDepartmentName}
              onChangeText={setNewDepartmentName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewDepartmentName('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.text }]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleCreateDepartment}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Создать</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <DataTable<Department>
        columns={columns}
        data={filteredDepartments}
        keyExtractor={(dept) => String(dept.id)}
        onRowPress={handleRowPress}
        isLoading={isLoading}
        emptyIcon="business-outline"
        emptyTitle={searchQuery ? 'Отделы не найдены' : 'Нет отделов'}
        emptySubtitle={searchQuery ? 'Попробуйте изменить запрос' : 'Создайте первый отдел'}
        containerStyle={{ margin: 0, borderWidth: 0, borderRadius: 0 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  departmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
    // @ts-ignore
    cursor: 'pointer',
  },
  modalButtonText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
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

export default DepartmentsDesktopContent;
