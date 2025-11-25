import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@/types/user.types';
import { getUsers } from '@api/user.api';
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
import Avatar from '@components/common/Avatar';

interface UserPickerProps {
  selectedUserIds: number[];
  onSelectionChange: (userIds: number[]) => void;
  multiSelect?: boolean;
  forChat?: boolean; // If true, show all users (for chat creation). If false/undefined, show filtered users (for task assignment)
}

const UserPicker: React.FC<UserPickerProps> = ({
  selectedUserIds,
  onSelectionChange,
  multiSelect = true,
  forChat = false,
}) => {
  const { theme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user from auth store
  const currentUser = useAuthStore((state) => state.user);

  // Load users when modal opens
  useEffect(() => {
    if (isModalVisible && users.length === 0) {
      loadUsers();
    }
  }, [isModalVisible]);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.position?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!currentUser) {
        setError('Пользователь не авторизован');
        setIsLoading(false);
        return;
      }

      // Fetch users based on role (only active users)
      let filters: any = {
        is_active: true,
      };

      // For chats, show all users. For tasks/polls, use filtered assignment logic
      if (!forChat) {
        filters.for_task_assignment = true;
      }

      const response = await getUsers(filters, { limit: 100, offset: 0 });

      // Filter out the current user from the list (can't assign to self via picker)
      let filteredData = (response.data || []).filter(user => user.id !== currentUser.id);

      // Sort users: department heads first, then others
      filteredData.sort((a, b) => {
        const aIsDeptHead = a.role === 'department_head';
        const bIsDeptHead = b.role === 'department_head';

        if (aIsDeptHead && !bIsDeptHead) return -1;
        if (!aIsDeptHead && bIsDeptHead) return 1;

        // If both are dept heads or both are not, sort by name
        return a.name.localeCompare(b.name);
      });

      setUsers(filteredData);
      setFilteredUsers(filteredData);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Не удалось загрузить список пользователей');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (userId: number) => {
    if (multiSelect) {
      // Multi-select mode
      if (selectedUserIds.includes(userId)) {
        onSelectionChange(selectedUserIds.filter((id) => id !== userId));
      } else {
        onSelectionChange([...selectedUserIds, userId]);
      }
    } else {
      // Single-select mode
      onSelectionChange([userId]);
      setIsModalVisible(false);
    }
  };

  const getSelectedUsers = (): User[] => {
    return users.filter((user) => selectedUserIds.includes(user.id));
  };

  const renderSelectedUsers = () => {
    const selectedUsers = getSelectedUsers();

    if (selectedUsers.length === 0) {
      return (
        <Text style={styles.placeholderText}>
          {multiSelect ? 'Выберите исполнителей' : 'Выберите исполнителя'}
        </Text>
      );
    }

    return (
      <View style={styles.selectedUsersContainer}>
        {selectedUsers.map((user) => (
          <View key={user.id} style={styles.selectedUserChip}>
            <Text style={styles.selectedUserText} numberOfLines={1}>
              {user.name}
            </Text>
            <TouchableOpacity
              onPress={() => toggleUserSelection(user.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUserIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item.id)}
      >
        <View style={styles.userInfo}>
          <Avatar
            name={item.name}
            imageUrl={item.avatar}
            size={40}
            status={item.status}
            showStatus={true}
          />
          <View style={styles.userDetails}>
            <View style={styles.userNameContainer}>
              <Text style={styles.userName}>{item.name}</Text>
              {item.role === 'department_head' && (
                <Ionicons name="shield-checkmark" size={16} color="#F59E0B" style={{ marginLeft: 4 }} />
              )}
            </View>
            {item.position && (
              <Text style={styles.userPosition}>{item.position}</Text>
            )}
            {item.department && (
              <Text style={styles.userDepartment}>{item.department.name}</Text>
            )}
          </View>
        </View>
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <Ionicons name="checkbox" size={24} color="#E94444" />
          ) : (
            <Ionicons name="square-outline" size={24} color="#D1D5DB" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setIsModalVisible(true)}
      >
        <View style={styles.pickerButtonContent}>
          <Ionicons name="people-outline" size={20} color="#6B7280" />
          <View style={styles.pickerButtonTextContainer}>
            {renderSelectedUsers()}
          </View>
        </View>
        <Ionicons name="chevron-down" size={20} color="#6B7280" />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Выбрать исполнителей</Text>
            {multiSelect && selectedUserIds.length > 0 && (
              <TouchableOpacity
                onPress={() => onSelectionChange([])}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>Очистить</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#9CA3AF"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск по имени, email или должности..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.searchClearButton}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* User List */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#E94444" />
              <Text style={styles.loadingText}>Загрузка пользователей...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadUsers}
              >
                <Text style={styles.retryButtonText}>Повторить</Text>
              </TouchableOpacity>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Пользователи не найдены'
                  : 'Нет доступных пользователей'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContainer}
            />
          )}

          {/* Done Button */}
          {multiSelect && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.doneButtonText}>
                  Готово {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    minHeight: 48,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  pickerButtonTextContainer: {
    flex: 1,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  selectedUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E94444',
    borderRadius: 16,
    paddingVertical: 4,
    paddingLeft: 10,
    paddingRight: 6,
    gap: 4,
  },
  selectedUserText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    maxWidth: 120,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#E94444',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 10,
  },
  searchClearButton: {
    padding: 4,
  },
  listContainer: {
    paddingBottom: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userItemSelected: {
    backgroundColor: '#FEF2F2',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  userDetails: {
    flex: 1,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  userPosition: {
    fontSize: 13,
    color: '#6B7280',
  },
  userDepartment: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  checkboxContainer: {
    marginLeft: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#E94444',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  doneButton: {
    paddingVertical: 14,
    backgroundColor: '#E94444',
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default UserPicker;
