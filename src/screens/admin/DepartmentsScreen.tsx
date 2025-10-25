import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import * as userApi from '@api/user.api';
import { Department } from '@/types/user.types';

const DepartmentsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Check admin access
  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color="#EF4444" />
          <Text style={styles.noAccessTitle}>Нет доступа</Text>
          <Text style={styles.noAccessText}>
            Только администраторы могут управлять отделами
          </Text>
        </View>
      </SafeAreaView>
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
      console.error('Error details:', error.response?.data || error.message);
      Alert.alert('Ошибка', `Не удалось загрузить список отделов: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) {
      if (Platform.OS === 'web') {
        alert('Введите название отдела');
      } else {
        Alert.alert('Ошибка', 'Введите название отдела');
      }
      return;
    }

    try {
      setIsCreating(true);
      await userApi.createDepartment({
        name: newDepartmentName.trim(),
      });

      setNewDepartmentName('');
      setShowCreateModal(false);
      if (Platform.OS === 'web') {
        alert('Отдел создан');
      } else {
        Alert.alert('Успех', 'Отдел создан');
      }
      loadDepartments();
    } catch (error: any) {
      console.error('Failed to create department:', error);
      if (Platform.OS === 'web') {
        alert('Не удалось создать отдел');
      } else {
        Alert.alert('Ошибка', 'Не удалось создать отдел');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDepartment = async (department: Department) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Вы уверены, что хотите удалить отдел "${department.name}"?`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Удаление отдела',
            `Вы уверены, что хотите удалить отдел "${department.name}"?`,
            [
              { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'Удалить',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]
          );
        });

    if (!confirmed) return;

    try {
      await userApi.deleteDepartment(department.id);
      if (Platform.OS === 'web') {
        alert('Отдел удален');
      } else {
        Alert.alert('Успех', 'Отдел удален');
      }
      loadDepartments();
    } catch (error: any) {
      console.error('Failed to delete department:', error);
      if (Platform.OS === 'web') {
        alert('Не удалось удалить отдел');
      } else {
        Alert.alert('Ошибка', 'Не удалось удалить отдел');
      }
    }
  };

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.card }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile' as any)}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Управление отделами</Text>
          <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
            <Ionicons name="add" size={28} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Поиск отделов..."
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

        {/* Create Modal */}
        {showCreateModal && (
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modal, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Создать отдел</Text>

              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
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
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {filteredDepartments.map((department) => (
              <TouchableOpacity
                key={department.id}
                style={[styles.departmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => {
                  (navigation as any).navigate('EditDepartment', { departmentId: department.id });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.departmentHeader}>
                  <View style={styles.departmentInfo}>
                    <Text style={[styles.departmentName, { color: theme.text }]}>
                      {department.name}
                    </Text>
                    {department.description && (
                      <Text style={[styles.departmentDescription, { color: theme.textSecondary }]}>
                        {department.description}
                      </Text>
                    )}
                    <Text style={[styles.departmentMembers, { color: theme.textTertiary }]}>
                      Сотрудников: {department.user_count || department.members_count || 0}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteDepartment(department);
                    }}
                  >
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
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
  departmentCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  departmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  departmentInfo: {
    flex: 1,
  },
  departmentName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  departmentDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  departmentMembers: {
    fontSize: 13,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
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

export default DepartmentsScreen;
