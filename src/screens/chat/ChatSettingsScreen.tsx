/**
 * Chat Settings Screen
 * Экран настроек чата
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ChatStackParamList } from '@navigation/types';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { InputDialog } from '@components/common/InputDialog';
import { ActionSheet, ActionSheetOption } from '@components/common/ActionSheet';
import { fileApi } from '@api/fileApi';
import { Avatar } from '@components/common/Avatar';
import { User, ChatMember } from '@/types/user.types';
import * as userApi from '@api/user.api';
import * as chatApi from '@api/chat.api';
import UserSelectorModal from '@components/common/UserSelectorModal';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatSettings'>;

const ChatSettingsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { chatId, chatName } = route.params;
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const getChatById = useChatStore((state) => state.getChatById);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const leaveChat = useChatStore((state) => state.leaveChat);
  const updateChat = useChatStore((state) => state.updateChat);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [departmentName, setDepartmentName] = useState<string>('');

  // Members management
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<{ id: number; name: string } | null>(null);
  const [showRoleChangeDialog, setShowRoleChangeDialog] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState<{ userId: number; userName: string; currentRole: string; newRole: string } | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ userId: number; userName: string; role: string } | null>(null);

  const chat = getChatById(chatId);
  const creatorId = chat?.created_by || chat?.creator_id;
  const isCreator = currentUser && creatorId === currentUser.id;

  // Определяем роль текущего пользователя в чате
  const currentUserRole = members.find(m => m.user_id === currentUser?.id)?.role;
  const isAdmin = currentUserRole === 'admin';
  const isOwner = currentUserRole === 'owner';
  const canManageMembers = isOwner || isAdmin;

  // Функция для перевода системной роли на русский
  const getSystemRoleLabel = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'manager':
        return 'Менеджер';
      case 'employee':
        return 'Сотрудник';
      default:
        return role;
    }
  };

  // Функция для перевода роли в чате на русский
  const getChatRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Владелец';
      case 'admin':
        return 'Администратор';
      default:
        return ''; // Don't show label for regular members
    }
  };

  // Цвет роли в чате
  const getChatRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return '#E94444';
      case 'admin':
        return theme.primary;
      default:
        return theme.textSecondary;
    }
  };

  // Функция для форматирования времени последнего посещения
  const getLastSeenText = (status: string, lastActiveAt?: string): string => {
    if (status === 'online') {
      return 'В сети';
    }

    if (!lastActiveAt) {
      return 'Был(а) давно';
    }

    const lastActive = new Date(lastActiveAt);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Только что';
    } else if (diffMins < 60) {
      return `Был(а) ${diffMins} мин. назад`;
    } else if (diffHours < 24) {
      return `Был(а) ${diffHours} ч. назад`;
    } else if (diffDays === 1) {
      return 'Был(а) вчера';
    } else if (diffDays < 7) {
      return `Был(а) ${diffDays} дн. назад`;
    } else {
      return 'Был(а) давно';
    }
  };

  // Загрузка данных собеседника для личного чата
  useEffect(() => {
    const loadOtherUser = async () => {
      console.log('🔍 Loading other user for private chat...', {
        chatType: chat?.type,
        hasMembers: !!chat?.members,
        members: chat?.members,
        currentUserId: currentUser?.id,
      });

      if (chat?.type === 'private' && chat.members && currentUser) {
        // Найти ID собеседника (не текущего пользователя)
        // members - это массив объектов вида {id, chat_id, user_id, role, ...}
        const otherMember = chat.members.find((member: any) => member.user_id !== currentUser.id);
        const otherUserId = otherMember?.user_id;

        console.log('👤 Found other member:', otherMember);
        console.log('👤 Found other user ID:', otherUserId);

        if (otherUserId) {
          try {
            const user = await userApi.getUser(otherUserId);
            console.log('✅ Loaded other user:', user);
            console.log('✅ User department:', user.department);
            console.log('✅ User department_id:', user.department_id);
            setOtherUser(user);

            // Если есть department_id, но нет объекта department, загружаем отдельно
            if (user.department_id && !user.department) {
              try {
                console.log('🏢 Loading department separately:', user.department_id);
                const dept = await userApi.getDepartment(user.department_id);
                console.log('🏢 Department loaded:', dept);
                if (dept && dept.name) {
                  setDepartmentName(dept.name);
                }
              } catch (error) {
                console.error('❌ Failed to load department:', error);
              }
            } else if (user.department?.name) {
              // Если department уже есть в объекте user
              setDepartmentName(user.department.name);
            }
          } catch (error) {
            console.error('❌ Failed to load other user:', error);
          }
        } else {
          console.warn('⚠️ Could not find other user ID in members');
        }
      }
    };

    loadOtherUser();
  }, [chat, currentUser]);

  // Загрузка участников для групповых чатов
  useEffect(() => {
    if (chat?.type === 'group') {
      loadMembers();
    }
  }, [chat?.type, chatId]);

  const loadMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const chatMembers = await chatApi.getChatMembers(chatId);
      console.log('👥 Loaded chat members:', chatMembers);

      // Загружаем информацию о пользователях
      if (chatMembers && chatMembers.length > 0) {
        const userIds = chatMembers.map((m) => m.user_id);
        const usersData = await userApi.getUsers({ ids: userIds }, { limit: 100, offset: 0 });
        const users = usersData.data || [];

        // Объединяем данные участников с данными пользователей
        const membersWithUsers = chatMembers.map((member) => ({
          ...member,
          user: users.find((u) => u.id === member.user_id),
        }));

        setMembers(membersWithUsers);
      } else {
        setMembers([]);
      }
    } catch (error) {
      console.error('❌ Failed to load members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUserIds.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы одного участника');
      return;
    }

    try {
      setIsAddingMembers(true);

      // Добавляем участников по одному
      for (const userId of selectedUserIds) {
        await chatApi.addChatMember(chatId, userId);
      }

      Alert.alert('Успех', 'Участники добавлены');
      setShowAddMembersModal(false);
      setSelectedUserIds([]);

      // Перезагружаем список участников
      await loadMembers();
    } catch (error: any) {
      console.error('❌ Failed to add members:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось добавить участников');
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleRemoveMember = async (userId: number, userName: string) => {
    setUserToRemove({ id: userId, name: userName });
    setShowRemoveDialog(true);
  };

  const confirmRemoveMember = async () => {
    if (!userToRemove) return;

    try {
      await chatApi.removeChatMember(chatId, userToRemove.id);
      Alert.alert('Успех', `${userToRemove.name} удален из чата`);
      setShowRemoveDialog(false);
      setUserToRemove(null);

      // Перезагружаем список участников
      await loadMembers();
    } catch (error: any) {
      console.error('❌ Failed to remove member:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось удалить участника');
    }
  };

  const handleToggleAdmin = async (userId: number, userName: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    setRoleChangeData({
      userId,
      userName,
      currentRole,
      newRole,
    });
    setShowRoleChangeDialog(true);
  };

  const confirmRoleChange = async () => {
    if (!roleChangeData) return;

    try {
      await chatApi.updateChatMemberRole(chatId, roleChangeData.userId, roleChangeData.newRole as 'admin' | 'member');
      const action = roleChangeData.newRole === 'admin' ? 'назначен администратором' : 'снят с должности администратора';
      Alert.alert('Успех', `${roleChangeData.userName} ${action}`);
      setShowRoleChangeDialog(false);
      setRoleChangeData(null);

      // Перезагружаем список участников
      await loadMembers();
    } catch (error: any) {
      console.error('❌ Failed to update member role:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось изменить роль участника');
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

  const handleDeleteChat = async () => {
    try {
      await deleteChat(chatId);
      setShowDeleteDialog(false);
      // Возвращаемся к списку чатов
      navigation.navigate('ChatList');
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleLeaveChat = async () => {
    try {
      await leaveChat(chatId);
      setShowLeaveDialog(false);
      // Возвращаемся к списку чатов
      navigation.navigate('ChatList');
    } catch (error) {
      console.error('Failed to leave chat:', error);
    }
  };

  const handleRenameChat = async (newName: string) => {
    try {
      await updateChat(chatId, { name: newName });
      setShowRenameDialog(false);
      // Обновляем заголовок в навигации
      navigation.setParams({ chatName: newName });
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  const handleSearchMessages = () => {
    // TODO: Реализовать поиск по сообщениям
    Alert.alert('Поиск', 'Функция поиска по сообщениям в разработке');
  };

  const handleChangeAvatar = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web implementation using file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (!file) return;

          // Validate file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            Alert.alert('Ошибка', 'Размер файла не должен превышать 5 МБ');
            return;
          }

          // Validate file type
          if (!file.type.startsWith('image/')) {
            Alert.alert('Ошибка', 'Пожалуйста, выберите изображение');
            return;
          }

          setIsUploadingAvatar(true);

          try {
            console.log('📤 Uploading chat avatar...');

            // Upload file to file-service as PUBLIC file
            const uploadedFile = await fileApi.uploadFile(file, 'avatar', undefined, true);
            console.log('✅ Avatar uploaded:', uploadedFile);

            // Use public file URL
            const avatarUrl = fileApi.getPublicFileUrl(uploadedFile.file_name);
            console.log('📸 Public Avatar URL:', avatarUrl);

            // Update chat with new avatar URL
            await updateChat(chatId, { avatar: avatarUrl });
            console.log('✅ Chat updated with new avatar');

            Alert.alert('Успех', 'Изображение чата обновлено');
          } catch (error) {
            console.error('❌ Failed to upload chat avatar:', error);
            Alert.alert('Ошибка', 'Не удалось обновить изображение. Попробуйте снова.');
          } finally {
            setIsUploadingAvatar(false);
          }
        };

        input.click();
      } else {
        // Mobile implementation using expo-image-picker
        console.log('📸 Requesting media library permissions...');
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert('Ошибка', 'Нужно разрешение для доступа к галерее');
          return;
        }

        console.log('📸 Opening image picker...');
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          console.log('📸 Image picker cancelled');
          return;
        }

        const asset = result.assets[0];

        // Validate file size (max 5MB) if available
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Ошибка', 'Размер файла не должен превышать 5 МБ');
          return;
        }

        setIsUploadingAvatar(true);

        try {
          console.log('📤 Uploading chat avatar from mobile...');

          // Create file object for mobile
          const file = {
            uri: asset.uri,
            name: asset.fileName || `avatar_${Date.now()}.jpg`,
            type: asset.type === 'image' ? 'image/jpeg' : asset.mimeType || 'image/jpeg',
          };

          // Upload file to file-service as PUBLIC file
          const uploadedFile = await fileApi.uploadFile(file, 'avatar', undefined, true);
          console.log('✅ Avatar uploaded:', uploadedFile);

          // Use public file URL
          const avatarUrl = fileApi.getPublicFileUrl(uploadedFile.file_name);
          console.log('📸 Public Avatar URL:', avatarUrl);

          // Update chat with new avatar URL
          await updateChat(chatId, { avatar: avatarUrl });
          console.log('✅ Chat updated with new avatar');

          Alert.alert('Успех', 'Изображение чата обновлено');
        } catch (error) {
          console.error('❌ Failed to upload chat avatar:', error);
          Alert.alert('Ошибка', 'Не удалось обновить изображение. Попробуйте снова.');
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    } catch (error) {
      console.error('❌ Error opening file picker:', error);
      Alert.alert('Ошибка', 'Не удалось открыть выбор файла');
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary, // Цвет заголовка распространяется на область Dynamic Island
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      color: theme.text,
    },
    section: {
      backgroundColor: theme.backgroundSecondary,
      borderTopColor: theme.border,
      borderBottomColor: theme.border,
    },
    option: {
      borderBottomColor: theme.border,
    },
    optionText: {
      color: theme.text,
    },
    dangerText: {
      color: theme.error || '#FF3B30',
    },
  });

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>
          Настройки чата
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Аватар и имя для личного чата (только просмотр) */}
        {chat?.type === 'private' && otherUser && (
          <View style={[styles.avatarSection, dynamicStyles.section]}>
            <View style={styles.avatarContainer}>
              <Avatar
                imageUrl={otherUser.avatar}
                name={otherUser.name || otherUser.email}
                size={100}
              />
            </View>
            <Text style={[styles.userFullName, { color: theme.text }]}>
              {otherUser.name || 'Пользователь'}
            </Text>
            {otherUser.position && (
              <Text style={[styles.userPosition, { color: theme.textSecondary }]}>
                {otherUser.position}
              </Text>
            )}
            {departmentName && (
              <Text style={[styles.userDepartment, { color: theme.textSecondary }]}>
                {departmentName}
              </Text>
            )}
            {otherUser.role && (
              <View style={[styles.userRoleBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.userRole, { color: theme.primary }]}>
                  {getSystemRoleLabel(otherUser.role)}
                </Text>
              </View>
            )}
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
              {otherUser.email}
            </Text>
            <Text style={[styles.userLastSeen, { color: otherUser.status === 'online' ? theme.success || '#34C759' : theme.textTertiary }]}>
              {getLastSeenText(otherUser.status, otherUser.last_active_at)}
            </Text>
          </View>
        )}

        {/* Аватар и быстрые действия для групповых чатов */}
        {chat?.type === 'group' && (
          <View style={[styles.groupInfoSection, dynamicStyles.section]}>
            <View style={styles.avatarContainer}>
              <Avatar
                imageUrl={chat?.avatar}
                name={chatName || 'Группа'}
                size={100}
              />
            </View>
            <Text style={[styles.chatName, { color: theme.text }]}>
              {chatName || 'Группа'}
            </Text>
            <Text style={[styles.membersCount, { color: theme.textSecondary }]}>
              {members.length} {members.length === 1 ? 'участник' : members.length < 5 ? 'участника' : 'участников'}
            </Text>

            {/* Быстрые действия */}
            <View style={styles.quickActionsContainer}>
              {/* Изменить фото - только для создателя */}
              {isCreator && (
                <TouchableOpacity
                  style={[styles.quickActionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={handleChangeAvatar}
                  disabled={isUploadingAvatar}
                >
                  <View style={styles.quickActionIcon}>
                    <Ionicons name="camera-outline" size={24} color={theme.primary} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.text }]}>
                    {isUploadingAvatar ? 'Загрузка...' : 'Фото'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Переименовать - только для создателя */}
              {isCreator && (
                <TouchableOpacity
                  style={[styles.quickActionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setShowRenameDialog(true)}
                >
                  <View style={styles.quickActionIcon}>
                    <Ionicons name="create-outline" size={24} color={theme.primary} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.text }]}>
                    Название
                  </Text>
                </TouchableOpacity>
              )}

              {/* Поиск */}
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handleSearchMessages}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name="search-outline" size={24} color={theme.primary} />
                </View>
                <Text style={[styles.quickActionText, { color: theme.text }]}>
                  Поиск
                </Text>
              </TouchableOpacity>

              {/* Покинуть/Удалить чат */}
              {!isCreator ? (
                <TouchableOpacity
                  style={[styles.quickActionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setShowLeaveDialog(true)}
                >
                  <View style={styles.quickActionIcon}>
                    <Ionicons name="exit-outline" size={24} color={theme.error || '#FF3B30'} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.error || '#FF3B30' }]}>
                    Покинуть
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.quickActionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => setShowDeleteDialog(true)}
                >
                  <View style={styles.quickActionIcon}>
                    <Ionicons name="trash-outline" size={24} color={theme.error || '#FF3B30'} />
                  </View>
                  <Text style={[styles.quickActionText, { color: theme.error || '#FF3B30' }]}>
                    Удалить
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Быстрые действия для личных чатов */}
        {chat?.type === 'private' && (
          <>
            {/* Разделитель */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={[styles.privateActionsSection, { backgroundColor: theme.background }]}>
              {/* Поиск */}
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={handleSearchMessages}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name="search-outline" size={24} color={theme.primary} />
                </View>
                <Text style={[styles.quickActionText, { color: theme.text }]}>
                  Поиск
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Участники (только для групповых чатов) */}
        {chat?.type === 'group' && (
          <>
            {/* Разделитель */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Кнопка добавления участников */}
            {canManageMembers && (
              <View style={[styles.section, dynamicStyles.section]}>
                <TouchableOpacity
                  style={[styles.option, dynamicStyles.option]}
                  onPress={() => setShowAddMembersModal(true)}
                >
                  <Ionicons name="person-add-outline" size={24} color={theme.primary} />
                  <Text style={[styles.optionText, dynamicStyles.optionText]}>
                    Добавить участников
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Список участников */}
            <View style={[styles.membersSection, dynamicStyles.section, canManageMembers ? {} : styles.sectionMarginTop]}>
              <View style={styles.membersSectionHeader}>
                <Text style={[styles.membersSectionTitle, { color: theme.text }]}>
                  Участники ({members.length})
                </Text>
              </View>

              {isLoadingMembers ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : (
                members.map((item) => {
                  const user = item.user;
                  if (!user) return null;

                  const canRemove = canManageMembers &&
                    item.user_id !== creatorId &&
                    currentUser &&
                    item.user_id !== currentUser.id &&
                    !(isAdmin && item.role === 'admin');

                  const canChangeRole = canManageMembers &&
                    item.role !== 'owner' &&
                    currentUser &&
                    item.user_id !== currentUser.id &&
                    !(isAdmin && item.role === 'admin');

                  return (
                    <View key={item.id} style={[styles.memberItem, { borderBottomColor: theme.border }]}>
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
                            <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
                              {user.name}
                            </Text>
                            {user.role === 'department_head' && (
                              <Ionicons name="shield-checkmark" size={14} color="#F59E0B" style={{ marginLeft: 4 }} />
                            )}
                          </View>
                          <Text style={[styles.memberRole, { color: getChatRoleColor(item.role) }]}>
                            {getChatRoleLabel(item.role)}
                          </Text>
                        </View>
                      </View>
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
                })
              )}
            </View>
          </>
        )}

      </ScrollView>

      {/* Модальное окно добавления участников */}
      {showAddMembersModal && (
        <UserSelectorModal
          visible={showAddMembersModal}
          onClose={() => {
            setShowAddMembersModal(false);
            setSelectedUserIds([]);
          }}
          selectedUserIds={selectedUserIds}
          onSelectionChange={setSelectedUserIds}
          multiSelect={true}
          title="Добавить участников"
          excludeUserIds={members.map(m => m.user_id)}
          onDone={handleAddMembers}
        />
      )}

      {/* Action menu modal */}
      <ActionSheet
        visible={showActionMenu}
        title={selectedMember?.userName || ''}
        options={[
          {
            label: selectedMember?.role === 'admin' ? 'Снять права администратора' : 'Назначить администратором',
            onPress: () => {
              if (selectedMember) {
                handleMenuAction('changeRole');
              }
            },
          },
          {
            label: 'Удалить из чата',
            onPress: () => {
              if (selectedMember) {
                handleMenuAction('remove');
              }
            },
            destructive: true,
          },
        ]}
        onCancel={handleCloseActionMenu}
      />

      {/* Диалог удаления */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Удалить чат"
        message={`Вы уверены, что хотите удалить чат "${chatName}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={handleDeleteChat}
        onCancel={() => setShowDeleteDialog(false)}
        destructive
      />

      {/* Диалог выхода */}
      <ConfirmDialog
        visible={showLeaveDialog}
        title="Покинуть чат"
        message={`Вы уверены, что хотите покинуть чат "${chatName}"?`}
        confirmText="Покинуть"
        cancelText="Отмена"
        onConfirm={handleLeaveChat}
        onCancel={() => setShowLeaveDialog(false)}
        destructive
      />

      {/* Диалог переименования */}
      <InputDialog
        visible={showRenameDialog}
        title="Переименовать чат"
        placeholder="Введите новое название"
        initialValue={chatName || ''}
        confirmText="Сохранить"
        cancelText="Отмена"
        onConfirm={handleRenameChat}
        onCancel={() => setShowRenameDialog(false)}
      />

      {/* Confirm remove member dialog */}
      <ConfirmDialog
        visible={showRemoveDialog}
        title="Удалить участника"
        message={`Вы уверены, что хотите удалить ${userToRemove?.name} из чата?`}
        confirmText="Удалить"
        cancelText="Отмена"
        onConfirm={confirmRemoveMember}
        onCancel={() => {
          setShowRemoveDialog(false);
          setUserToRemove(null);
        }}
        destructive
      />

      {/* Confirm role change dialog */}
      <ConfirmDialog
        visible={showRoleChangeDialog}
        title="Изменить роль"
        message={
          roleChangeData
            ? `Вы уверены, что хотите ${roleChangeData.newRole === 'admin' ? 'назначить' : 'снять'} ${roleChangeData.userName} ${roleChangeData.newRole === 'admin' ? 'администратором' : 'с должности администратора'}?`
            : ''
        }
        confirmText="Подтвердить"
        cancelText="Отмена"
        onConfirm={confirmRoleChange}
        onCancel={cancelRoleChange}
        destructive={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  avatarSection: {
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  changeAvatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  changeAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  userFullName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  userPosition: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  userDepartment: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  userRoleBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
  },
  userRole: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userEmail: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  userLastSeen: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Members section styles
  membersSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  membersSectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  membersSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberItem: {
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  floatingButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Group info section styles
  groupInfoSection: {
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  // Quick actions styles
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    paddingHorizontal: 16,
    width: '100%',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  chatName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  membersCount: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 0,
  },
  sectionMarginTop: {
    marginTop: 8,
  },
  privateActionsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
});

export default ChatSettingsScreen;
