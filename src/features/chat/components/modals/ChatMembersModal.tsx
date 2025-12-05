/**
 * Chat Members Modal
 * Модальное окно для просмотра и добавления участников чата
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  SectionList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { User } from '../../../../types/user.types';
import { ChatMember } from '../../types/chat.types';
import { getChatMembers, addChatMembers, updateChatMemberRole } from '../../api/chat.api';
import { getUsers } from '@api/user.api';
import { isMockMode, mockGetUsers } from '@shared/utils/mockData';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import { ConfirmDialog } from '@shared/components/common/ConfirmDialog';
import Avatar from '@shared/components/common/Avatar';

interface ChatMembersModalProps {
  visible: boolean;
  chatId: number;
  onClose: () => void;
  isCreator?: boolean;
  creatorId?: number;
}

export const ChatMembersModal: React.FC<ChatMembersModalProps> = ({
  visible,
  chatId,
  onClose,
  isCreator = false,
  creatorId,
}) => {
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.user);
  const removeChatMember = useChatStore((state) => state.removeChatMember);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<{ id: number; name: string } | null>(null);
  const [showRoleChangeDialog, setShowRoleChangeDialog] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState<{ userId: number; userName: string; currentRole: string; newRole: string } | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ userId: number; userName: string; role: string } | null>(null);

  useEffect(() => {
    if (visible) {
      loadMembers();
    }
  }, [visible, chatId]);

  // Определяем роль текущего пользователя в чате
  const currentUserRole = members.find(m => m.user_id === currentUser?.id)?.role;
  const isAdmin = currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';
  const canManageMembers = isOwner || isAdmin;

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const chatMembers = await getChatMembers(chatId);

      // Загружаем информацию о пользователях
      if (chatMembers && chatMembers.length > 0) {
        // Получаем список всех пользователей (только активные)
        let allUsersList: User[] = [];
        if (isMockMode()) {
          allUsersList = await mockGetUsers();
        } else {
          const response = await getUsers({ is_active: true }, { limit: 100, offset: 0 });
          allUsersList = response.data || [];
        }

        // Добавляем информацию о пользователях к членам чата
        const membersWithUsers = chatMembers.map((member) => ({
          ...member,
          user: allUsersList.find((u) => u.id === member.user_id),
        }));

        setMembers(membersWithUsers);
      } else {
        setMembers(chatMembers || []);
      }
    } catch (error: any) {
      console.error('Failed to load members:', error);
      showError('Не удалось загрузить список участников');
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      setIsLoading(true);

      let usersList: User[] = [];
      if (isMockMode()) {
        usersList = await mockGetUsers();
      } else {
        // Загружаем всех активных пользователей для добавления в чат (без фильтра for_task_assignment)
        const response = await getUsers({ is_active: true }, { limit: 100, offset: 0 });
        usersList = response.data || [];
      }

      // Фильтруем пользователей, которые уже в чате
      // Обычные сотрудники не должны видеть администраторов
      const memberIds = (members || []).map((m) => m.user_id);
      const currentUser = useAuthStore.getState().user;
      const availableUsers = (usersList || []).filter((u) => {
        // Исключаем пользователей уже в чате
        if (memberIds.includes(u.id)) return false;

        // Если текущий пользователь - обычный сотрудник, исключаем администраторов
        if (currentUser?.role === 'employee') {
          if (u.role === 'admin' || u.role === 'super_admin') return false;
        }

        return true;
      });

      // Sort users: department heads first, then others
      availableUsers.sort((a, b) => {
        const aIsDeptHead = a.role === 'department_head';
        const bIsDeptHead = b.role === 'department_head';

        if (aIsDeptHead && !bIsDeptHead) return -1;
        if (!aIsDeptHead && bIsDeptHead) return 1;

        // If both are dept heads or both are not, sort by name
        return a.name.localeCompare(b.name);
      });

      setAllUsers(availableUsers);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      showError('Не удалось загрузить список пользователей');
      setAllUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMode = () => {
    setIsAddingMode(true);
    loadAllUsers();
  };

  const handleCancelAdd = () => {
    setIsAddingMode(false);
    setSelectedUsers([]);
    setSearchQuery('');
  };

  const toggleUserSelection = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const toggleDepartmentSelection = (departmentUsers: User[]) => {
    const departmentUserIds = departmentUsers.map(u => u.id);
    // Проверяем, все ли пользователи отдела уже выбраны
    const allSelected = departmentUserIds.every(id => selectedUsers.includes(id));

    if (allSelected) {
      // Снимаем выбор со всех пользователей отдела
      setSelectedUsers(selectedUsers.filter(id => !departmentUserIds.includes(id)));
    } else {
      // Добавляем всех пользователей отдела (избегая дублирования)
      const newSelectedUsers = [...selectedUsers];
      departmentUserIds.forEach(id => {
        if (!newSelectedUsers.includes(id)) {
          newSelectedUsers.push(id);
        }
      });
      setSelectedUsers(newSelectedUsers);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      showError('Выберите хотя бы одного участника');
      return;
    }

    try {
      setIsAdding(true);

      // API ожидает отдельный запрос для каждого пользователя
      // Формат: { user_id: number, role: "member" }
      const addPromises = selectedUsers.map(async (userId) => {
        const response = await addChatMembers(chatId, {
          user_id: userId,
          role: 'member',
        } as any);
        return response;
      });

      await Promise.all(addPromises);

      showSuccess(`Добавлено участников: ${selectedUsers.length}`);
      handleCancelAdd();
      loadMembers();
    } catch (error: any) {
      console.error('Failed to add members:', error);
      showError(error.message || 'Не удалось добавить участников');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = (userId: number, userName: string) => {
    setUserToRemove({ id: userId, name: userName });
    setShowRemoveDialog(true);
  };

  const confirmRemoveMember = async () => {
    if (!userToRemove) return;

    try {
      await removeChatMember(chatId, userToRemove.id);
      setShowRemoveDialog(false);
      setUserToRemove(null);
      loadMembers();
    } catch (error: any) {
      console.error('❌ Failed to remove member:', error);
      setShowRemoveDialog(false);
      setUserToRemove(null);
    }
  };

  const cancelRemoveMember = () => {
    setShowRemoveDialog(false);
    setUserToRemove(null);
  };

  const handleToggleAdmin = (userId: number, userName: string, currentRole: string) => {

    const newRole = currentRole === 'admin' ? 'member' : 'admin';

    setRoleChangeData({ userId, userName, currentRole, newRole });
    setShowRoleChangeDialog(true);
  };

  const confirmRoleChange = async () => {
    if (!roleChangeData) return;

    try {
      await updateChatMemberRole(chatId, roleChangeData.userId, roleChangeData.newRole as 'admin' | 'member');
      setShowRoleChangeDialog(false);
      setRoleChangeData(null);
      loadMembers();
    } catch (error: any) {
      console.error('❌ Failed to update role:', error);
      // Показываем ошибку через диалог или просто закрываем
      setShowRoleChangeDialog(false);
      setRoleChangeData(null);
      // В идеале нужно показать error toast или другой способ уведомления
    }
  };

  const cancelRoleChange = () => {
    setShowRoleChangeDialog(false);
    setRoleChangeData(null);
  };

  const handleOpenActionMenu = (userId: number, userName: string, role: string) => {
    setSelectedMember({ userId, userName, role });
    setShowActionMenu(true);
  };

  const handleCloseActionMenu = () => {
    setShowActionMenu(false);
    setSelectedMember(null);
  };

  const handleMenuAction = (action: 'changeRole' | 'remove') => {
    if (!selectedMember) return;

    handleCloseActionMenu();

    if (action === 'changeRole') {
      handleToggleAdmin(selectedMember.userId, selectedMember.userName, selectedMember.role);
    } else if (action === 'remove') {
      handleRemoveMember(selectedMember.userId, selectedMember.userName);
    }
  };

  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return '#10B981';
      case 'busy':
        return '#EF4444';
      case 'away':
        return '#F59E0B';
      default:
        return '#9CA3AF';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Владелец';
      case 'admin':
        return 'Администратор';
      default:
        return ''; // Don't show label for regular members
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return '#E94444';
      case 'admin':
        return '#F59E0B';
      default:
        return theme.textSecondary;
    }
  };

  const filteredUsers = isAddingMode
    ? (allUsers || []).filter((user) => {
        if (!searchQuery) return true;
        const searchText = `${user.name} ${user.email}`.toLowerCase();
        return searchText.includes(searchQuery.toLowerCase());
      })
    : (members || []);

  // Группируем пользователей по отделам для режима добавления
  const userSections = useMemo(() => {
    if (!isAddingMode) return [];

    const currentUser = useAuthStore.getState().user;
    const currentUserDepartmentId = currentUser?.department_id;

    // Группируем пользователей
    const byDepartment = new Map<number | null, User[]>();

    // filteredUsers в режиме добавления это User[], а не ChatMember[]
    const usersToGroup = filteredUsers as User[];
    usersToGroup.forEach((user) => {
      const deptId = user.department_id || null;
      if (!byDepartment.has(deptId)) {
        byDepartment.set(deptId, []);
      }
      byDepartment.get(deptId)!.push(user);
    });

    // Сортируем пользователей внутри каждого отдела: руководители сначала, потом остальные
    byDepartment.forEach((users) => {
      users.sort((a, b) => {
        const aIsDeptHead = a.role === 'department_head';
        const bIsDeptHead = b.role === 'department_head';

        if (aIsDeptHead && !bIsDeptHead) return -1;
        if (!aIsDeptHead && bIsDeptHead) return 1;

        // Если оба руководители или оба нет, сортируем по имени
        return a.name.localeCompare(b.name);
      });
    });

    const sections: Array<{ title: string; data: User[]; departmentId: number | null }> = [];

    // Сначала добавляем подразделение текущего пользователя
    if (currentUserDepartmentId && byDepartment.has(currentUserDepartmentId)) {
      const users = byDepartment.get(currentUserDepartmentId)!;
      const departmentName = users[0]?.department?.name || 'Мое подразделение';
      sections.push({
        title: departmentName,
        data: users,
        departmentId: currentUserDepartmentId,
      });
      byDepartment.delete(currentUserDepartmentId);
    }

    // Затем добавляем остальные подразделения (с названием)
    const departmentsWithNames: Array<{ id: number; name: string; users: User[] }> = [];
    byDepartment.forEach((users, deptId) => {
      if (deptId !== null) {
        const departmentName = users[0]?.department?.name || `Подразделение ${deptId}`;
        departmentsWithNames.push({ id: deptId, name: departmentName, users });
      }
    });

    // Сортируем по названию
    departmentsWithNames.sort((a, b) => a.name.localeCompare(b.name));
    departmentsWithNames.forEach((dept) => {
      sections.push({
        title: dept.name,
        data: dept.users,
        departmentId: dept.id,
      });
    });

    // В конце добавляем пользователей без подразделения
    if (byDepartment.has(null)) {
      const users = byDepartment.get(null)!;
      sections.push({
        title: 'Без подразделения',
        data: users,
        departmentId: null,
      });
    }

    return sections;
  }, [filteredUsers, isAddingMode]);

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary,
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    closeButton: {},
    headerTitle: {
      color: theme.text,
    },
    addButton: {
      backgroundColor: theme.primary,
    },
    addButtonDisabled: {
      backgroundColor: theme.borderLight,
    },
    memberCount: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    memberCountText: {
      color: theme.textSecondary,
    },
    selectedCount: {
      backgroundColor: theme.primaryLight,
    },
    selectedCountText: {
      color: theme.primary,
    },
    searchContainer: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    searchInput: {
      color: theme.text,
    },
    memberItem: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.borderLight,
    },
    userItem: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.borderLight,
    },
    userItemSelected: {
      backgroundColor: theme.primaryLight,
    },
    avatar: {
      backgroundColor: theme.backgroundTertiary,
    },
    avatarText: {
      color: theme.textSecondary,
    },
    statusDot: {},
    memberName: {
      color: theme.text,
    },
    checkbox: {
      borderColor: theme.border,
    },
    checkboxSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    loadingText: {
      color: theme.textSecondary,
    },
    emptyText: {
      color: theme.textTertiary,
    },
  });

  const renderMemberItem = ({ item }: { item: ChatMember }) => {
    const user = item.user;
    if (!user) return null;

    // Можно удалить участника если:
    // 1. Текущий пользователь - владелец или админ чата
    // 2. Участник не является владельцем чата
    // 3. Участник не является текущим пользователем (нельзя удалить самого себя)
    // 4. Админ не может удалить другого админа (только владелец может)
    const canRemove = canManageMembers &&
      item.user_id !== creatorId &&
      currentUser &&
      item.user_id !== currentUser.id &&
      !(isAdmin && item.role === 'admin'); // Админ не может удалить другого админа

    // Можно изменить роль участника если:
    // 1. Текущий пользователь - владелец или админ чата
    // 2. Участник не является владельцем чата
    // 3. Участник не является текущим пользователем
    // 4. Админ не может изменить роль другого админа (только владелец может)
    const canChangeRole = canManageMembers &&
      item.role !== 'owner' &&
      currentUser &&
      item.user_id !== currentUser.id &&
      !(isAdmin && item.role === 'admin'); // Админ не может изменить роль другого админа

    return (
      <View style={[styles.memberItem, dynamicStyles.memberItem]}>
        <View style={styles.memberInfo}>
          <Avatar
            name={user.name}
            imageUrl={user.avatar}
            size={44}
            status={user.status}
            showStatus={true}
          />
          <View style={styles.memberDetails}>
            <View style={styles.memberNameRow}>
              <Text style={[styles.memberName, dynamicStyles.memberName]} numberOfLines={1}>
                {user.name}
              </Text>
              {user.role === 'department_head' && (
                <Ionicons name="shield-checkmark" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />
              )}
            </View>
            {/* Роль участника в чате как текст под именем с цветовым акцентом */}
            <Text style={[styles.memberRole, { color: getRoleColor(item.role) }]}>
              {getRoleLabel(item.role)}
            </Text>
          </View>
        </View>
        {/* Кнопка меню действий - показывается если можно изменить роль или удалить */}
        {(canChangeRole || canRemove) && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleOpenActionMenu(item.user_id, user.name, item.role)}
            style={styles.menuButton}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.userItem, dynamicStyles.userItem, isSelected && [styles.userItemSelected, dynamicStyles.userItemSelected]]}
        onPress={() => toggleUserSelection(item.id)}
      >
        <View style={styles.memberInfo}>
          <Avatar
            name={item.name}
            imageUrl={item.avatar}
            size={44}
            status={item.status}
            showStatus={true}
          />
          <View style={styles.memberDetails}>
            <View style={styles.memberNameRow}>
              <Text style={[styles.memberName, dynamicStyles.memberName]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.role === 'department_head' && (
                <Ionicons name="shield-checkmark" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />
              )}
            </View>
          </View>
        </View>
        <View style={[styles.checkbox, dynamicStyles.checkbox, isSelected && [styles.checkboxSelected, dynamicStyles.checkboxSelected]]}>
          {isSelected && <Ionicons name="checkmark" size={18} color="white" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, dynamicStyles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          {isAddingMode ? (
            <TouchableOpacity onPress={handleCancelAdd} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          )}
          <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>
            {isAddingMode ? 'Добавить участников' : 'Участники чата'}
          </Text>
          {isAddingMode ? (
            <TouchableOpacity
              onPress={handleAddMembers}
              disabled={isAdding || selectedUsers.length === 0}
              style={[
                styles.addButton,
                dynamicStyles.addButton,
                selectedUsers.length === 0 && [styles.addButtonDisabled, dynamicStyles.addButtonDisabled],
              ]}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.addButtonText}>Добавить</Text>
              )}
            </TouchableOpacity>
          ) : (
            canManageMembers && (
              <TouchableOpacity onPress={handleAddMode} style={styles.addIconButton}>
                <Ionicons name="person-add" size={24} color={theme.primary} />
              </TouchableOpacity>
            )
          )}
        </View>

        {/* Member count or selected count */}
        {isAddingMode ? (
          selectedUsers.length > 0 && (
            <View style={[styles.selectedCount, dynamicStyles.selectedCount]}>
              <Ionicons name="people" size={20} color={theme.primary} />
              <Text style={[styles.selectedCountText, dynamicStyles.selectedCountText]}>Выбрано: {selectedUsers.length}</Text>
            </View>
          )
        ) : (
          <View style={[styles.memberCount, dynamicStyles.memberCount]}>
            <Ionicons name="people" size={20} color={theme.textSecondary} />
            <Text style={[styles.memberCountText, dynamicStyles.memberCountText]}>
              {members?.length || 0} {(members?.length || 0) === 1 ? 'участник' : 'участников'}
            </Text>
          </View>
        )}

        {/* Search */}
        {isAddingMode && (
          <View style={[styles.searchContainer, dynamicStyles.searchContainer]}>
            <Ionicons name="search" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, dynamicStyles.searchInput]}
              placeholder="Поиск пользователей..."
              placeholderTextColor={theme.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, dynamicStyles.loadingText]}>Загрузка...</Text>
          </View>
        ) : isAddingMode ? (
          <SectionList
            sections={userSections}
            keyExtractor={(item) => `user-${item.id}`}
            renderItem={renderUserItem}
            renderSectionHeader={({ section }) => {
              const departmentUserIds = section.data.map(u => u.id);
              const allSelected = departmentUserIds.every(id => selectedUsers.includes(id));
              const someSelected = departmentUserIds.some(id => selectedUsers.includes(id)) && !allSelected;

              return (
                <TouchableOpacity
                  style={[styles.sectionHeaderContainer, { backgroundColor: theme.backgroundTertiary }]}
                  onPress={() => toggleDepartmentSelection(section.data)}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[
                      styles.sectionCheckbox,
                      { borderColor: theme.border },
                      allSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                      someSelected && { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                    ]}>
                      {allSelected && <Ionicons name="checkmark" size={14} color="white" />}
                      {someSelected && <View style={styles.partialCheckmark} />}
                    </View>
                    <Text style={[styles.sectionHeaderText, { color: theme.text }]}>{section.title}</Text>
                  </View>
                  <Text style={[styles.sectionHeaderCount, { color: theme.textSecondary }]}>
                    {section.data.length} {section.data.length === 1 ? 'пользователь' : 'пользователей'}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={true}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={theme.borderLight} />
                <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
                  Нет пользователей для добавления
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={filteredUsers as ChatMember[]}
            keyExtractor={(item) => `member-${item.id}`}
            renderItem={renderMemberItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={theme.borderLight} />
                <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
                  Нет участников
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Confirm remove dialog */}
      <ConfirmDialog
        visible={showRemoveDialog}
        title="Удалить участника"
        message={`Вы уверены, что хотите удалить ${userToRemove?.name} из чата?`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmRemoveMember}
        onCancel={cancelRemoveMember}
        destructive={true}
      />

      {/* Confirm role change dialog */}
      <ConfirmDialog
        visible={showRoleChangeDialog}
        title="Изменить роль"
        message={
          roleChangeData
            ? `Вы уверены, что хотите ${
                roleChangeData.newRole === 'admin' ? 'назначить администратором' : 'снять права администратора'
              } для ${roleChangeData.userName}?`
            : ''
        }
        confirmText="Подтвердить"
        cancelText="Отмена"
        onConfirm={confirmRoleChange}
        onCancel={cancelRoleChange}
        destructive={false}
      />

      {/* Action menu modal */}
      <Modal
        visible={showActionMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseActionMenu}
      >
        <TouchableOpacity
          style={styles.actionMenuOverlay}
          activeOpacity={1}
          onPress={handleCloseActionMenu}
        >
          <View style={[styles.actionMenuContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.actionMenuHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.actionMenuTitle, { color: theme.text }]}>
                {selectedMember?.userName}
              </Text>
            </View>

            {/* Change role option */}
            {canManageMembers && selectedMember?.role !== 'owner' && !(isAdmin && selectedMember?.role === 'admin') && (
              <TouchableOpacity
                style={[styles.actionMenuItem, { borderBottomColor: theme.borderLight }]}
                onPress={() => handleMenuAction('changeRole')}
              >
                <Ionicons
                  name="swap-horizontal"
                  size={20}
                  color={theme.primary}
                  style={styles.actionMenuIcon}
                />
                <Text style={[styles.actionMenuItemText, { color: theme.text }]}>
                  {selectedMember?.role === 'admin' ? 'Снять права администратора' : 'Назначить администратором'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Remove option */}
            {canManageMembers && selectedMember?.userId !== creatorId && selectedMember?.userId !== currentUser?.id && !(isAdmin && selectedMember?.role === 'admin') && (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => handleMenuAction('remove')}
              >
                <Ionicons
                  name="person-remove"
                  size={20}
                  color={theme.error || '#FF3B30'}
                  style={styles.actionMenuIcon}
                />
                <Text style={[styles.actionMenuItemText, { color: theme.error || '#FF3B30' }]}>
                  Удалить из чата
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionMenuCancelButton, { borderTopColor: theme.border }]}
              onPress={handleCloseActionMenu}
            >
              <Text style={[styles.actionMenuCancelText, { color: theme.textSecondary }]}>
                Отмена
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  addIconButton: {
    padding: 4,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCount: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 120,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 13,
    marginTop: 2,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionMenuContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionMenuHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  actionMenuTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  actionMenuIcon: {
    marginRight: 12,
  },
  actionMenuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionMenuCancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  actionMenuCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partialCheckmark: {
    width: 10,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeaderCount: {
    fontSize: 12,
  },
});
