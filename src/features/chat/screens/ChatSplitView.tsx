/**
 * Chat Split View
 * Split-view режим для широких экранов: список чатов слева, выбранный чат справа
 */

import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shared/hooks/useTheme';
import { useChatSelection } from '@shared/contexts/ChatSelectionContext';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import { ChatStackParamList } from '@navigation/types';
import { Chat } from '../types/chat.types';
import ChatListScreen from './ChatListScreen';
import ChatScreen from './ChatScreen';
import { ChatEmptyPlaceholder } from '../components/states/ChatEmptyPlaceholder';
import { ChatDesktopHeader } from '../components/headers/ChatDesktopHeader';
import { ChatSettingsModal } from '../components/modals/ChatSettingsModal';
import { getChatDisplayName, getChatDisplayAvatar } from '../utils/chatUtils';

type ChatNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'Chat'>;

export const ChatSplitView: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<ChatNavigationProp>();
  const { selectedChatId, selectedChatName, selectedChatUnreadCount, selectChat } = useChatSelection();
  const currentUser = useAuthStore((state) => state.user);
  const chats = useChatStore((state) => state.chats);

  // State for settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Получаем полный объект чата для отображения аватара и статуса
  const selectedChat = useMemo(() => {
    return chats.find((c) => c.id === selectedChatId);
  }, [chats, selectedChatId]);

  // Вычисляем отображаемое имя и аватар
  const displayName = useMemo(() => {
    if (!selectedChat) return selectedChatName;
    return getChatDisplayName(selectedChat, currentUser?.id);
  }, [selectedChat, selectedChatName, currentUser?.id]);

  const displayAvatar = useMemo(() => {
    if (!selectedChat) return undefined;
    return getChatDisplayAvatar(selectedChat, currentUser?.id);
  }, [selectedChat, currentUser?.id]);

  const handleChatSelect = useCallback((chat: Chat) => {
    selectChat(chat.id, chat.name || '', chat.unread_count || 0);
  }, [selectChat]);

  const handleSettingsPress = useCallback(() => {
    if (selectedChatId) {
      setShowSettingsModal(true);
    }
  }, [selectedChatId]);

  return (
    <View style={styles.container}>
      {/* Список чатов слева */}
      <View style={[styles.chatList, { borderRightWidth: 1, borderRightColor: theme.border }]}>
        <ChatListScreen onChatSelect={handleChatSelect} isDesktopMode={true} />
      </View>

      {/* Чат или заглушка справа */}
      <View style={styles.chatDetail}>
        {selectedChatId ? (
          <>
            {/* Header for desktop mode */}
            <ChatDesktopHeader
              chatName={displayName}
              chatAvatar={displayAvatar}
              statusText={selectedChat?.type === 'private' ? undefined : `${selectedChat?.members?.length || 0} участников`}
              onSettingsPress={handleSettingsPress}
            />

            {/* Chat content */}
            <View style={styles.chatContent}>
              <ChatScreen
                route={{
                  key: `chat-${selectedChatId}`,
                  name: 'Chat',
                  params: {
                    chatId: selectedChatId,
                    chatName: selectedChatName,
                    unreadCount: selectedChatUnreadCount,
                  },
                } as any}
                navigation={navigation as any}
              />
            </View>
          </>
        ) : (
          <ChatEmptyPlaceholder />
        )}
      </View>

      {/* Settings Modal */}
      {selectedChatId && (
        <ChatSettingsModal
          visible={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          chatId={selectedChatId}
          chatName={displayName}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  chatList: {
    width: 420,
    minWidth: 360,
    maxWidth: 480,
    position: 'relative',
    zIndex: 10,
    overflow: 'hidden',
  },
  chatDetail: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  chatContent: {
    flex: 1,
  },
});

export default ChatSplitView;
