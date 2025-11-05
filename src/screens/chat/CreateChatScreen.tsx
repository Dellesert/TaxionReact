/**
 * Create Chat Screen
 * Экран для создания нового чата
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ChatStackParamList } from '@navigation/types';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import { User, Department } from '../../types/user.types';
import { ChatType } from '../../types/chat.types';
import { getUsers, getDepartments } from '@api/user.api';
import { isMockMode, mockGetUsers } from '@utils/mockData';
import { useTheme } from '@hooks/useTheme';
import Avatar from '@components/common/Avatar';

type CreateChatNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'CreateChat'>;

const CreateChatScreen: React.FC = () => {
  const navigation = useNavigation<CreateChatNavigationProp>();
  const route = useRoute<RouteProp<ChatStackParamList, 'CreateChat'>>();
  const { createChat } = useChatStore();
  const { theme } = useTheme();

  const [chatType, setChatType] = useState<ChatType>(route.params?.initialChatType || 'group');
  const [chatName, setChatName] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Map<number, Department>>(new Map());
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

        // Request all users (increase limit if needed), only active users
        // For chats, we show all users (not using for_task_assignment filter)
        const response = await getUsers({ is_active: true }, { limit: 1000, offset: 0 });
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
          console.log('Department info:', {
            department_id: usersList[0].department_id,
            department: usersList[0].department,
          });
        } else {
          console.warn('⚠️ No users found in response');
        }
      }

      console.log('📊 Users with departments:', usersList.filter(u => u.department).length);
      console.log('📊 Users with department_id:', usersList.filter(u => u.department_id).length);

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
    if (chatType === 'private') {
      // Для личного чата - заменяем выбор (radio behavior)
      if (selectedUsers.includes(userId)) {
        setSelectedUsers([]); // Снимаем выбор
      } else {
        setSelectedUsers([userId]); // Заменяем на нового пользователя
      }
    } else {
      // Для группового чата - добавляем/удаляем (checkbox behavior)
      if (selectedUsers.includes(userId)) {
        setSelectedUsers(selectedUsers.filter((id) => id !== userId));
      } else {
        setSelectedUsers([...selectedUsers, userId]);
      }
    }
  };

  const toggleDepartmentSelection = (departmentUsers: User[]) => {
    if (chatType === 'private') return; // Для личного чата не применимо

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

  const handleCreateChat = async () => {
    // Валидация для группового чата
    if (chatType === 'group') {
      if (!chatName.trim()) {
        Alert.alert('Ошибка', 'Введите название группового чата');
        return;
      }
    }

    // Валидация количества участников
    if (selectedUsers.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы одного участника');
      return;
    }

    if (chatType === 'private' && selectedUsers.length > 1) {
      Alert.alert('Ошибка', 'Личный чат может быть только с одним пользователем');
      return;
    }

    try {
      setIsCreating(true);

      // Для личного чата имя не обязательно, используем имя собеседника
      const finalChatName = chatType === 'private'
        ? '' // Сервер должен сам установить или клиент отобразит имя собеседника
        : chatName.trim();

      console.log('📝 Creating chat:', {
        type: chatType,
        name: finalChatName,
        memberIds: selectedUsers
      });

      const newChat = await createChat(finalChatName, selectedUsers, chatType);

      console.log('✅ Chat created successfully:', newChat);
      console.log('✅ Chat ID:', newChat.id, 'Type:', typeof newChat.id);
      console.log('✅ Chat type:', newChat.type);
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

  const filteredUsers = useMemo(() => {
    const currentUser = useAuthStore.getState().user;

    return users.filter((user) => {
      // Filter out current user
      if (currentUser && user.id === currentUser.id) {
        return false;
      }

      // Hide admins and super_admins from all users (including other admins)
      if (user.role === 'admin' || user.role === 'super_admin') {
        return false;
      }

      // Apply search query
      if (searchQuery) {
        const searchText = `${user.name} ${user.email}`.toLowerCase();
        return searchText.includes(searchQuery.toLowerCase());
      }

      return true;
    });
  }, [users, searchQuery, chatType]);

  // Группируем пользователей по подразделениям
  const userSections = useMemo(() => {
    const currentUser = useAuthStore.getState().user;
    const currentUserDepartmentId = currentUser?.department_id;

    // Группируем пользователей
    const byDepartment = new Map<number | null, User[]>();

    filteredUsers.forEach((user) => {
      const deptId = user.department_id || null;
      if (!byDepartment.has(deptId)) {
        byDepartment.set(deptId, []);
      }
      byDepartment.get(deptId)!.push(user);
    });

    // Sort users within each department: department heads first, then others
    byDepartment.forEach((users) => {
      users.sort((a, b) => {
        const aIsDeptHead = a.role === 'department_head';
        const bIsDeptHead = b.role === 'department_head';

        if (aIsDeptHead && !bIsDeptHead) return -1;
        if (!aIsDeptHead && bIsDeptHead) return 1;

        // If both are dept heads or both are not, sort by name
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
  }, [filteredUsers]);

  const renderUserItem = ({ item }: { item: User }) => {
    const isSelected = selectedUsers.includes(item.id);
    const isPrivateChat = chatType === 'private';

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

    // Get role text in Russian
    const getRoleText = () => {
      switch (item.role) {
        case 'super_admin':
          return 'Супер администратор';
        case 'admin':
          return 'Администратор';
        case 'manager':
          return 'Менеджер';
        case 'employee':
          return 'Сотрудник';
        default:
          return 'Пользователь';
      }
    };

    return (
      <TouchableOpacity
        style={[styles.userItem, isSelected && styles.userItemSelected]}
        onPress={() => toggleUserSelection(item.id)}
      >
        <View style={styles.userInfo}>
          <Avatar
            name={item.name}
            imageUrl={item.avatar}
            size={48}
            status={item.status}
            showStatus={true}
          />
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>{item.name}</Text>
              {item.role === 'department_head' && (
                <Ionicons name="shield-checkmark" size={16} color="#F59E0B" style={{ marginLeft: 4 }} />
              )}
            </View>
            <Text style={styles.userEmail}>{getRoleText()}</Text>
            {item.position && <Text style={styles.userPosition}>{item.position}</Text>}
          </View>
        </View>
        {/* Radio для личного чата, checkbox для группового */}
        {isPrivateChat ? (
          <View style={[styles.radio, isSelected && styles.radioSelected]}>
            {isSelected && <View style={styles.radioDot} />}
          </View>
        ) : (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={18} color="white" />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const canCreate = chatType === 'private'
    ? selectedUsers.length === 1
    : chatName.trim() && selectedUsers.length > 0;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 12,
    },
    createButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      minWidth: 80,
      alignItems: 'center',
    },
    createButtonDisabled: {
      backgroundColor: theme.backgroundTertiary,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    section: {
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    chatNameInput: {
      fontSize: 16,
      color: theme.text,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    charCount: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 4,
      textAlign: 'right',
    },
    selectedCount: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    selectedCountText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.primary,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      color: theme.text,
    },
    listContent: {
      paddingVertical: 8,
      paddingBottom: 120,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    userItemSelected: {
      backgroundColor: theme.backgroundSecondary,
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
    userNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    userEmail: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    userPosition: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 2,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: theme.primary,
    },
    radioDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: theme.background,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.textSecondary,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 16,
      color: theme.textTertiary,
      marginTop: 16,
    },
    sectionHeaderContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sectionHeaderText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      textTransform: 'uppercase',
    },
    sectionHeaderCount: {
      fontSize: 12,
      color: theme.textTertiary,
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
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Новый чат</Text>
        <TouchableOpacity
          onPress={handleCreateChat}
          disabled={isCreating || !canCreate}
          style={[
            styles.createButton,
            !canCreate && styles.createButtonDisabled,
          ]}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.createButtonText}>Создать</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Chat Name Input - только для групповых чатов */}
      {chatType === 'group' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Название чата</Text>
          <TextInput
            style={styles.chatNameInput}
            placeholder="Введите название..."
            placeholderTextColor={theme.inputPlaceholder}
            value={chatName}
            onChangeText={setChatName}
            maxLength={50}
          />
          <Text style={styles.charCount}>{chatName.length}/50</Text>
        </View>
      )}

      {/* Selected Users Count */}
      {selectedUsers.length > 0 && chatType === 'group' && (
        <View style={styles.selectedCount}>
          <Ionicons name="people" size={20} color={theme.primary} />
          <Text style={styles.selectedCountText}>
            Выбрано: {selectedUsers.length}
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск участников..."
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

      {/* Users List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Загрузка пользователей...</Text>
        </View>
      ) : (
        <SectionList
          sections={userSections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUserItem}
          renderSectionHeader={({ section }) => {
            // Для группового чата показываем чекбокс выбора отдела
            if (chatType === 'group') {
              const departmentUserIds = section.data.map(u => u.id);
              const allSelected = departmentUserIds.every(id => selectedUsers.includes(id));
              const someSelected = departmentUserIds.some(id => selectedUsers.includes(id)) && !allSelected;

              return (
                <TouchableOpacity
                  style={styles.sectionHeaderContainer}
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
                    <Text style={styles.sectionHeaderText}>{section.title}</Text>
                  </View>
                  <Text style={styles.sectionHeaderCount}>
                    {section.data.length} {section.data.length === 1 ? 'пользователь' : 'пользователей'}
                  </Text>
                </TouchableOpacity>
              );
            }

            // Для личного чата - обычный заголовок без чекбокса
            return (
              <View style={styles.sectionHeaderContainer}>
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
                <Text style={styles.sectionHeaderCount}>
                  {section.data.length} {section.data.length === 1 ? 'пользователь' : 'пользователей'}
                </Text>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={theme.border} />
              <Text style={styles.emptyText}>Пользователи не найдены</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default CreateChatScreen;
