import { useEffect, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { Chat } from '../types/chat.types';
import { ChatHeader } from '../components/headers/ChatHeader';
import {
  getChatDisplayName,
  getChatDisplayAvatar,
  getPersonalChatCompanion,
  getUserStatusText,
} from '../utils/chatUtils';
import { formatTypingText, getMembersText } from '../utils/chatScreenHelpers';

interface UseChatNavigationProps {
  chatId: number;
  chatName: string | undefined;
  chat: Chat | null | undefined;
  currentUserId: number | undefined;
  typingUserNames: string[];
  isConnected: boolean;
  onSearchPress?: () => void;
}

/**
 * Custom hook to handle navigation and header setup
 */
export const useChatNavigation = ({
  chatId,
  chatName,
  chat,
  currentUserId,
  typingUserNames,
  isConnected,
  onSearchPress,
}: UseChatNavigationProps) => {
  const navigation = useNavigation();

  // Calculate header values
  const displayName = useMemo(() => {
    // Always use chatName from route params as fallback to show immediately
    if (!chat) {
      return chatName || 'Чат';
    }

    // Get the computed name from chat object
    const computedName = getChatDisplayName(chat, currentUserId);

    // For private chats, only use computed name if members are loaded
    if (chat.type === 'private' && (!chat.members || chat.members.length === 0)) {
      return chatName || computedName;
    }

    // If computed name is generic fallback, prefer route param
    if (computedName === 'Без названия' && chatName) {
      return chatName;
    }

    return computedName;
  }, [chat, currentUserId, chatName]);

  const displayAvatar = useMemo(
    () => (chat ? getChatDisplayAvatar(chat, currentUserId) : undefined),
    [chat, currentUserId]
  );

  const companion = useMemo(
    () => (chat ? getPersonalChatCompanion(chat, currentUserId) : null),
    [chat, currentUserId]
  );

  const isPrivateChat = chat?.type === 'private';
  const isSavedChat = chat?.type === 'saved';

  const statusText = useMemo(
    () => (companion ? getUserStatusText(companion) : ''),
    [companion]
  );

  const membersText = useMemo(() => getMembersText(chat), [chat]);

  const typingText = useMemo(
    () => formatTypingText(typingUserNames, isPrivateChat),
    [typingUserNames, isPrivateChat]
  );

  const finalStatusText = typingText || (isPrivateChat ? statusText : membersText);

  // Setup navigation header
  useEffect(() => {
    // For saved chat, don't navigate to settings
    const handleHeaderPress = isSavedChat
      ? () => {} // No-op for saved chat
      : () => {
          (navigation as any).navigate('ChatSettings', {
            chatId,
            chatName: displayName,
          });
        };

    navigation.setOptions({
      headerLeft: () => <ChatHeader.Left onBackPress={() => navigation.goBack()} />,
      headerTitle: () => (
        <ChatHeader.Title
          displayName={displayName}
          statusText={finalStatusText}
          membersText={membersText}
          isPrivateChat={isPrivateChat}
          isConnected={isConnected}
          onHeaderPress={handleHeaderPress}
          isSavedChat={isSavedChat}
        />
      ),
      headerTitleAlign: 'center' as const,
      headerRight: () => (
        <ChatHeader.Right
          displayAvatar={displayAvatar}
          displayName={displayName}
          onHeaderPress={handleHeaderPress}
          onSearchPress={onSearchPress}
          isSavedChat={isSavedChat}
        />
      ),
    });
  }, [
    chatId,
    displayName,
    displayAvatar,
    finalStatusText,
    typingText,
    statusText,
    membersText,
    isPrivateChat,
    isSavedChat,
    isConnected,
    onSearchPress,
    navigation,
  ]);

  return {
    displayName,
    displayAvatar,
    isPrivateChat,
  };
};
