/**
 * Custom Hook: useCreateChatActions
 * Действия для создания чата
 */

import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatStackParamList } from '@navigation/types';
import { ChatType } from '../types/chat.types';
import { useChatStore } from '@shared/store/chatStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import {
  validateChatCreation,
  getFinalChatName,
} from '../utils/createChatHelpers';

type CreateChatNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'CreateChat'>;

interface UseCreateChatActionsReturn {
  selectedUsers: number[];
  isCreating: boolean;
  toggleUserSelection: (userId: number) => void;
  toggleDepartmentSelection: (userIds: number[]) => void;
  createChat: (chatType: ChatType, chatName: string) => Promise<void>;
}

export const useCreateChatActions = (
  chatType: ChatType
): UseCreateChatActionsReturn => {
  const navigation = useNavigation<CreateChatNavigationProp>();
  const { showError } = useNotification();
  const createChatAction = useChatStore((state) => state.createChat);

  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Toggle user selection
  const toggleUserSelection = useCallback(
    (userId: number) => {
      if (chatType === 'private') {
        // For private chat - replace selection (radio behavior)
        if (selectedUsers.includes(userId)) {
          setSelectedUsers([]); // Deselect
        } else {
          setSelectedUsers([userId]); // Replace with new user
        }
      } else {
        // For group chat - add/remove (checkbox behavior)
        if (selectedUsers.includes(userId)) {
          setSelectedUsers(selectedUsers.filter((id) => id !== userId));
        } else {
          setSelectedUsers([...selectedUsers, userId]);
        }
      }
    },
    [chatType, selectedUsers]
  );

  // Toggle department selection
  const toggleDepartmentSelection = useCallback(
    (userIds: number[]) => {
      if (chatType === 'private') return; // Not applicable for private chat

      // Check if all users in department are already selected
      const allSelected = userIds.every((id) => selectedUsers.includes(id));

      if (allSelected) {
        // Deselect all users in department
        setSelectedUsers(selectedUsers.filter((id) => !userIds.includes(id)));
      } else {
        // Select all users in department (avoiding duplicates)
        const newSelectedUsers = [...selectedUsers];
        userIds.forEach((id) => {
          if (!newSelectedUsers.includes(id)) {
            newSelectedUsers.push(id);
          }
        });
        setSelectedUsers(newSelectedUsers);
      }
    },
    [chatType, selectedUsers]
  );

  // Create chat
  const createChat = useCallback(
    async (type: ChatType, name: string) => {
      // Validate
      const validation = validateChatCreation(type as 'group' | 'private', name, selectedUsers);
      if (!validation.isValid) {
        showError(validation.error || 'Ошибка валидации');
        return;
      }

      try {
        setIsCreating(true);

        // Get final chat name
        const finalChatName = getFinalChatName(type as 'group' | 'private', name);

        const newChat = await createChatAction(finalChatName, selectedUsers, type as 'group' | 'private');

        // Validate chat ID
        if (!newChat || !newChat.id || isNaN(newChat.id)) {
          console.error('❌ Invalid chat ID:', newChat);
          throw new Error('Сервер вернул невалидный ID чата');
        }

        // Navigate to the new chat
      } catch (error: unknown) {
        console.error('❌ Failed to create chat:', error);
        const err = error as { message?: string };
        showError(err.message || 'Не удалось создать чат');
      } finally {
        setIsCreating(false);
      }
    },
    [selectedUsers, createChatAction, navigation, showError]
  );

  return {
    selectedUsers,
    isCreating,
    toggleUserSelection,
    toggleDepartmentSelection,
    createChat,
  };
};
