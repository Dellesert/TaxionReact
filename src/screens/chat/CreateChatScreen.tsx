/**
 * Create Chat Screen
 * Экран для создания нового чата
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ChatStackParamList } from '@navigation/types';
import { useChatStore } from '@store/chatStore';
import { User } from '../../types/user.types';
import { getUsers } from '@api/user.api';
import { isMockMode, mockGetUsers } from '@utils/mockData';

type CreateChatNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'CreateChat'>;

const CreateChatScreen: React.FC = () => {
  const navigation = useNavigation<CreateChatNavigationProp>();
  const { createChat } = useChatStore();

  const [chatName, setChatName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);

      let usersList: User[] = [];

      if (isMockMode()) {
        console.log('🔧 Using mock users data');
        usersList = await mockGetUsers();
        console.log(`👥 Loaded ${usersList.length} mock users`);
      } else {
        console.log('📋 Loading users from API...');
        console.log('🌐 API_BASE_URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
        console.log('🔧 Mock mode:', process.env.EXPO_PUBLIC_USE_MOCK_DATA);

        // Request all users (increase limit if needed)
        const response = await getUsers({}, { limit: 100, offset: 0 });
        console.log('✅ Users API response:', response);
        console.log('✅ Response type:', typeof response);
        console.log('✅ Response keys:', response ? Object.keys(response) : 'null');

        // PaginatedResponse has data field with array of users
        // Пробуем разные варианты структуры
        if (response && response.data && Array.isArray(response.data)) {
          usersList = response.data;
          console.log('📦 Got users from response.data (array)');
        } else if (response && Array.isArray(response)) {
          usersList = response;
          console.log('📦 Got users from response (array)');
        } else if (response && response.users && Array.isArray(response.users)) {
          usersList = response.users;
          console.log('📦 Got users from response.users (array)');
        } else {
          usersList = [];
          console.warn('⚠️ Unexpected response structure:', response);
        }

        console.log(`👥 Found ${usersList.length} users from API`);

        if (usersList.length > 0) {
          console.log('First user sample:', usersList[0]);
        } else {
          console.warn('⚠️ No users found in response');
        }
      }

      setUsers(usersList);
    } catch (error: any) {
      console.error('❌ Failed to load users:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
      });

      // Более информативное сообщение об ошибке
      let errorMessage = 'Не удалось загрузить список пользователей.';
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errorMessage = `Ошибка подключения к серверу.\n\nПроверьте:\n1. Запущен ли бэкенд на ${process.env.EXPO_PUBLIC_API_BASE_URL}\n2. Доступен ли endpoint /users\n3. Нет ли проблем с CORS`;
      } else if (error.status === 401) {
        errorMessage = 'Ошибка авторизации. Войдите в систему заново.';
      } else if (error.status === 403) {
        errorMessage = 'Недостаточно прав для просмотра списка пользователей.';
      }

      Alert.alert('Ошибка загрузки пользователей', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (userId: number) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreateChat = async () => {
    if (!chatName.trim()) {
      Alert.alert('Ошибка', 'Введите название чата');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы одного участника');
      return;
    }

    try {
      setIsCreating(true);
      console.log('📝 Creating chat:', { name: chatName.trim(), memberIds: selectedUsers });

      const newChat = await createChat(chatName.trim(), selectedUsers, 'group');

      console.log('✅ Chat created successfully:', newChat);
      console.log('✅ Chat ID:', newChat.id, 'Type:', typeof newChat.id);
      console.log('✅ Chat name:', newChat.name);

      // Проверяем что ID валидный
      if (!newChat || !newChat.id || isNaN(newChat.id)) {
        console.error('❌ Invalid chat ID:', newChat);
        throw new Error('Сервер вернул невалидный ID чата');
      }

      // Navigate to the new chat
      console.log('🔄 Navigating to chat:', newChat.id);
      navigation.replace('Chat', {
        chatId: newChat.id,
        chatName: newChat.name,
      });
    } catch (error: any) {
      console.error('❌ Failed to create chat:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось создать чат');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const searchText = `${user.name} ${user.email}`.toLowerCase();
    return searchText.includes(searchQuery.toLowerCase());
  });

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item.id);

    // Get initials for avatar
    const getInitials = (name: string) => {
      const words = name.split(' ');
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    // Get status color
    const getStatusColor = () => {
      switch (item.status) {
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

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item.id)}
      >
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.position && <Text style={styles.userPosition}>{item.position}</Text>}
          </View>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={18} color="white" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Новый чат</Text>
        <TouchableOpacity
          onPress={handleCreateChat}
          disabled={isCreating || !chatName.trim() || selectedUsers.length === 0}
          style={[
            styles.createButton,
            (!chatName.trim() || selectedUsers.length === 0) && styles.createButtonDisabled,
          ]}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.createButtonText}>Создать</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Chat Name Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Название чата</Text>
        <TextInput
          style={styles.chatNameInput}
          placeholder="Введите название..."
          placeholderTextColor="#9CA3AF"
          value={chatName}
          onChangeText={setChatName}
          maxLength={50}
        />
        <Text style={styles.charCount}>{chatName.length}/50</Text>
      </View>

      {/* Selected Users Count */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedCount}>
          <Ionicons name="people" size={20} color="#E94444" />
          <Text style={styles.selectedCountText}>
            Выбрано: {selectedUsers.length}
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск участников..."
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

      {/* Users List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E94444" />
          <Text style={styles.loadingText}>Загрузка пользователей...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Пользователи не найдены</Text>
            </View>
          }
        />
      )}
    </View>
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
  },
  createButton: {
    backgroundColor: '#E94444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chatNameInput: {
    fontSize: 16,
    color: '#111827',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
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
  userInfo: {
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
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  userPosition: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
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
});

export default CreateChatScreen;
