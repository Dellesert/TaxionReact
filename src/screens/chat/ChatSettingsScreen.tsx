/**
 * Chat Settings Screen
 * Экран настроек чата
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ChatStackParamList } from '@navigation/types';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { ChatMembersModal } from '@components/chat/ChatMembersModal';
import { ConfirmDialog } from '@components/common/ConfirmDialog';
import { InputDialog } from '@components/common/InputDialog';
import { fileApi } from '@api/fileApi';
import { Avatar } from '@components/common/Avatar';

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

  const chat = getChatById(chatId);
  const creatorId = chat?.created_by || chat?.creator_id;
  const isCreator = currentUser && creatorId === currentUser.id;

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

        {/* Участники */}
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

        {/* Переименование (только для создателя) */}
        {isCreator && (
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
});

export default ChatSettingsScreen;
