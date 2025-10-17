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
import { User } from '@types/user.types';
import { ChatMember } from '@types/chat.types';
import { getChatMembers, addChatMembers } from '@api/chat.api';
import { getUsers } from '@api/user.api';
import { isMockMode, mockGetUsers } from '@utils/mockData';

interface ChatMembersModalProps {
  visible: boolean;
  chatId: number;
  onClose: () => void;
}

export const ChatMembersModal: React.FC<ChatMembersModalProps> = ({
  visible,
  chatId,
  onClose,
}) => {
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

  const renderMemberItem = ({ item }: { item: ChatMember }) => {
    const user = item.user;
    if (!user) return null;

    return (
      <View style={styles.memberItem}>
        <View style={styles.memberInfo}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(user.status) }]} />
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{user.name}</Text>
            <Text style={styles.memberEmail}>{user.email}</Text>
            {user.position && <Text style={styles.memberPosition}>{user.position}</Text>}
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
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item.id)}
      >
        <View style={styles.memberInfo}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>{item.name}</Text>
            <Text style={styles.memberEmail}>{item.email}</Text>
            {item.position && <Text style={styles.memberPosition}>{item.position}</Text>}
          </View>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={18} color="white" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isAddingMode ? 'Добавить участников' : 'Участники чата'}
          </Text>
          {isAddingMode ? (
            <TouchableOpacity
              onPress={handleAddMembers}
              disabled={isAdding || selectedUsers.length === 0}
              style={[
                styles.addButton,
                selectedUsers.length === 0 && styles.addButtonDisabled,
              ]}
            >
              {isAdding ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.addButtonText}>Добавить</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleAddMode} style={styles.addIconButton}>
              <Ionicons name="person-add" size={24} color="#E94444" />
            </TouchableOpacity>
          )}
        </View>

        {/* Member count or selected count */}
        {isAddingMode ? (
          selectedUsers.length > 0 && (
            <View style={styles.selectedCount}>
              <Ionicons name="people" size={20} color="#E94444" />
              <Text style={styles.selectedCountText}>Выбрано: {selectedUsers.length}</Text>
            </View>
          )
        ) : (
          <View style={styles.memberCount}>
            <Ionicons name="people" size={20} color="#6B7280" />
            <Text style={styles.memberCountText}>
              {members?.length || 0} {(members?.length || 0) === 1 ? 'участник' : 'участников'}
            </Text>
          </View>
        )}

        {/* Search */}
        {isAddingMode && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск пользователей..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E94444" />
            <Text style={styles.loadingText}>Загрузка...</Text>
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
                <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  {isAddingMode ? 'Нет пользователей для добавления' : 'Нет участников'}
                </Text>
              </View>
            }
          />
        )}

        {/* Cancel button in add mode */}
        {isAddingMode && (
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleCancelAdd} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Отмена</Text>
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
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  addIconButton: {
    padding: 4,
  },
  addButton: {
    backgroundColor: '#E94444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  selectedCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  selectedCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E94444',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  listContent: {
    paddingVertical: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  userItemSelected: {
    backgroundColor: '#FEF2F2',
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
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
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
    color: '#111827',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  memberPosition: {
    fontSize: 12,
    color: '#9CA3AF',
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
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#E94444',
    borderColor: '#E94444',
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
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});
