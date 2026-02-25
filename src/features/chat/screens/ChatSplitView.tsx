/**
 * Chat Split View
 * Split-view режим для широких экранов: список чатов слева, выбранный чат справа
 */

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shared/hooks/useTheme';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import { useDesktopNavigation } from '@shared/contexts/DesktopNavigationContext';
import { ChatStackParamList } from '@navigation/types';
import { Chat } from '../types/chat.types';
import ChatListScreen from './ChatListScreen';
import ChatScreen from './ChatScreen';
import ThreadScreen from './ThreadScreen';
import { ChatEmptyPlaceholder } from '../components/states/ChatEmptyPlaceholder';
import { ChatDesktopHeader } from '../components/headers/ChatDesktopHeader';
import { ChatSettingsModal } from '../components/modals/ChatSettingsModal';
import { getChatDisplayName, getChatDisplayAvatar } from '../utils/chatUtils';

type ChatNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'Chat'>;

export const ChatSplitView: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<ChatNavigationProp>();
  const desktopNav = useDesktopNavigation();
  const currentUser = useAuthStore((state) => state.user);
  const chats = useChatStore((state) => state.chats);
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const setSelectedChatId = useChatStore((state) => state.setSelectedChatId);

  // State for settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // State for inline thread view
  const [threadInfo, setThreadInfo] = useState<{ messageId: number; chatId: number; chatName?: string } | null>(null);

  // Force remount counter to ensure ChatScreen reloads when coming back from other tabs
  const [mountKey, setMountKey] = useState(0);

  // Track if this is initial mount
  const mountCountRef = useRef(0);

  // Increment mount key on every mount to force ChatScreen reload
  useEffect(() => {
    mountCountRef.current += 1;

    if (mountCountRef.current > 1) {
      // Not initial mount - force reload
      setMountKey(prev => prev + 1);
    }
  }, []);

  // Also increment when selectedChatId changes
  useEffect(() => {
    if (mountCountRef.current > 0 && selectedChatId) {
      setMountKey(prev => prev + 1);
    }
  }, [selectedChatId]);

  // Handle navigation params from desktop navigation context
  useEffect(() => {
    if (desktopNav.navigationParams?.chatId) {
      const chatId = desktopNav.navigationParams.chatId;
      if (typeof chatId === 'number' && chatId !== selectedChatId) {
        setSelectedChatId(chatId);
      }
      // Clear navigation params after processing
      desktopNav.clearNavigationParams();
    }
  }, [desktopNav.navigationParams, selectedChatId, setSelectedChatId, desktopNav]);

  // Получаем полный объект чата для отображения аватара и статуса
  const selectedChat = useMemo(() => {
    return chats.find((c) => c.id === selectedChatId);
  }, [chats, selectedChatId]);

  // Проверяем, что выбранный чат существует, если нет - сбрасываем
  useEffect(() => {
    if (selectedChatId && !selectedChat) {
      // Чат был удален, сбрасываем выбор
      setSelectedChatId(null);
      // Закрываем модальное окно настроек, если оно было открыто
      setShowSettingsModal(false);
    }
  }, [selectedChatId, selectedChat, setSelectedChatId]);

  // Вычисляем отображаемое имя и аватар
  const displayName = useMemo(() => {
    if (!selectedChat) return '';
    return getChatDisplayName(selectedChat, currentUser?.id);
  }, [selectedChat, currentUser?.id]);

  const displayAvatar = useMemo(() => {
    if (!selectedChat) return undefined;
    return getChatDisplayAvatar(selectedChat, currentUser?.id);
  }, [selectedChat, currentUser?.id]);

  const handleChatSelect = useCallback((chat: Chat) => {
    setSelectedChatId(chat.id);
    setThreadInfo(null);
  }, [setSelectedChatId]);

  const handleSettingsPress = useCallback(() => {
    if (selectedChatId) {
      setShowSettingsModal(true);
    }
  }, [selectedChatId]);

  const handleThreadPress = useCallback((messageId: number, chatId: number, chatName?: string) => {
    setThreadInfo({ messageId, chatId, chatName });
  }, []);

  const handleThreadBack = useCallback(() => {
    setThreadInfo(null);
  }, []);

  return (
    <View style={styles.container}>
      {/* Список чатов слева */}
      <View style={[styles.chatList, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ChatListScreen onChatSelect={handleChatSelect} isDesktopMode={true} />
      </View>

      {/* Чат или заглушка справа */}
      <View style={[styles.chatDetail, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {selectedChatId ? (
          <>
            {/* Header for desktop mode */}
            <ChatDesktopHeader
              chatName={displayName}
              chatAvatar={displayAvatar}
              statusText={selectedChat?.type === 'private' ? undefined : `${selectedChat?.members?.length || 0} участников`}
              onSettingsPress={handleSettingsPress}
            />

            {/* Chat content or Thread */}
            <View style={styles.chatContent}>
              {threadInfo ? (
                <ThreadScreen
                  key={`thread-${threadInfo.messageId}`}
                  chatId={threadInfo.chatId}
                  messageId={threadInfo.messageId}
                  chatName={threadInfo.chatName}
                  onBack={handleThreadBack}
                />
              ) : (
                <ChatScreen
                  key={`chat-${selectedChatId}-mount-${mountKey}`}
                  route={{
                    key: `chat-${selectedChatId}`,
                    name: 'Chat',
                    params: {
                      chatId: selectedChatId,
                      chatName: displayName,
                      unreadCount: selectedChat?.unread_count || 0,
                    },
                  } as any}
                  navigation={navigation as any}
                  onThreadPress={handleThreadPress}
                />
              )}
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
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
    marginRight: 0,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  chatDetail: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
    marginLeft: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  chatContent: {
    flex: 1,
  },
});

export default ChatSplitView;
