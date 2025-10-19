/**
 * Chat Members Modal
 * Модальное окно для просмотра и добавления участников чата
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { User } from '../../types/user.types';
import { ChatMember } from '../../types/chat.types';
import { getChatMembers, addChatMembers } from '@api/chat.api';
import { getUsers } from '@api/user.api';
import { isMockMode, mockGetUsers } from '@utils/mockData';

interface ChatMembersModalProps {
  visible: boolean;
  chatId: number;
  onClose: () => void;
  isCreator?: boolean;
}

export const ChatMembersModal: React.FC<ChatMembersModalProps> = ({
  visible,
  chatId,
  onClose,
  isCreator = false,
}) => {
  const { theme } = useTheme();
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (visible) {
      loadMembers();
    }
  }, [visible, chatId]);

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const chatMembers = await getChatMembers(chatId);
      console.log('👥 Loaded chat members:', chatMembers);

      // Загружаем информацию о пользователях
      if (chatMembers && chatMembers.length > 0) {
        // Получаем список всех пользователей
        let allUsersList: User[] = [];
        if (isMockMode()) {
          allUsersList = await mockGetUsers();
        } else {
          const response = await getUsers({}, { limit: 100, offset: 0 });
          allUsersList = response.data || [];
        }

        // Добавляем информацию о пользователях к членам чата
        const membersWithUsers = chatMembers.map((member) => ({
          ...member,
          user: allUsersList.find((u) => u.id === member.user_id),
        }));

        console.log('👥 Members with user info:', membersWithUsers);
        setMembers(membersWithUsers);
      } else {
        setMembers(chatMembers || []);
      }
    } catch (error: any) {
      console.error('Failed to load members:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить список участников');
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
        const response = await getUsers({}, { limit: 100, offset: 0 });
        usersList = response.data || [];
      }

      // Фильтруем пользователей, которые уже в чате
      const memberIds = (members || []).map((m) => m.user_id);
      const availableUsers = (usersList || []).filter((u) => !memberIds.includes(u.id));
      setAllUsers(availableUsers);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить список пользователей');
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

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы одного участника');
      return;
    }

    try {
      setIsAdding(true);
      console.log('➕ Adding members:', selectedUsers);

      // API ожидает отдельный запрос для каждого пользователя
      // Формат: { user_id: number, role: "member" }
      const addPromises = selectedUsers.map(async (userId) => {
        console.log(`➕ Adding user ${userId} to chat ${chatId}`);
        const response = await addChatMembers(chatId, {
          user_id: userId,
          role: 'member',
        } as any);
        return response;
      });

      await Promise.all(addPromises);

      Alert.alert('Успех', `Добавлено участников: ${selectedUsers.length}`);
      handleCancelAdd();
      loadMembers();
    } catch (error: any) {
      console.error('Failed to add members:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось добавить участников');
    } finally {
      setIsAdding(false);
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return '#E94444';
      case 'admin':
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
        return 'Админ';
      default:
        return 'Участник';
    }
  };

  const filteredUsers = isAddingMode
    ? (allUsers || []).filter((user) => {
        if (!searchQuery) return true;
        const searchText = `${user.name} ${user.email}`.toLowerCase();
        return searchText.includes(searchQuery.toLowerCase());
      })
    : (members || []);

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
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
    memberEmail: {
      color: theme.textSecondary,
    },
    memberPosition: {
      color: theme.textTertiary,
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
    footer: {
      backgroundColor: theme.backgroundSecondary,
      borderTopColor: theme.border,
    },
    cancelButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    cancelButtonText: {
      color: theme.textSecondary,
    },
  });

  const renderMemberItem = ({ item }: { item: ChatMember }) => {
    const user = item.user;
    if (!user) return null;

    return (
      <View style={[styles.memberItem, dynamicStyles.memberItem]}>
        <View style={styles.memberInfo}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, dynamicStyles.avatar]}>
              <Text style={[styles.avatarText, dynamicStyles.avatarText]}>{getInitials(user.name)}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(user.status) }]} />
          </View>
          <View style={styles.memberDetails}>
            <Text style={[styles.memberName, dynamicStyles.memberName]}>{user.name}</Text>
            <Text style={[styles.memberEmail, dynamicStyles.memberEmail]}>{user.email}</Text>
            {user.position && <Text style={[styles.memberPosition, dynamicStyles.memberPosition]}>{user.position}</Text>}
          </View>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) }]}>
          <Text style={styles.roleBadgeText}>{getRoleLabel(item.role)}</Text>
        </View>
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
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, dynamicStyles.avatar]}>
              <Text style={[styles.avatarText, dynamicStyles.avatarText]}>{getInitials(item.name)}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          </View>
          <View style={styles.memberDetails}>
            <Text style={[styles.memberName, dynamicStyles.memberName]}>{item.name}</Text>
            <Text style={[styles.memberEmail, dynamicStyles.memberEmail]}>{item.email}</Text>
            {item.position && <Text style={[styles.memberPosition, dynamicStyles.memberPosition]}>{item.position}</Text>}
          </View>
        </View>
        <View style={[styles.checkbox, dynamicStyles.checkbox, isSelected && [styles.checkboxSelected, dynamicStyles.checkboxSelected]]}>
          {isSelected && <Ionicons name="checkmark" size={18} color="white" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, dynamicStyles.container]}>
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
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
            isCreator && (
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
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) =>
              isAddingMode ? `user-${item.id}` : `member-${(item as ChatMember).id}`
            }
            renderItem={isAddingMode ? renderUserItem : renderMemberItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={theme.borderLight} />
                <Text style={[styles.emptyText, dynamicStyles.emptyText]}>
                  {isAddingMode ? 'Нет пользователей для добавления' : 'Нет участников'}
                </Text>
              </View>
            }
          />
        )}

        {/* Cancel button in add mode */}
        {isAddingMode && (
          <View style={[styles.footer, dynamicStyles.footer]}>
            <TouchableOpacity onPress={handleCancelAdd} style={[styles.cancelButton, dynamicStyles.cancelButton]}>
              <Text style={[styles.cancelButtonText, dynamicStyles.cancelButtonText]}>Отмена</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    paddingVertical: 60,
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
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  memberDetails: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
  },
  memberPosition: {
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
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
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
