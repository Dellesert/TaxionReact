/**
 * Chat List Screen
 * Экран списка чатов (Refactored)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ChatStackParamList } from '@navigation/types';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { useTheme } from '@shared/hooks/useTheme';
import { Chat, ChatType } from '../types/chat.types';
import { websocketService } from '@services/websocket.service';

// Custom hooks
import { useChatData } from '../hooks/useChatData';
import { useChatListActions } from '../hooks/useChatListActions';
import { useChatSwipeGesture } from '../hooks/useChatSwipeGesture';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';

// Components
import { ChatListHeader } from '../components/ChatListHeader';
import { ChatSearchBar } from '../components/ChatSearchBar';
import { ChatListTabs } from '../components/ChatListTabs';
import { ChatActionBar } from '../components/ChatActionBar';
import { ChatListContent, ChatListContentRef } from '../components/ChatListContent';
import { ChatCreateMenu } from '../components/ChatCreateMenu';
import { ChatErrorState } from '../components/ChatErrorState';

// Utils
import { ChatFilter, getTabIndexFromFilter } from '../utils/chatHelpers';

type ChatListNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

const SCREEN_WIDTH = Dimensions.get('window').width;

const ChatListScreen: React.FC = () => {
  const navigation = useNavigation<ChatListNavigationProp>();
  const { theme } = useTheme();
  const { showConfirm } = useActionModal();

  // Ref for ChatListContent
  const chatListRef = useRef<ChatListContentRef>(null);

  // Track last opened chat for smart scrolling
  const lastOpenedChatRef = useRef<{ id: number; lastMessageId: number | null } | null>(null);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<number[]>([]);
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all');
  const [isCreateMenuVisible, setIsCreateMenuVisible] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [tabContainerWidth, setTabContainerWidth] = useState<number>(SCREEN_WIDTH);

  // Custom hooks
  const {
    chats,
    isLoading,
    isLoadingMore,
    hasMoreChats,
    error,
    tabs,
    canLoadMore,
    loadAllTabs,
    switchTab,
    refreshData,
    handleLoadMore,
    loadUnreadCount,
  } = useChatData();

  // Get current user for author comparison
  const currentUser = useAuthStore((state) => state.user);

  const {
    handleDeleteChat,
    handleDeleteSelectedChats,
    handleMarkSelectedAsRead,
    handleTogglePinned,
    handleMarkAsRead,
    handleToggleFavorite,
  } = useChatListActions();

  // Handler declarations (before hook usage)
  const handleSwitchFilter = useCallback(
    async (newFilter: ChatFilter) => {
      setChatFilter(newFilter);
      await switchTab(newFilter);
    },
    [switchTab]
  );

  const { translateX, isSwipingHorizontally, currentTabIndex, swipeGesture, updateTranslateX } =
    useChatSwipeGesture(chatFilter, handleSwitchFilter);

  // Load all tabs on mount
  useEffect(() => {
    loadAllTabs();
  }, [loadAllTabs]);


  // Update unread count when screen gains focus
  // Smart scroll: scroll to top only if user sent a new message
  useFocusEffect(
    useCallback(() => {
      const checkAndScroll = async () => {
        // Always update unread count badge
        await loadUnreadCount();

        // Check if we should scroll to top after returning from chat
        if (lastOpenedChatRef.current && currentUser) {
          const { id, lastMessageId } = lastOpenedChatRef.current;

          // Get current chat data from store (updated via WebSocket)
          const currentChat = chats.find((c) => c.id === id);
          const currentLastMessage = currentChat?.last_message;

          // Check if:
          // 1. There's a new last message (ID changed)
          // 2. The author is the current user (user sent it, not received)
          const hasNewMessage = currentLastMessage?.id !== lastMessageId;
          const userSentMessage = currentLastMessage?.sender_id === currentUser.id;

          console.log('🔍 Smart scroll check:', {
            chatId: id,
            oldMessageId: lastMessageId,
            newMessageId: currentLastMessage?.id,
            messageAuthor: currentLastMessage?.sender_id,
            currentUserId: currentUser.id,
            hasNewMessage,
            userSentMessage,
          });

          // Only scroll if user sent a new message
          if (hasNewMessage && userSentMessage) {
            console.log('✅ User sent message - scrolling to top');
            // Small delay to let chat list reorder, then smooth scroll
            setTimeout(() => {
              chatListRef.current?.scrollToTop();
            }, 100);
          } else {
            console.log('⏭️ No new message from user - preserving scroll position');
          }

          // Reset the tracking
          lastOpenedChatRef.current = null;
        }
        // If no chat was tracked, don't refresh - preserve scroll position
      };

      checkAndScroll();
    }, [loadUnreadCount, chats, currentUser])
  );

  // Monitor WebSocket connection status
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const currentStatus = websocketService.isConnected();
      setIsConnected((prev) => (prev !== currentStatus ? currentStatus : prev));
    }, 500);

    return () => clearInterval(checkInterval);
  }, []);

  // Clear selection when exiting edit mode
  useEffect(() => {
    if (!isEditMode) {
      setSelectedChats([]);
    }
  }, [isEditMode]);

  // Initialize tab index based on active filter
  useEffect(() => {
    const currentIndex = getTabIndexFromFilter(chatFilter);
    currentTabIndex.value = currentIndex;
  }, []);

  // Update handler with updateTranslateX after hook initialization
  useEffect(() => {
    // Sync translations when filter changes
    updateTranslateX(chatFilter);
  }, [chatFilter, updateTranslateX]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    // Reconnect WebSocket if disconnected
    if (!websocketService.isConnected()) {
      websocketService.reconnect();
    }

    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleChatPress = useCallback(
    (chat: Chat) => {
      if (isSwipingHorizontally.value) return;

      if (isEditMode) {
        // Toggle selection in edit mode
        setSelectedChats((prev) =>
          prev.includes(chat.id) ? prev.filter((id) => id !== chat.id) : [...prev, chat.id]
        );
      } else {
        // Save chat state before opening for smart scroll detection
        lastOpenedChatRef.current = {
          id: chat.id,
          lastMessageId: chat.last_message?.id || null,
        };

        console.log('💾 Saved chat state for smart scroll:', {
          chatId: chat.id,
          chatName: chat.name,
          lastMessageId: chat.last_message?.id,
        });

        // Navigate to chat
        navigation.navigate('Chat', {
          chatId: chat.id,
          chatName: chat.name,
          unreadCount: chat.unread_count || 0,
        });
      }
    },
    [isEditMode, navigation, isSwipingHorizontally]
  );

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev);
    if (isEditMode) {
      setSelectedChats([]);
    } else {
      setIsSearchVisible(false);
      setSearchQuery('');
    }
  }, [isEditMode]);

  const handleNewChat = useCallback(() => {
    setIsCreateMenuVisible(true);
  }, []);

  const handleCreateChatType = useCallback(
    (chatType: ChatType) => {
      setIsCreateMenuVisible(false);
      navigation.navigate('CreateChat', { initialChatType: chatType });
    },
    [navigation]
  );

  const handleDeleteSelected = useCallback(() => {
    if (selectedChats.length === 0) return;

    showConfirm(
      'Удалить чаты',
      `Удалить выбранные чаты (${selectedChats.length})?`,
      async () => {
        try {
          await handleDeleteSelectedChats(selectedChats);
          setSelectedChats([]);
          setIsEditMode(false);
        } catch (error) {
          console.error('Failed to delete chats:', error);
        }
      },
      undefined,
      { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
    );
  }, [selectedChats, handleDeleteSelectedChats, showConfirm]);

  const handleMarkSelectedRead = useCallback(async () => {
    if (selectedChats.length === 0) return;

    try {
      await handleMarkSelectedAsRead(selectedChats);
      setSelectedChats([]);
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to mark chats as read:', error);
    }
  }, [selectedChats, handleMarkSelectedAsRead]);

  const handleRetry = useCallback(() => {
    if (!websocketService.isConnected()) {
      websocketService.reconnect();
    }
    loadAllTabs();
  }, [loadAllTabs]);

  // Error state
  if (error && chats.length === 0 && !isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
        edges={['top', 'left', 'right']}
      >
        <ScreenHeader title="Чаты" />
        <ChatErrorState error={error} onRetry={handleRetry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.card }]}
      edges={['top', 'left', 'right']}
    >
      <ScreenHeader
        title="Чаты"
        customContent={
          <>
            <ChatListHeader
              isEditMode={isEditMode}
              isConnected={isConnected}
              onToggleEditMode={toggleEditMode}
              onToggleSearch={() => setIsSearchVisible(!isSearchVisible)}
              onNewChat={handleNewChat}
              isSearchVisible={isSearchVisible}
            />

            <ChatSearchBar
              isVisible={isSearchVisible}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            <ChatListTabs
              activeFilter={chatFilter}
              onFilterChange={handleSwitchFilter}
              tabContainerWidth={tabContainerWidth}
              currentTabIndex={currentTabIndex}
              onLayout={(e) => setTabContainerWidth(e.nativeEvent.layout.width)}
            />
          </>
        }
      />

      {/* Content */}
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ChatActionBar
          selectedCount={selectedChats.length}
          onMarkAsRead={handleMarkSelectedRead}
          onDelete={handleDeleteSelected}
        />

        <ChatListContent
          ref={chatListRef}
          chatFilter={chatFilter}
          tabs={tabs}
          searchQuery={searchQuery}
          isLoading={isLoading}
          refreshing={refreshing}
          canLoadMore={canLoadMore}
          hasMoreChats={hasMoreChats}
          isLoadingMore={isLoadingMore}
          isEditMode={isEditMode}
          selectedChats={selectedChats}
          translateX={translateX}
          swipeGesture={swipeGesture}
          onRefresh={handleRefresh}
          onLoadMore={handleLoadMore}
          onChatPress={handleChatPress}
          onToggleFavorite={handleToggleFavorite}
          onTogglePinned={handleTogglePinned}
          onMarkAsRead={handleMarkAsRead}
          onDeleteChat={handleDeleteChat}
        />
      </View>

      {/* Modals */}
      <ChatCreateMenu
        visible={isCreateMenuVisible}
        onClose={() => setIsCreateMenuVisible(false)}
        onCreateChatType={handleCreateChatType}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ChatListScreen;
