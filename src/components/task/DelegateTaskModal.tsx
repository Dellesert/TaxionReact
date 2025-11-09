/**
 * Delegate Task Modal Component
 * Модальное окно для делегирования задачи
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { delegateTask } from '@/api/task.api';
import { getUsers } from '@/api/user.api';
import { User } from '@/types/user.types';

interface DelegateTaskModalProps {
  visible: boolean;
  taskId: number;
  onClose: () => void;
  onDelegated?: () => void;
}

export const DelegateTaskModal: React.FC<DelegateTaskModalProps> = ({
  visible,
  taskId,
  onClose,
  onDelegated,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUsers();
    }
  }, [visible]);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      // Load all users and filter for department heads and admins
      const response = await getUsers({}, { limit: 100, offset: 0 });

      // Filter only department heads, admins, and super admins
      const departmentHeads = response.data.filter(
        (user) =>
          user.role === 'department_head' ||
          user.role === 'admin' ||
          user.role === 'super_admin'
      );

      console.log('👥 Loaded department heads:', departmentHeads);
      setUsers(departmentHeads);
      setFilteredUsers(departmentHeads);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить список пользователей');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.position?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedUserId(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDelegate = async () => {
    if (!selectedUserId) {
      Alert.alert('Ошибка', 'Выберите пользователя для делегирования');
      return;
    }

    try {
      setIsLoading(true);
      const result = await delegateTask(taskId, { to_user_id: selectedUserId });
      handleReset();
      onDelegated?.();
      onClose();
    } catch (error) {
      console.error('❌ Error delegating task:', error);
      Alert.alert('Ошибка', 'Не удалось делегировать задачу');
    } finally {
      setIsLoading(false);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = item.id === selectedUserId;

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => setSelectedUserId(item.id)}
        disabled={isLoading}
      >
        <View style={styles.userAvatar}>
          {item.avatar ? (
            <Text style={styles.userAvatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <Ionicons name="person" size={20} color="#6b7280" />
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userPosition} numberOfLines={1}>
            {item.position || item.email}
          </Text>
        </View>

        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (isLoadingUsers) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color="#d1d5db" />
        <Text style={styles.emptyText}>
          {searchQuery ? 'Пользователи не найдены' : 'Список пользователей пуст'}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Делегировать задачу</Text>
            <TouchableOpacity onPress={handleClose} disabled={isLoading}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск по имени, должности или email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={!isLoading}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {/* User List */}
          <FlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
          />

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.buttonCancelText}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonDelegate,
                (isLoading || !selectedUserId) && styles.buttonDisabled,
              ]}
              onPress={handleDelegate}
              disabled={isLoading || !selectedUserId}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonDelegateText}>Делегировать</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    height: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  userItemSelected: {
    backgroundColor: '#eff6ff',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  userPosition: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: '#f3f4f6',
  },
  buttonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  buttonDelegate: {
    backgroundColor: '#3b82f6',
  },
  buttonDelegateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
