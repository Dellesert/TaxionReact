import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import * as userApi from '@api/user.api';
import { Department, User } from '@/types/user.types';
import { Avatar } from '@shared/components/common/Avatar';
import UserSelectorModal from '@shared/components/common/UserSelectorModal';
import { AdminStackParamList } from '@navigation/types';

type EditDepartmentRouteProp = RouteProp<AdminStackParamList, 'EditDepartment'>;

const EditDepartmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EditDepartmentRouteProp>();
  const { theme } = useTheme();
  const { showError, showSuccess } = useNotification();
  const { showConfirm } = useActionModal();
  const { departmentId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [departmentUsers, setDepartmentUsers] = useState<User[]>([]);

  const [name, setName] = useState('');
  const [headId, setHeadId] = useState<number | undefined>();
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, [departmentId]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load department details
      const dept = await userApi.getDepartment(departmentId);
      setDepartment(dept);
      setName(dept.name);
      setHeadId(dept.head_id);

      // Load department users
      const users = await userApi.getDepartmentUsers(departmentId);

      // Ensure we always have an array
      if (Array.isArray(users)) {
        setDepartmentUsers(users);
      } else {
        console.warn('getDepartmentUsers did not return an array:', users);
        setDepartmentUsers([]);
      }
    } catch (error: any) {
      console.error('Failed to load department:', error);
      showError('Не удалось загрузить данные отдела');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Введите название отдела');
      return;
    }

    try {
      setIsSaving(true);
      await userApi.updateDepartment(departmentId, {
        name: name.trim(),
        head_id: headId,
      });

      showSuccess('Отдел обновлен');
      navigation.goBack();
    } catch (error: any) {
      console.error('Failed to update department:', error);
      showError('Не удалось обновить отдел');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUsers = async (selectedUserIds: number[]) => {
    try {
      // Update each selected user's department
      for (const userId of selectedUserIds) {
        await userApi.updateUser(userId, { department_id: departmentId });
      }

      showSuccess('Пользователи добавлены в отдел');
      loadData(); // Reload data
    } catch (error: any) {
      console.error('Failed to add users:', error);
      showError('Не удалось добавить пользователей');
    }
  };

  const handleRemoveUser = async (user: User) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Вы уверены, что хотите удалить "${user.name}" из отдела?`);
      if (!confirmed) return;
    } else {
      const confirmed = await new Promise<boolean>((resolve) => {
        showConfirm(
          'Удалить из отдела',
          `Вы уверены, что хотите удалить "${user.name}" из отдела?`,
          () => resolve(true),
          () => resolve(false),
          { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
        );
      });
      if (!confirmed) return;
    }

    try {
      await userApi.updateUser(user.id, { department_id: 0 });
      showSuccess('Пользователь удален из отдела');
      loadData();
    } catch (error: any) {
      console.error('Failed to remove user:', error);
      console.error('Error details:', error.response?.data || error.message);
      const errorMessage = `Не удалось удалить пользователя: ${error.response?.data?.error || error.message}`;
      showError(errorMessage);
    }
  };

  const handleSetHead = async (user: User) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Назначить "${user.name}" руководителем отдела?`);
      if (!confirmed) return;
    } else {
      const confirmed = await new Promise<boolean>((resolve) => {
        showConfirm(
          'Назначить руководителем',
          `Назначить "${user.name}" руководителем отдела?`,
          () => resolve(true),
          () => resolve(false),
          { confirmText: 'Назначить', cancelText: 'Отмена' }
        );
      });
      if (!confirmed) return;
    }

    try {
      setHeadId(user.id);
      await userApi.updateDepartment(departmentId, {
        name: name.trim(),
        head_id: user.id,
      });
      showSuccess('Руководитель назначен');
      loadData();
    } catch (error: any) {
      console.error('Failed to set head:', error);
      showError('Не удалось назначить руководителя');
      loadData(); // Reload to reset state
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.card }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.card }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Редактирование отдела</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={[styles.saveButton, { opacity: isSaving ? 0.5 : 1 }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons name="checkmark" size={24} color={theme.primary} />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Department Info */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Информация об отделе</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Название *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                value={name}
                onChangeText={setName}
                placeholder="Название отдела"
                placeholderTextColor={theme.textTertiary}
              />
            </View>
          </View>

          {/* Department Members */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Сотрудники ({departmentUsers?.length || 0})
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowUserSelector(true)}
              >
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={styles.addButtonText}>Добавить</Text>
              </TouchableOpacity>
            </View>

            {!departmentUsers || !Array.isArray(departmentUsers) || departmentUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Нет сотрудников в отделе
                </Text>
              </View>
            ) : (
              departmentUsers.map((user) => (
                <View
                  key={user.id}
                  style={[styles.userCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                >
                  <Avatar imageUrl={user.avatar} name={user.name} size={40} />
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
                      {headId === user.id && (
                        <View style={[styles.headBadge, { backgroundColor: theme.primary + '20' }]}>
                          <Text style={[styles.headBadgeText, { color: theme.primary }]}>
                            Руководитель
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{user.email}</Text>
                    {user.position && (
                      <Text style={[styles.userPosition, { color: theme.textTertiary }]}>{user.position}</Text>
                    )}
                  </View>
                  <View style={styles.userActions}>
                    {headId !== user.id && (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: theme.backgroundTertiary }]}
                        onPress={() => handleSetHead(user)}
                      >
                        <Ionicons name="star-outline" size={18} color={theme.primary} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.backgroundTertiary }]}
                      onPress={() => handleRemoveUser(user)}
                    >
                      <Ionicons name="close" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* User Selector Modal */}
        <UserSelectorModal
          visible={showUserSelector}
          onClose={() => {
            if (selectedUserIds.length > 0) {
              handleAddUsers(selectedUserIds);
            }
            setShowUserSelector(false);
            setSelectedUserIds([]);
          }}
          selectedUserIds={selectedUserIds}
          onSelectionChange={setSelectedUserIds}
          title="Добавить сотрудников"
          multiSelect={true}
          excludeUserIds={Array.isArray(departmentUsers) ? departmentUsers.map(u => u.id) : []}
        />
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
  saveButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
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
    fontSize: 15,
    fontWeight: '600',
  },
  headBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  headBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  userPosition: {
    fontSize: 12,
    marginTop: 2,
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
});

export default EditDepartmentScreen;
