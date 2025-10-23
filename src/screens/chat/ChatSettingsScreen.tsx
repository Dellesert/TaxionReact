/**
 * Chat Settings Screen
 * Экран настроек чата
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ChatStackParamList } from '@navigation/types';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { ChatMembersModal } from '@components/chat/ChatMembersModal';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { InputDialog } from '@components/common/InputDialog';
import { fileApi } from '@api/fileApi';
import { Avatar } from '@components/common/Avatar';
import { User } from '@/types/user.types';
import * as userApi from '@api/user.api';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatSettings'>;

const ChatSettingsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { chatId, chatName } = route.params;
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);
  const getChatById = useChatStore((state) => state.getChatById);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const leaveChat = useChatStore((state) => state.leaveChat);
  const updateChat = useChatStore((state) => state.updateChat);

  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [departmentName, setDepartmentName] = useState<string>('');

  const chat = getChatById(chatId);
  const creatorId = chat?.created_by || chat?.creator_id;
  const isCreator = currentUser && creatorId === currentUser.id;

  // Функция для перевода роли на русский
  const getRoleLabel = (role: string): string => {
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

      <ScrollView>
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
                  {getRoleLabel(otherUser.role)}
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

        {/* Аватар чата (только для групповых чатов и только для создателя) */}
        {isCreator && chat?.type === 'group' && (
          <View style={[styles.avatarSection, dynamicStyles.section]}>
            <View style={styles.avatarContainer}>
              <Avatar
                imageUrl={chat?.avatar}
                name={chatName || 'Группа'}
                size={100}
              />
            </View>
            <TouchableOpacity
              style={[styles.changeAvatarButton, { backgroundColor: theme.primary }]}
              onPress={handleChangeAvatar}
              disabled={isUploadingAvatar}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.changeAvatarText}>
                {isUploadingAvatar ? 'Загрузка...' : 'Изменить изображение'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Участники (только для групповых чатов) */}
        {chat?.type === 'group' && (
          <View style={[styles.section, dynamicStyles.section]}>
            <TouchableOpacity
              style={[styles.option, dynamicStyles.option]}
              onPress={() => setMembersModalVisible(true)}
            >
              <Ionicons name="people-outline" size={24} color={theme.primary} />
              <Text style={[styles.optionText, dynamicStyles.optionText]}>
                Участники группы
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Переименование (только для групповых чатов и только для создателя) */}
        {isCreator && chat?.type === 'group' && (
          <View style={[styles.section, dynamicStyles.section, styles.sectionMargin]}>
            <TouchableOpacity
              style={[styles.option, dynamicStyles.option]}
              onPress={() => setShowRenameDialog(true)}
            >
              <Ionicons name="create-outline" size={24} color={theme.primary} />
              <Text style={[styles.optionText, dynamicStyles.optionText]}>
                Переименовать чат
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Поиск */}
        <View style={[styles.section, dynamicStyles.section, styles.sectionMargin]}>
          <TouchableOpacity
            style={[styles.option, dynamicStyles.option]}
            onPress={handleSearchMessages}
          >
            <Ionicons name="search-outline" size={24} color={theme.primary} />
            <Text style={[styles.optionText, dynamicStyles.optionText]}>
              Поиск по сообщениям
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Действия */}
        <View style={[styles.section, dynamicStyles.section, styles.sectionMargin]}>
          {!isCreator && (
            <TouchableOpacity
              style={[styles.option, dynamicStyles.option]}
              onPress={() => setShowLeaveDialog(true)}
            >
              <Ionicons name="exit-outline" size={24} color={theme.error || '#FF3B30'} />
              <Text style={[styles.optionText, dynamicStyles.dangerText]}>
                Покинуть чат
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}

          {isCreator && (
            <TouchableOpacity
              style={[styles.option, dynamicStyles.option]}
              onPress={() => setShowDeleteDialog(true)}
            >
              <Ionicons name="trash-outline" size={24} color={theme.error || '#FF3B30'} />
              <Text style={[styles.optionText, dynamicStyles.dangerText]}>
                Удалить чат
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Модальное окно участников */}
      <ChatMembersModal
        visible={membersModalVisible}
        chatId={chatId}
        onClose={() => setMembersModalVisible(false)}
        isCreator={isCreator}
        creatorId={creatorId}
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
    </SafeAreaView>
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
  sectionMargin: {
    marginTop: 20,
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
});

export default ChatSettingsScreen;
