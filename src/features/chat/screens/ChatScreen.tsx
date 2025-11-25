import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChatStackParamList } from '@navigation/types';
import { useTheme } from '@shared/hooks/useTheme';
import { useChatMessages } from '../hooks/useChatMessages';
import { useChatActions } from '../hooks/useChatActions';
import { useChatScroll } from '../hooks/useChatScroll';
import { useChatScreenState } from '../hooks/useChatScreenState';
import { useSelectionMode } from '../hooks/useSelectionMode';
import { useChatNavigation } from '../hooks/useChatNavigation';
import { websocketService } from '@services/websocket.service';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatScreenContent } from '../components/ChatScreenContent';
import { ChatModals } from '../components/ChatModals';
import {
  canDeleteForEveryone as checkCanDeleteForEveryone,
  getUserRoleInChat,
  isUserAdmin,
  getTypingUserNames,
} from '../utils/chatScreenHelpers';

type Props = NativeStackScreenProps<ChatStackParamList, 'Chat'>;

/**
 * Refactored Chat Screen - Clean and modular
 */
export const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { chatId, chatName, unreadCount: routeUnreadCount } = route.params;
  const chatIdNum = useMemo(() => Number(chatId), [chatId]);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Fixed input height
  const inputHeight = 72;

  // Custom hooks for state management
  const {
    membersModalVisible,
    setMembersModalVisible,
    pollModalVisible,
    setPollModalVisible,
    selectedPollId,
    setSelectedPollId,
    isConnected,
    setIsConnected,
    isLayoutReady,
    setIsLayoutReady,
    contentReady,
    setContentReady,
    keyboardHeight,
    setKeyboardHeight,
    showUnreadBanner,
    setShowUnreadBanner,
    ignoreReadReceipts,
    setIgnoreReadReceipts,
    initialUnreadCount,
    setInitialUnreadCount,
    savedUnreadCount,
    setSavedUnreadCount,
    chatData,
    setChatData,
    setIsLoadingChat,
    resetChatState,
  } = useChatScreenState();

  const {
    selectionMode,
    selectedMessages,
    handleEnterSelectionMode,
    handleExitSelectionMode,
    handleToggleMessageSelection,
    handleBulkDelete,
  } = useSelectionMode();

  // Data hooks
  const { messages, messageListItems, messagesKey, firstUnreadIndex, unreadCount } =
    useChatMessages(chatIdNum, ignoreReadReceipts, savedUnreadCount);

  const {
    editingMessage,
    setEditingMessage,
    replyingToMessage,
    setReplyingToMessage,
    highlightedMessageId,
    setHighlightedMessageId,
    forwardingMessage,
    setForwardingMessage,
    selectedFileIds,
    setSelectedFileIds,
    handleSendMessage,
    handleReply,
    handleEdit,
    handleDelete,
    handleRestore,
    handleDeletePermanent,
    handlePin,
    handleUnpin,
    handleForward,
    handleForwardToChat,
  } = useChatActions(chatIdNum);

  const {
    listRef,
    initialScrolled,
    showScrollToBottom,
    currentDateLabel,
    showDateHeader,
    isLoadingMore,
    hasReachedBottom,
    initialScrollIndex,
    isScrollingToUnread,
    scrollSessionKey,
    handleScroll,
    handleContentSizeChange,
    handleScrollToBottom,
    handleReplyPress: scrollToMessage,
    onViewableItemsChanged,
    viewabilityConfig,
    resetScroll,
  } = useChatScroll(chatIdNum, messages, firstUnreadIndex, unreadCount);


  // Store
  const {
    isLoading,
    loadMessages,
    getChatById,
    setActiveChat,
    markChatAsRead,
    typingUsers,
    getPinnedMessages,
    set: setError,
    chats,
  } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);

  const chatFromStore = chats.find((c) => c.id === chatIdNum);
  const chat = chatData || chatFromStore;

  // Загрузка чата если не найден в store
  useEffect(() => {
    const loadChat = async () => {
      if (chatFromStore) {
        setChatData(chatFromStore);
        return;
      }

      // Если чат не найден в store, загружаем через API
      try {
        setIsLoadingChat(true);
        const { getChat } = await import('../api/chat.api');
        const fetchedChat = await getChat(chatIdNum);
        setChatData(fetchedChat);
      } catch (error) {
        console.error(`Failed to load chat ${chatIdNum}:`, error);
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadChat();
  }, [chatIdNum, chatFromStore]);

  // Computed values
  const currentUserRole = useMemo(
    () => getUserRoleInChat(chat, currentUser?.id),
    [chat, currentUser?.id]
  );

  const isAdmin = useMemo(() => isUserAdmin(currentUserRole), [currentUserRole]);

  const canDeleteForEveryone = useMemo(
    () =>
      checkCanDeleteForEveryone(chat || null, selectedMessages, messages, currentUser?.id, isAdmin),
    [chat, selectedMessages, messages, currentUser?.id, isAdmin]
  );

  const typingUserNames = useMemo(
    () => getTypingUserNames(typingUsers[chatIdNum] || [], currentUser?.id),
    [typingUsers, chatIdNum, currentUser]
  );

  const pinnedMessages = useMemo(
    () => getPinnedMessages(chatIdNum),
    [chatIdNum, messages, getPinnedMessages]
  );

  // Управление клавиатурой
  useEffect(() => {
    const keyboardShow = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardShow.remove();
      keyboardHide.remove();
    };
  }, []);

  // Сразу показываем UI
  useEffect(() => {
    setIsLayoutReady(true);
  }, []);

  // Показываем контент сразу без задержки
  useFocusEffect(
    React.useCallback(() => {
      setContentReady(true);

      return () => {
        setContentReady(false);
      };
    }, [])
  );

  // Проверка подключения
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(websocketService.isConnected());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Navigation and header setup
  useChatNavigation({
    chatId: chatIdNum,
    chatName,
    chat,
    currentUserId: currentUser?.id,
    typingUserNames,
    isConnected,
  });

  // Chat initialization
  useEffect(() => {
    resetScroll();
    resetChatState();

    const chat = getChatById(chatIdNum);
    const unreadCountToSave = chat?.unread_count ?? routeUnreadCount ?? 0;
    setSavedUnreadCount(unreadCountToSave);

    if (chat) {
      setActiveChat(chat);
    }

    loadMessages(chatIdNum).catch((error) => {
      console.error(`Failed to load messages for chat ${chatIdNum}:`, error);
    });

    // WebSocket connection
    const connectWebSocket = async () => {
      if (!websocketService.isConnected()) {
        const token = (await AsyncStorage.getItem('jwtToken')) || '';
        if (token) {
          await websocketService.connect(token);
          await new Promise<void>((resolve) => setTimeout(resolve, 500));
        } else {
          setError({ error: 'No authentication token found' });
          return;
        }
      }
    };
    connectWebSocket();

    return () => {
      setActiveChat(null);
    };
  }, [chatIdNum, resetScroll, resetChatState, getChatById, routeUnreadCount, setSavedUnreadCount, setActiveChat, loadMessages, setError]);

  // Запоминаем начальное количество непрочитанных при первой загрузке
  useEffect(() => {
    if (messages.length > 0 && ignoreReadReceipts && unreadCount > 0 && initialUnreadCount === 0) {
      setInitialUnreadCount(unreadCount);
    }
  }, [messages.length, ignoreReadReceipts, unreadCount, initialUnreadCount]);

  // Отключаем игнорирование read_receipts после достижения низа или открытия клавиатуры
  useEffect(() => {
    if (initialScrolled && ignoreReadReceipts && (hasReachedBottom || keyboardHeight > 0)) {
      setIgnoreReadReceipts(false);
      setInitialUnreadCount(0);
    }
  }, [initialScrolled, ignoreReadReceipts, hasReachedBottom, keyboardHeight]);

  // Отметить как прочитанное и скрыть баннер
  useEffect(() => {
    if (messages.length > 0 && initialScrolled && (hasReachedBottom || keyboardHeight > 0)) {
      const markReadTimer = setTimeout(async () => {
        try {
          await markChatAsRead(chatIdNum);
          if (showUnreadBanner) {
            setShowUnreadBanner(false);
          }
        } catch (error: any) {
          // Игнорируем ошибки 403 - пользователь может не иметь доступа
          if (error?.status !== 403) {
            console.error(`❌ [ChatScreen] Ошибка пометки чата как прочитанного:`, error);
          }
        }
      }, 500);
      return () => clearTimeout(markReadTimer);
    }
  }, [chatIdNum, messages.length, markChatAsRead, initialScrolled, hasReachedBottom, keyboardHeight, showUnreadBanner]);

  // Event handlers
  const handleTyping = (isTyping: boolean) => {
    if (websocketService.isConnected() && getChatById(chatIdNum)) {
      websocketService.sendTyping(chatIdNum, isTyping);
    }
  };

  const handlePollPress = (pollId: number) => {
    setSelectedPollId(pollId);
    setPollModalVisible(true);
  };

  const handleTaskPress = (taskId: number) => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('TaskDetail' as never, { taskId, fromChat: true } as never);
    }
  };

  const handleReplyPressWithHighlight = (messageId: number) => {
    scrollToMessage(messageId, setHighlightedMessageId);
  };

  const handlePinnedMessagePress = (messageId: number) => {
    handleReplyPressWithHighlight(messageId);
  };

  const onBulkDelete = async (deleteFor: 'everyone' | 'me') => {
    await handleBulkDelete(deleteFor, handleDelete);
  };

  // UI state
  if (!isLayoutReady) {
    return <View style={[styles.container, { backgroundColor: theme.background }]} />;
  }

  const shouldShowContent = contentReady && !isScrollingToUnread;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ChatScreenContent
        chatId={chatIdNum}
        messageListItems={messageListItems}
        messagesKey={messagesKey}
        firstUnreadIndex={firstUnreadIndex}
        unreadCount={unreadCount}
        showUnreadBanner={showUnreadBanner}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        inputHeight={inputHeight}
        insetsBottom={insets.bottom}
        listRef={listRef}
        highlightedMessageId={highlightedMessageId}
        initialScrollIndex={initialScrollIndex}
        scrollSessionKey={scrollSessionKey}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRestore={handleRestore}
        onDeletePermanent={handleDeletePermanent}
        onPin={handlePin}
        onUnpin={handleUnpin}
        onForward={handleForward}
        onReplyPress={handleReplyPressWithHighlight}
        onPollPress={handlePollPress}
        onTaskPress={handleTaskPress}
        selectionMode={selectionMode}
        selectedMessages={selectedMessages}
        onEnterSelectionMode={handleEnterSelectionMode}
        onToggleMessageSelection={handleToggleMessageSelection}
        chatType={chat?.type}
        userRole={currentUserRole}
        pinnedMessages={pinnedMessages}
        currentUserRole={currentUserRole}
        currentDateLabel={currentDateLabel}
        showDateHeader={showDateHeader}
        showScrollToBottom={showScrollToBottom}
        isScrollingToUnread={isScrollingToUnread}
        keyboardHeight={keyboardHeight}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        replyingToMessage={replyingToMessage}
        onCancelReply={() => setReplyingToMessage(null)}
        selectedFileIds={selectedFileIds}
        onFilesSelected={(fileIds) => setSelectedFileIds((prev) => [...prev, ...fileIds])}
        onRemoveFile={(fileId) => setSelectedFileIds((prev) => prev.filter((id) => id !== fileId))}
        onScrollToBottom={handleScrollToBottom}
        onPinnedMessagePress={handlePinnedMessagePress}
        onBulkDelete={onBulkDelete}
        onExitSelectionMode={handleExitSelectionMode}
        canDeleteForEveryone={canDeleteForEveryone}
        shouldShowContent={shouldShowContent}
      />

      <ChatModals
        chatId={chatIdNum}
        currentUserId={currentUser?.id}
        creatorId={chat?.creator_id}
        membersModalVisible={membersModalVisible}
        onCloseMembersModal={() => setMembersModalVisible(false)}
        forwardingMessage={forwardingMessage}
        onCloseForwardModal={() => setForwardingMessage(null)}
        onForwardToChat={handleForwardToChat}
        pollModalVisible={pollModalVisible}
        selectedPollId={selectedPollId}
        onClosePollModal={() => {
          setPollModalVisible(false);
          setSelectedPollId(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

export default ChatScreen;
