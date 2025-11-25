/**
 * Custom Hook: useChatSettingsActions
 * Действия с настройками чата (удаление, выход, переименование, очистка истории)
 */

import { useCallback } from 'react';
import { useChatStore } from '@shared/store/chatStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChatStackParamList } from '@navigation/types';

type ChatNavigationProp = NativeStackNavigationProp<ChatStackParamList>;

interface UseChatSettingsActionsReturn {
  deleteChat: (clearHistory?: boolean) => Promise<void>;
  leaveChat: () => Promise<void>;
  renameChat: (newName: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useChatSettingsActions = (chatId: number): UseChatSettingsActionsReturn => {
  const navigation = useNavigation<ChatNavigationProp>();
  const { showError } = useNotification();

  const deleteChatAction = useChatStore((state) => state.deleteChat);
  const leaveChatAction = useChatStore((state) => state.leaveChat);
  const updateChatAction = useChatStore((state) => state.updateChat);
  const clearChatHistoryAction = useChatStore((state) => state.clearChatHistory);

  // Удаление чата
  const deleteChat = useCallback(async (clearHistory: boolean = false) => {
    try {
      await deleteChatAction(chatId, clearHistory);
      navigation.navigate('ChatList');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      showError('Не удалось удалить чат');
      throw error;
    }
  }, [chatId, deleteChatAction, navigation, showError]);

  // Выход из чата
  const leaveChat = useCallback(async () => {
    try {
      await leaveChatAction(chatId);
      navigation.navigate('ChatList');
    } catch (error) {
      console.error('Failed to leave chat:', error);
      showError('Не удалось покинуть чат');
      throw error;
    }
  }, [chatId, leaveChatAction, navigation, showError]);

  // Переименование чата
  const renameChat = useCallback(async (newName: string) => {
    try {
      await updateChatAction(chatId, { name: newName });
      navigation.setParams({ chatName: newName });
    } catch (error) {
      console.error('Failed to rename chat:', error);
      showError('Не удалось переименовать чат');
      throw error;
    }
  }, [chatId, updateChatAction, navigation, showError]);

  // Очистка истории
  const clearHistory = useCallback(async () => {
    try {
      await clearChatHistoryAction(chatId);
      navigation.goBack();
    } catch (error) {
      console.error('Failed to clear history:', error);
      showError('Не удалось очистить историю');
      throw error;
    }
  }, [chatId, clearChatHistoryAction, navigation, showError]);

  return {
    deleteChat,
    leaveChat,
    renameChat,
    clearHistory,
  };
};
