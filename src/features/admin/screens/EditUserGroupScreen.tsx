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
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { getUserGroup, updateUserGroup, updateUserGroupMembers, deleteUserGroup } from '@api/user-group.api';
import { ActionMenu } from '@shared/components/common/ActionMenu';
import { User } from '@/types/user.types';
import { Avatar } from '@shared/components/common/Avatar';
import UserSelectorModal from '@shared/components/common/UserSelectorModal';
import { AdminStackParamList } from '@navigation/types';

type EditUserGroupRouteProp = RouteProp<AdminStackParamList, 'EditUserGroup'>;

const EditUserGroupScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EditUserGroupRouteProp>();
  const { theme, isDark } = useTheme();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );
  const { showError, showSuccess } = useNotification();
  const { showConfirm } = useActionModal();
  const { groupId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<User[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.electron;

  // Clear TitleBar controls when editing user group
  useTitleBarControlsIntegration({
    pageTitle: 'Редактирование группы',
    leftControls: null,
    rightControls: null,
    enabled: isElectron,
  });

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const group = await getUserGroup(groupId);
      setName(group.name);
      setDescription(group.description || '');

      if (Array.isArray(group.members)) {
        setMembers(group.members);
      } else {
        setMembers([]);
      }
    } catch (error: any) {
      console.error('Failed to load group:', error);
      showError('Не удалось загрузить данные группы');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Введите название группы');
      return;
    }

    try {
      setIsSaving(true);
      await updateUserGroup(groupId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      showSuccess('Группа обновлена');
      navigation.goBack();
    } catch (error: any) {
      console.error('Failed to update group:', error);
      showError('Не удалось обновить группу');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUsers = async (newUserIds: number[]) => {
    try {
      const currentIds = members.map(m => m.id);
      const allIds = [...new Set([...currentIds, ...newUserIds])];
      await updateUserGroupMembers(groupId, { user_ids: allIds });
      showSuccess('Участники добавлены');
      loadData();
    } catch (error: any) {
      console.error('Failed to add members:', error);
      showError('Не удалось добавить участников');
    }
  };

  const handleRemoveUser = async (user: User) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Вы уверены, что хотите удалить "${user.name}" из группы?`);
      if (!confirmed) return;
    } else {
      const confirmed = await new Promise<boolean>((resolve) => {
        showConfirm(
          'Удалить из группы',
          `Вы уверены, что хотите удалить "${user.name}" из группы?`,
          () => resolve(true),
          () => resolve(false),
          { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
        );
      });
      if (!confirmed) return;
    }

    try {
      const remainingIds = members.filter(m => m.id !== user.id).map(m => m.id);
      await updateUserGroupMembers(groupId, { user_ids: remainingIds });
      showSuccess('Участник удалён из группы');
      loadData();
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      showError('Не удалось удалить участника');
    }
  };

  const handleDeleteGroup = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Вы уверены, что хотите удалить группу "${name}"?`);
      if (!confirmed) return;
    } else {
      const confirmed = await new Promise<boolean>((resolve) => {
        showConfirm(
          'Удаление группы',
          `Вы уверены, что хотите удалить группу "${name}"?`,
          () => resolve(true),
          () => resolve(false),
          { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
        );
      });
      if (!confirmed) return;
    }

    try {
      setIsDeleting(true);
      await deleteUserGroup(groupId);
      showSuccess('Группа удалена');
      navigation.goBack();
    } catch (error: any) {
      console.error('Failed to delete group:', error);
      showError('Не удалось удалить группу');
    } finally {
      setIsDeleting(false);
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
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Редактирование группы</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={{ opacity: isSaving ? 0.5 : 1 }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="checkmark" size={24} color={theme.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowActionMenu(true)}
              style={{ padding: 4 }}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Group Info */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Информация о группе</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Название *</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                value={name}
                onChangeText={setName}
                placeholder="Название группы"
                placeholderTextColor={theme.textTertiary}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Описание</Text>
              <TextInput
                style={[styles.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Описание группы (необязательно)"
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Group Members */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Участники ({members?.length || 0})
              </Text>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowUserSelector(true)}
              >
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={styles.addButtonText}>Добавить</Text>
              </TouchableOpacity>
            </View>

            {!members || members.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Нет участников в группе
                </Text>
              </View>
            ) : (
              members.map((member) => (
                <View
                  key={member.id}
                  style={[styles.userCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                >
                  <Avatar imageUrl={member.avatar} name={member.name} size={40} />
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.text }]}>{member.name}</Text>
                    <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{member.email}</Text>
                    {member.position && (
                      <Text style={[styles.userPosition, { color: theme.textTertiary }]}>{member.position}</Text>
                    )}
                    {member.department?.name && (
                      <Text style={[styles.userDepartment, { color: theme.textTertiary }]}>
                        {member.department.name}
                      </Text>
                    )}
                  </View>
                  <View style={styles.userActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: theme.backgroundTertiary }]}
                      onPress={() => handleRemoveUser(member)}
                    >
                      <Ionicons name="close" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Action Menu */}
        <ActionMenu
          visible={showActionMenu}
          onClose={() => setShowActionMenu(false)}
          items={[
            {
              key: 'delete',
              icon: 'trash-outline',
              label: 'Удалить группу',
              color: '#EF4444',
              onPress: handleDeleteGroup,
              disabled: isDeleting,
            },
          ]}
        />

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
          title="Добавить участников"
          multiSelect={true}
          excludeUserIds={Array.isArray(members) ? members.map(u => u.id) : []}
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
  userName: {
    fontSize: 15,
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
  userDepartment: {
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

export default EditUserGroupScreen;
