/**
 * Chat List Screen
 * Экран списка чатов (Refactored)
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ChatStackParamList } from '@navigation/types';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useChatSelection } from '@shared/contexts/ChatSelectionContext';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { Chat, ChatType } from '../types/chat.types';
import { TitleBarChatControls } from '../components/common/TitleBarChatControls';
import { websocketService } from '@services/websocket.service';

// Custom hooks
import { useChatData } from '../hooks/useChatData';
import { useChatListActions } from '../hooks/useChatListActions';
import { useChatSwipeGesture } from '../hooks/useChatSwipeGesture';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';

// Components
import { ChatListHeader } from '../components/headers/ChatListHeader';
import { ChatSearchBar } from '../components/chat-list/ChatSearchBar';
import { ChatListTabs } from '../components/common/ChatListTabs';
import { ChatActionBar } from '../components/common/ChatActionBar';
import { ChatListContent, ChatListContentRef } from '../components/chat-list/ChatListContent';
import { ChatCreateMenu } from '../components/modals/ChatCreateMenu';
import { ChatErrorState } from '../components/states/ChatErrorState';
import { CreateChatModal } from '../components/modals/CreateChatModal';

// Utils
import { ChatFilter, getTabIndexFromFilter } from '../utils/chatHelpers';

type ChatListNavigationProp = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

const SCREEN_WIDTH = Dimensions.get('window').width;

interface ChatListScreenProps {
  onChatSelect?: (chat: Chat) => void;
  isDesktopMode?: boolean;
}

const ChatListScreen: React.FC<ChatListScreenProps> = ({ onChatSelect, isDesktopMode = false }) => {
  const navigation = useNavigation<ChatListNavigationProp>();
  const { theme, isDark } = useTheme();
  const { showConfirm } = useActionModal();
  const { selectChat } = useChatSelection();
  const isWideScreen = useIsWideScreen();

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;
  const isDesktop = isWideScreen;

  // Ref for ChatListContent
  const chatListRef = useRef<ChatListContentRef>(null);

  // Track last opened chat for smart scrolling
  const lastOpenedChatRef = useRef<{ id: number; lastMessageId: number | null } | null>(null);

  // Track previous search query for scroll-to-top on clear
  const prevSearchQueryRef = useRef<string>('');

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
  const [showCreateChatModal, setShowCreateChatModal] = useState(false);
  const [createChatType, setCreateChatType] = useState<ChatType>('group');

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
    silentRefreshCurrentTab,
    handleLoadMore,
    loadUnreadCount,
  } = useChatData();

  // Get current user for author comparison
  const currentUser = useAuthStore((state) => state.user);

  // Get refreshing state from store
  const isRefreshingChats = useChatStore((state) => state.isRefreshingChats);


  const {
    handleDeleteChat,
    handleDeleteSelectedChats,
    handleMarkSelectedAsRead,
    handleTogglePinned,
    handleMarkAsRead,
    handleToggleFavorite,
    handleClearHistory,
  } = useChatListActions();

  const muteChat = useChatStore((state) => state.muteChat);
  const unmuteChat = useChatStore((state) => state.unmuteChat);

  const handleMuteChat = useCallback(async (chatId: number, duration: '1h' | '12h' | 'forever') => {
    try {
      await muteChat(chatId, duration);
    } catch (error) {
      console.error('Failed to mute chat:', error);
    }
  }, [muteChat]);

  const handleUnmuteChat = useCallback(async (chatId: number) => {
    try {
      await unmuteChat(chatId);
    } catch (error) {
      console.error('Failed to unmute chat:', error);
    }
  }, [unmuteChat]);

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


  // Update unread count and refresh chats when screen gains focus
  // Smart scroll: scroll to top only if user sent a new message
  useFocusEffect(
    useCallback(() => {
      // Set status bar style when screen gains focus
      setStatusBarStyle(isDark ? 'light' : 'dark');

      const checkAndScroll = async () => {
        // Refresh chat list and unread count
        await Promise.all([silentRefreshCurrentTab(), loadUnreadCount()]);

        // Check if we should scroll to top after returning from chat
        if (lastOpenedChatRef.current && currentUser) {
          const { id, lastMessageId } = lastOpenedChatRef.current;

          // Get current chat data from store (updated via WebSocket)
          const currentChats = useChatStore.getState().chats;
          const currentChat = currentChats.find((c) => c.id === id);
          const currentLastMessage = currentChat?.last_message;

          // Check if:
          // 1. There's a new last message (ID changed)
          // 2. The author is the current user (user sent it, not received)
          const hasNewMessage = currentLastMessage?.id !== lastMessageId;
          const userSentMessage = currentLastMessage?.sender_id === currentUser.id;

          // Only scroll if user sent a new message
          if (hasNewMessage && userSentMessage) {
            // Small delay to let chat list reorder, then smooth scroll
            setTimeout(() => {
              chatListRef.current?.scrollToTop();
            }, 100);
          }

          // Reset the tracking
          lastOpenedChatRef.current = null;
        }
        // If no chat was tracked, don't refresh - preserve scroll position
      };

      checkAndScroll();
    }, [silentRefreshCurrentTab, loadUnreadCount, currentUser, isDark])
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

  // Scroll to top when search query is cleared
  useEffect(() => {
    if (prevSearchQueryRef.current.length > 0 && searchQuery.length === 0) {
      chatListRef.current?.scrollToTop();
    }
    prevSearchQueryRef.current = searchQuery;
  }, [searchQuery]);

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

        // Desktop mode: call onChatSelect callback
        if (isDesktopMode && onChatSelect) {
          onChatSelect(chat);
        } else {
          // Mobile mode: navigate to chat
          navigation.navigate('Chat', {
            chatId: chat.id,
            chatName: chat.name,
            unreadCount: chat.unread_count || 0,
          });
        }
      }
    },
    [isEditMode, navigation, isSwipingHorizontally, isDesktopMode, onChatSelect]
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

  // Handler for create chat type from TitleBar menu
  const handleTitleBarCreateChatType = useCallback(
    (chatType: ChatType) => {
      setIsCreateMenuVisible(false);
      // In desktop split view mode, show modal
      setCreateChatType(chatType);
      setShowCreateChatModal(true);
    },
    []
  );

  // TitleBar left controls - edit/menu button
  const titleBarLeftControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <TitleBarChatControls
        isEditMode={isEditMode}
        onToggleEditMode={toggleEditMode}
        showEditOnly
      />
    );
  }, [isElectron, isDesktop, isEditMode, toggleEditMode]);

  // TitleBar right controls - create button only
  const titleBarRightControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <TitleBarChatControls
        isEditMode={isEditMode}
        onToggleEditMode={toggleEditMode}
        onNewChat={handleNewChat}
        isCreateMenuVisible={isCreateMenuVisible}
        onCreateMenuClose={() => setIsCreateMenuVisible(false)}
        onCreateChatType={handleTitleBarCreateChatType}
        showCreateOnly
      />
    );
  }, [isElectron, isDesktop, isEditMode, toggleEditMode, handleNewChat, isCreateMenuVisible, handleTitleBarCreateChatType]);

  // Integrate controls with TitleBar in Electron
  useTitleBarControlsIntegration({
    pageTitle: 'Чаты',
    leftControls: titleBarLeftControls,
    rightControls: titleBarRightControls,
    isPageLoading: !isConnected || isRefreshingChats,
    enabled: isElectron && isDesktop,
  });

  const handleCreateChatType = useCallback(
    (chatType: ChatType) => {
      setIsCreateMenuVisible(false);
      if (isDesktopMode) {
        // Desktop mode: show modal
        setCreateChatType(chatType);
        setShowCreateChatModal(true);
      } else {
        // Mobile mode: navigate
        navigation.navigate('CreateChat', { initialChatType: chatType as 'group' | 'private' | 'channel' });
      }
    },
    [navigation, isDesktopMode]
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
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ScreenHeader title="Чаты" />
        <ChatErrorState error={error} onRetry={handleRetry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.card }]}
      edges={['left', 'right']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScreenHeader
        title="Чаты"
        customContent={
          <>
            <ChatListHeader
              isEditMode={isEditMode}
              isConnected={isConnected}
              isRefreshing={isRefreshingChats}
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
          onClearHistory={handleClearHistory}
          onMuteChat={handleMuteChat}
          onUnmuteChat={handleUnmuteChat}
        />
      </View>

      {/* Modals - ChatCreateMenu hidden on Electron desktop (shown in TitleBar) */}
      {!(isElectron && isDesktop) && (
        <ChatCreateMenu
          visible={isCreateMenuVisible}
          onClose={() => setIsCreateMenuVisible(false)}
          onCreateChatType={handleCreateChatType}
          isDesktopMode={isDesktopMode}
        />
      )}

      {/* Create Chat Modal (Desktop mode only) */}
      {isDesktopMode && (
        <CreateChatModal
          visible={showCreateChatModal}
          onClose={() => setShowCreateChatModal(false)}
          initialChatType={createChatType}
          onChatCreated={(chat) => {
            // Close modal and select the new chat in split view
            setShowCreateChatModal(false);
            selectChat(chat.id, chat.name || '', 0);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ChatListScreen;
