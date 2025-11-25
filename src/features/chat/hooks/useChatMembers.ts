/**
 * Custom Hook: useChatMembers
 * Управление участниками чата
 */

import { useState, useEffect, useCallback } from 'react';
import { ChatMember } from '@/types/user.types';
import * as chatApi from '../api/chat.api';
import * as userApi from '@api/user.api';
import { useNotification } from '@contexts/NotificationContext';

interface UseChatMembersReturn {
  members: ChatMember[];
  isLoadingMembers: boolean;
  loadMembers: () => Promise<void>;
  addMembers: (userIds: number[]) => Promise<void>;
  removeMember: (userId: number) => Promise<void>;
  updateMemberRole: (userId: number, role: 'admin' | 'member') => Promise<void>;
}

export const useChatMembers = (chatId: number, chatType: string | undefined): UseChatMembersReturn => {
  const { showError } = useNotification();

  const [members, setMembers] = useState<ChatMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Загрузка участников
  const loadMembers = useCallback(async () => {
    try {
      setIsLoadingMembers(true);
      const chatMembers = await chatApi.getChatMembers(chatId);

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
      console.error('Failed to load members:', error);
      showError('Не удалось загрузить список участников');
    } finally {
      setIsLoadingMembers(false);
    }
  }, [chatId, showError]);

  // Добавление участников
  const addMembers = useCallback(async (userIds: number[]) => {
    if (userIds.length === 0) {
      showError('Выберите хотя бы одного участника');
      return;
    }

    try {
      // Добавляем участников по одному
      for (const userId of userIds) {
        await chatApi.addChatMember(chatId, userId);
      }

      // Перезагружаем список участников
      await loadMembers();
    } catch (error: unknown) {
      console.error('Failed to add members:', error);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось добавить участников';
      showError(errorMessage);
      throw error;
    }
  }, [chatId, loadMembers, showError]);

  // Удаление участника
  const removeMember = useCallback(async (userId: number) => {
    try {
      await chatApi.removeChatMember(chatId, userId);

      // Перезагружаем список участников
      await loadMembers();
    } catch (error: unknown) {
      console.error('Failed to remove member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось удалить участника';
      showError(errorMessage);
      throw error;
    }
  }, [chatId, loadMembers, showError]);

  // Изменение роли участника
  const updateMemberRole = useCallback(async (userId: number, role: 'admin' | 'member') => {
    try {
      await chatApi.updateChatMemberRole(chatId, userId, role);

      // Перезагружаем список участников
      await loadMembers();
    } catch (error: unknown) {
      console.error('Failed to update member role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Не удалось изменить роль участника';
      showError(errorMessage);
      throw error;
    }
  }, [chatId, loadMembers, showError]);

  // Загрузка участников для групповых чатов
  useEffect(() => {
    if (chatType === 'group') {
      loadMembers();
    }
  }, [chatType, loadMembers]);

  return {
    members,
    isLoadingMembers,
    loadMembers,
    addMembers,
    removeMember,
    updateMemberRole,
  };
};
