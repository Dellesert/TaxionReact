/**
 * Custom Hook: useChatSettingsData
 * Управление данными настроек чата
 */

import { useState, useEffect, useCallback } from 'react';
import { useChatStore } from '@store/chatStore';
import * as chatApi from '../api/chat.api';
import * as userApi from '@api/user.api';
import { User } from '@/types/user.types';
import { Chat } from '../types/chat.types';

interface UseChatSettingsDataReturn {
  chat: Chat | null;
  isLoadingChat: boolean;
  otherUser: User | null;
  departmentName: string;
  loadChat: () => Promise<void>;
  loadOtherUser: () => Promise<void>;
}

export const useChatSettingsData = (
  chatId: number,
  currentUserId: number | undefined
): UseChatSettingsDataReturn => {
  const getChatById = useChatStore((state) => state.getChatById);

  const [chat, setChat] = useState<Chat | null>(() => getChatById(chatId) || null);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [departmentName, setDepartmentName] = useState<string>('');

  // Загрузка чата
  const loadChat = useCallback(async () => {
    const chatFromStore = getChatById(chatId);

    if (chatFromStore) {
      setChat(chatFromStore);
      return;
    }

    // Если чат не найден в store, загружаем через API
    try {
      setIsLoadingChat(true);
      const fetchedChat = await chatApi.getChat(chatId);
      setChat(fetchedChat);
    } catch (error) {
      console.error(`Failed to load chat ${chatId}:`, error);
    } finally {
      setIsLoadingChat(false);
    }
  }, [chatId, getChatById]);

  // Загрузка данных собеседника для личного чата
  const loadOtherUser = useCallback(async () => {
    if (chat?.type === 'private' && chat.members && currentUserId) {
      const otherMember = chat.members.find((member: { user_id: number }) => member.user_id !== currentUserId);
      const otherUserId = otherMember?.user_id;

      if (otherUserId) {
        try {
          const user = await userApi.getUser(otherUserId);
          setOtherUser(user);

          // Если есть department_id, но нет объекта department, загружаем отдельно
          if (user.department_id && !user.department) {
            try {
              const dept = await userApi.getDepartment(user.department_id);
              if (dept && dept.name) {
                setDepartmentName(dept.name);
              }
            } catch (error) {
              console.error('Failed to load department:', error);
            }
          } else if (user.department?.name) {
            setDepartmentName(user.department.name);
          }
        } catch (error) {
          console.error('Failed to load other user:', error);
        }
      }
    }
  }, [chat, currentUserId]);

  // Загрузка чата при монтировании
  useEffect(() => {
    loadChat();
  }, [loadChat]);

  // Загрузка собеседника когда чат загружен
  useEffect(() => {
    loadOtherUser();
  }, [loadOtherUser]);

  return {
    chat,
    isLoadingChat,
    otherUser,
    departmentName,
    loadChat,
    loadOtherUser,
  };
};
