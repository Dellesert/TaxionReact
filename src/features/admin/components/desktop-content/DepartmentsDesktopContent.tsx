/**
 * Departments Desktop Content
 * Desktop версия управления отделами с поиском в header
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { ExpandableCreateButton } from '@shared/components/common/ExpandableCreateButton';
import * as userApi from '@api/user.api';
import { Department } from '@/types/user.types';
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

const DepartmentsDesktopContent: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const mountTime = useRef(Date.now());
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
        label="Создать"
        title="Создать отдел"
        onPress={() => setShowCreateModal(true)}
      />
    );
  }, [isElectron]);

  useTitleBarControlsIntegration({
    pageTitle: 'Управление отделами',
    centerControls: titleBarCenterControls,
    rightControls: titleBarRightControls,
    enabled: isElectron,
  });

  // Check admin access
  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
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

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Create Modal */}
      {showCreateModal && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
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

      {/* Content */}
      {isLoading ? (
        <AdminListSkeleton variant="department" count={6} />
      ) : filteredDepartments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="business-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {searchQuery ? 'Отделы не найдены' : 'Нет отделов'}
          </Text>
        </View>
      ) : (
        <FadeIn enabled={Date.now() - mountTime.current > 150}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.contentInner}>
            <View style={[styles.tableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {/* Table header */}
              <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 2.5 }]}>Название</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 2 }]}>Руководитель</Text>
                <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 1 }]}>Сотрудники</Text>
                <View style={{ width: 80 }} />
              </View>
              {/* Table rows */}
              {filteredDepartments.map((department, index) => (
                <View
                  key={department.id}
                  style={[
                    styles.tableRow,
                    index < filteredDepartments.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                  // @ts-ignore - Web-only event handlers
                  onClick={() => {
                    (navigation as any).navigate('EditDepartment', { departmentId: department.id });
                  }}
                  onMouseEnter={(e: any) => {
                    if (e.currentTarget?.style) {
                      e.currentTarget.style.backgroundColor = theme.backgroundSecondary;
                      e.currentTarget.style.cursor = 'pointer';
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.departmentIcon, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="business" size={16} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tableCellText, { color: theme.text, fontWeight: '500' }]}>{department.name}</Text>
                      {department.description && (
                        <Text style={[styles.tableCellSubtext, { color: theme.textTertiary }]} numberOfLines={1}>
                          {department.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 2 }]}>
                    {department.head?.name || '—'}
                  </Text>
                  <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 1 }]}>
                    {department.user_count || department.members_count || 0}
                  </Text>
                  <View style={{ width: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <TouchableOpacity
                      style={[styles.tableActionButton, { backgroundColor: theme.backgroundTertiary }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteDepartment(department);
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
        </FadeIn>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeader: {
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableCellText: {
    fontSize: 13,
  },
  tableCellSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  departmentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
