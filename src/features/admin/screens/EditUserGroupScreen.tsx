import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { TitleBarBackButton } from '@features/tasks/components/common/TitleBarBackButton';

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
  const isDesktop = useIsWideScreen();

  const menuButtonRef = useRef<View>(null);

  const handleSave = useCallback(async () => {
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
  }, [name, description, groupId, navigation, showError, showSuccess]);

  const titleBarLeftControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return <TitleBarBackButton onGoBack={() => navigation.goBack()} />;
  }, [isElectron, isDesktop, navigation]);

  const titleBarRightControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {/* Add members button */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            height: 28,
            paddingHorizontal: 10,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: theme.border,
            cursor: 'pointer',
            // @ts-ignore
            transition: 'background-color 0.15s ease',
          }}
          // @ts-ignore - Web-only event handlers
          onClick={() => setShowUserSelector(true)}
          onMouseEnter={(e: any) => {
            if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Ionicons name="add" size={14} color={theme.primary} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.primary }}>Добавить</Text>
        </View>
        {/* Save button */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            height: 28,
            paddingHorizontal: 10,
            borderRadius: 6,
            backgroundColor: isSaving ? theme.primary + '80' : theme.primary,
            cursor: 'pointer',
            // @ts-ignore
            transition: 'opacity 0.15s ease',
          }}
          // @ts-ignore - Web-only event handlers
          onClick={isSaving ? undefined : handleSave}
          onMouseEnter={(e: any) => {
            if (!isSaving && e.currentTarget?.style) e.currentTarget.style.opacity = '0.85';
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) e.currentTarget.style.opacity = '1';
          }}
        >
          {isSaving ? (
            <ActivityIndicator size={12} color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>Сохранить</Text>
            </>
          )}
        </View>
        {/* Menu button */}
        <View
          // @ts-ignore - ref type
          ref={menuButtonRef}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.border,
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            // @ts-ignore
            transition: 'background-color 0.15s ease',
          }}
          // @ts-ignore - Web-only event handlers
          onClick={() => setShowActionMenu(true)}
          onMouseEnter={(e: any) => {
            if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={14} color={theme.text} />
        </View>
      </View>
    );
  }, [isElectron, isDesktop, theme, isSaving, handleSave]);

  useTitleBarControlsIntegration({
    pageTitle: 'Редактирование группы',
    leftControls: titleBarLeftControls,
    rightControls: titleBarRightControls,
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
        {/* Header - hide on Electron desktop since controls are in TitleBar */}
        {!(isElectron && isDesktop) && (
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
        )}

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            { paddingBottom: 120 },
            isElectron && isDesktop && styles.desktopScrollContent,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Group Info */}
          <View style={[
            styles.section,
            !isDesktop && { backgroundColor: theme.card },
            isElectron && isDesktop && [styles.desktopCard, { backgroundColor: theme.card, borderColor: theme.border }],
          ]}>
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
          <View style={[
            styles.section,
            !isDesktop && { backgroundColor: theme.card },
            isElectron && isDesktop && [styles.desktopCard, { backgroundColor: theme.card, borderColor: theme.border }],
          ]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Участники ({members?.length || 0})
              </Text>
              {!(isElectron && isDesktop) && (
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: theme.primary }]}
                  onPress={() => setShowUserSelector(true)}
                >
                  <Ionicons name="add" size={20} color="#FFF" />
                  <Text style={styles.addButtonText}>Добавить</Text>
                </TouchableOpacity>
              )}
            </View>

            {!members || members.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={theme.textTertiary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  Нет участников в группе
                </Text>
              </View>
            ) : isElectron && isDesktop ? (
              /* Desktop table view */
              <View>
                {/* Table header */}
                <View style={[styles.tableRow, styles.tableHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 2 }]}>Сотрудник</Text>
                  <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 2 }]}>Email</Text>
                  <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 1.5 }]}>Должность</Text>
                  <Text style={[styles.tableHeaderText, { color: theme.textSecondary, flex: 1.5 }]}>Отдел</Text>
                  <View style={{ width: 40 }} />
                </View>
                {/* Table rows */}
                {members.map((member, index) => (
                  <View
                    key={member.id}
                    style={[
                      styles.tableRow,
                      index < members.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                    ]}
                    // @ts-ignore - Web-only event handlers
                    onMouseEnter={(e: any) => {
                      if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.backgroundSecondary;
                    }}
                    onMouseLeave={(e: any) => {
                      if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <View style={[styles.tableCellUser, { flex: 2 }]}>
                      <Avatar imageUrl={member.avatar} name={member.name} size={32} />
                      <View style={styles.userNameRow}>
                        <Text style={[styles.tableCellText, { color: theme.text, fontWeight: '500' }]}>{member.name}</Text>
                        {member.role === 'department_head' && (
                          <Ionicons name="shield-checkmark" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />
                        )}
                        {member.role === 'admin' && (
                          <Ionicons name="shield" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                    </View>
                    <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 2 }]}>{member.email}</Text>
                    <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 1.5 }]}>{member.position || '—'}</Text>
                    <Text style={[styles.tableCellText, { color: theme.textSecondary, flex: 1.5 }]}>{member.department?.name || '—'}</Text>
                    <View style={{ width: 40, alignItems: 'center' }}>
                      <TouchableOpacity
                        style={[styles.tableRemoveButton, { backgroundColor: theme.backgroundTertiary }]}
                        onPress={() => handleRemoveUser(member)}
                      >
                        <Ionicons name="close" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              members.map((member) => (
                <View
                  key={member.id}
                  style={[styles.userCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                >
                  <Avatar imageUrl={member.avatar} name={member.name} size={40} />
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={[styles.userName, { color: theme.text }]}>{member.name}</Text>
                      {member.role === 'department_head' && (
                        <Ionicons name="shield-checkmark" size={16} color="#F59E0B" style={{ marginLeft: 6 }} />
                      )}
                      {member.role === 'admin' && (
                        <Ionicons name="shield" size={16} color="#3B82F6" style={{ marginLeft: 6 }} />
                      )}
                    </View>
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
          isDesktop={isElectron && isDesktop}
          buttonPosition={
            menuButtonRef.current
              // @ts-ignore - Web-only method
              ? menuButtonRef.current.getBoundingClientRect?.() ?? undefined
              : undefined
          }
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
          includeCurrentUser={true}
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
  desktopScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  desktopCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden' as const,
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
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
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
  tableRemoveButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EditUserGroupScreen;
