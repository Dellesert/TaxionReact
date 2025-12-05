/**
 * Departments Desktop Content
 * Desktop версия управления отделами с поиском в header
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import * as userApi from '@api/user.api';
import { Department } from '@/types/user.types';

const DepartmentsDesktopContent: React.FC = () => {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();
  const { showError, showSuccess } = useNotification();
  const { showConfirm } = useActionModal();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
    header: {
      paddingHorizontal: 32,
      paddingTop: 32,
      paddingBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
      gap: 24,
    },
    headerText: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 28,
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
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      maxWidth: 500,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
    },
    createButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    departmentCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
      height: '100%',
    },
    departmentName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
      letterSpacing: -0.3,
    },
    departmentDescription: {
      fontSize: 15,
      color: theme.textSecondary,
      marginBottom: 8,
      lineHeight: 22,
    },
    departmentMembers: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    departmentList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -8,
    },
    departmentCardWrapper: {
      width: '100%',
      maxWidth: '33.333%',
      paddingHorizontal: 8,
      marginBottom: 16,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Header with title, description and create button */}
      <View style={[dynamicStyles.header, { backgroundColor: isDark ? theme.card : '#FAFAFA' }]}>
        <View style={dynamicStyles.headerTop}>
          <View style={dynamicStyles.headerText}>
            <Text style={dynamicStyles.headerTitle}>Управление отделами</Text>
            <Text style={dynamicStyles.headerDescription}>
              Создание и редактирование структуры организации
            </Text>
          </View>
          <TouchableOpacity
            style={dynamicStyles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={dynamicStyles.createButtonText}>Создать отдел</Text>
          </TouchableOpacity>
        </View>

        {/* Search Row */}
        <View style={dynamicStyles.searchRow}>
          <View style={dynamicStyles.searchContainer}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              style={dynamicStyles.searchInput}
              placeholder="Поиск отделов..."
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
        </View>
      </View>

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
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : filteredDepartments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="business-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {searchQuery ? 'Отделы не найдены' : 'Нет отделов'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.contentInner}>
            <View style={dynamicStyles.departmentList}>
              {filteredDepartments.map((department) => (
                <View key={department.id} style={dynamicStyles.departmentCardWrapper}>
                  <TouchableOpacity
                    style={dynamicStyles.departmentCard}
                    onPress={() => {
                      (navigation as any).navigate('EditDepartment', { departmentId: department.id });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.departmentContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Ionicons name="business" size={20} color={theme.primary} />
                        <Text style={dynamicStyles.departmentName}>{department.name}</Text>
                      </View>
                      {department.description && (
                        <Text style={dynamicStyles.departmentDescription}>
                          {department.description}
                        </Text>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                        <Ionicons name="people" size={16} color={theme.textSecondary} />
                        <Text style={dynamicStyles.departmentMembers}>
                          {department.user_count || department.members_count || 0} сотрудников
                        </Text>
                      </View>

                      {/* Action Buttons Row */}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.1)' },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            (navigation as any).navigate('EditDepartment', { departmentId: department.id });
                          }}
                        >
                          <Ionicons name="create-outline" size={18} color={theme.primary} />
                          <Text style={[styles.actionButtonText, { color: theme.primary }]}>Редактировать</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.1)' },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteDepartment(department);
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Удалить</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
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
    padding: 32,
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
  departmentContent: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
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
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    letterSpacing: -0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
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

export default DepartmentsDesktopContent;
