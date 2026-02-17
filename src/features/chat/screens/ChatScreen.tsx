import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
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
import { useMessageSearch } from '../hooks/useMessageSearch';
import { websocketService } from '@services/websocket.service';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatScreenContent } from '../components/chat-details/ChatScreenContent';
import { ChatModals } from '../components/modals/ChatModals';
import { ForwardMessagesModal } from '../components/modals/ForwardMessagesModal';
import { MessageSearchOverlay } from '../components/search/MessageSearchOverlay';
import { MediaViewer, MediaItem } from '../components/modals/MediaViewer';
import { Attachment } from '../types/chat.types';
import * as chatApi from '../api/chat.api';
import { replaceLocalhostWithIP } from '../utils/message.utils';
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
  const { chatId, chatName, unreadCount: routeUnreadCount, openSearch: shouldOpenSearch } = route.params;
  const chatIdNum = useMemo(() => Number(chatId), [chatId]);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Fixed input height (без safe area, т.к. safe area добавляется отдельно)
  const inputHeight = 62;

  // State to track if messages are ready
  const [messagesReady, setMessagesReady] = useState(false);
  // State to control delayed loader visibility
  const [showLoader, setShowLoader] = useState(false);

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
    keyboardHeightAnim,
    setKeyboardCallbacks,
    showUnreadBanner,
    setShowUnreadBanner,
    ignoreReadReceipts,
    setIgnoreReadReceipts,
    initialUnreadCount,
    setInitialUnreadCount,
    savedUnreadCount,
    setSavedUnreadCount,
    firstUnreadMessageId,
    setFirstUnreadMessageId,
    chatData,
    setChatData,
    setIsLoadingChat,
    resetChatState,
  } = useChatScreenState();

  const {
    selectionMode,
    selectedMessages,
    forwardModalVisible,
    handleEnterSelectionMode,
    handleExitSelectionMode,
    handleToggleMessageSelection,
    handleBulkDelete,
    handleOpenForwardModal,
    handleCloseForwardModal,
    handleBulkForward,
  } = useSelectionMode();

  // Store - оптимизированные селекторы
  const isLoading = useChatStore((state) => state.isLoading);
  const loadMessages = useChatStore((state) => state.loadMessages);
  const getChatById = useChatStore((state) => state.getChatById);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const markChatAsRead = useChatStore((state) => state.markChatAsRead);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const getPinnedMessages = useChatStore((state) => state.getPinnedMessages);
  const setError = useChatStore((state) => state.set);
  const chats = useChatStore((state) => state.chats);
  const currentUser = useAuthStore((state) => state.user);

  // Data hooks
  const { messages, messageListItems, messagesKey, firstUnreadIndex, unreadCount, detectedFirstUnreadId } =
    useChatMessages(chatIdNum, ignoreReadReceipts, savedUnreadCount, firstUnreadMessageId);

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
    handleSendMessage: originalHandleSendMessage,
    handleReply,
    handleEdit,
    handleDelete,
    handleRestore,
    handleDeletePermanent,
    handlePin,
    handleUnpin,
    handleForward,
    handleForwardToChat,
    pendingVideoFiles,
    handlePendingVideoFiles,
    removePendingVideo,
    handleFilesSelected,
    removeFile,
  } = useChatActions(chatIdNum);

  // Callback для сброса состояния непрочитанных при выходе из jump context
  const handleResetUnreadState = useCallback((newUnreadCount?: number) => {
    setIgnoreReadReceipts(true); // Включаем игнорирование read_receipts для корректного показа плашки
    setFirstUnreadMessageId(null); // Сбрасываем фиксированный ID чтобы пересчитать
    if (newUnreadCount !== undefined && newUnreadCount > 0) {
      setSavedUnreadCount(newUnreadCount); // Устанавливаем количество непрочитанных для useChatMessages
    }
  }, [setIgnoreReadReceipts, setFirstUnreadMessageId, setSavedUnreadCount]);

  const {
    listRef,
    initialScrolled,
    showScrollToBottom,
    currentDateLabel,
    showDateHeader,
    isLoadingMore,
    hasReachedBottom,
    userScrolledToBottom,
    newMessagesCount,
    firstNewMessageIndex,
    initialScrollIndex,
    scrollSessionKey,
    isJumpingToPinned,
    handleScroll,
    handleLoadMore,
    handleContentSizeChange,
    handleScrollToBottom,
    handleReplyPress: scrollToMessage,
    handleKeyboardWillShow,
    handleKeyboardWillHide,
    onViewableItemsChanged,
    viewabilityConfig,
    resetScroll,
    handleFlashListLoad,
    isPositionReady,
  } = useChatScroll(chatIdNum, messages, firstUnreadIndex, unreadCount, currentUser?.id, messagesKey, setShowUnreadBanner, handleResetUnreadState, keyboardHeight);

  // Message search - callback for navigating to search results
  const handleNavigateToSearchResult = useCallback((messageId: number) => {
    scrollToMessage(messageId, setHighlightedMessageId);
  }, [scrollToMessage, setHighlightedMessageId]);

  const {
    isSearchVisible,
    searchQuery,
    totalResults,
    currentIndex,
    isLoading: isSearchLoading,
    openSearch,
    closeSearch,
    setSearchQuery,
    submitSearch,
    navigateToPrev,
    navigateToNext,
  } = useMessageSearch({
    chatId: chatIdNum,
    onNavigateToMessage: handleNavigateToSearchResult,
  });

  // Автоматически открыть поиск если передан параметр openSearch
  useEffect(() => {
    if (shouldOpenSearch && messagesReady) {
      openSearch();
      // Сбрасываем параметр чтобы поиск не открывался повторно
      navigation.setParams({ openSearch: undefined });
    }
  }, [shouldOpenSearch, messagesReady, openSearch, navigation]);

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
  }, [chatIdNum, chatFromStore, setChatData, setIsLoadingChat]);

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

  // Получаем закрепленные сообщения из стора (селектор с shallow compare)
  const pinnedMessagesLength = useChatStore((state) => state.pinnedMessages[chatIdNum]?.length ?? 0);
  const pinnedMessages = useMemo(
    () => useChatStore.getState().pinnedMessages[chatIdNum] || [],
    [chatIdNum, pinnedMessagesLength]
  );

  // ✅ Безопасное значение initialScrollIndex - не должно выходить за пределы списка
  const safeInitialScrollIndex = useMemo(() => {
    if (initialScrollIndex === undefined || initialScrollIndex === null || messageListItems.length === 0) {
      return undefined;
    }
    // Убеждаемся что индекс находится в допустимых пределах
    return Math.min(Math.max(0, initialScrollIndex), messageListItems.length - 1);
  }, [initialScrollIndex, messageListItems.length]);

  // Сразу показываем UI
  useEffect(() => {
    setIsLayoutReady(true);
  }, []);

  // Connect keyboard callbacks to scroll handlers
  useEffect(() => {
    setKeyboardCallbacks(handleKeyboardWillShow, handleKeyboardWillHide);

    // Cleanup on unmount
    return () => {
      setKeyboardCallbacks(null, null);
    };
  }, [handleKeyboardWillShow, handleKeyboardWillHide, setKeyboardCallbacks]);

  // Показываем контент сразу без задержки
  useFocusEffect(
    React.useCallback(() => {
      setContentReady(true);

      return () => {
        setContentReady(false);
      };
    }, [])
  );

  // Проверка начального статуса подключения + периодические обновления
  useEffect(() => {
    // Сразу проверяем статус при монтировании
    setIsConnected(websocketService.isConnected());

    // Затем проверяем каждую секунду для быстрого обновления UI
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
    onSearchPress: openSearch,
  });

  // Оптимизация: useCallback для стабилизации WebSocket подключения
  const connectWebSocket = useCallback(async () => {
    const startTime = Date.now();
    if (!websocketService.isConnected()) {
      const token = (await AsyncStorage.getItem('jwtToken')) || '';
      if (token) {
        await websocketService.connect(token);
        // Обновляем статус подключения сразу после успешного подключения
        const connected = websocketService.isConnected();
        setIsConnected(connected);
        const elapsed = Date.now() - startTime;
      } else {
        setError({ error: 'No authentication token found' });
        return;
      }
    } else {
      // Если уже подключены, обновляем статус
      setIsConnected(true);
    }
  }, [setError]);

  // Chat initialization - wait for messages before showing UI
  useEffect(() => {
    let isMounted = true;
    let loaderTimeout: NodeJS.Timeout | null = null;

    const initializeChat = async () => {
      try {
        // Reset scroll and state FIRST, before anything else
        resetScroll();
        resetChatState();
        setMessagesReady(false); // Reset messages ready state
        setShowLoader(false); // Reset loader visibility

        // Show loader only if loading takes longer than 1.5 seconds
        loaderTimeout = setTimeout(() => {
          if (isMounted && !messagesReady) {
            setShowLoader(true);
          }
        }, 1500);

        const chat = getChatById(chatIdNum);
        const unreadCountToSave = chat?.unread_count ?? routeUnreadCount ?? 0;
        setSavedUnreadCount(unreadCountToSave);

        if (chat) {
          setActiveChat(chat);
        }

        // Wait for messages to load before showing UI
        await loadMessages(chatIdNum);

        // Clear loader timeout if loading completed quickly
        if (loaderTimeout) {
          clearTimeout(loaderTimeout);
          loaderTimeout = null;
        }

        // Only update state if component is still mounted
        // Set messages ready immediately - FlashList will handle initialScrollIndex internally
        if (isMounted) {
          setMessagesReady(true);
          setShowLoader(false); // Hide loader when ready
        }

        // WebSocket connection
        await connectWebSocket();

        // Join chat room for presence tracking
        console.log(`🔵 Joining chat room ${chatIdNum}`);
        websocketService.joinChat(chatIdNum);
      } catch (error) {
        console.error(`Failed to initialize chat ${chatIdNum}:`, error);
        // Clear timeout on error
        if (loaderTimeout) {
          clearTimeout(loaderTimeout);
          loaderTimeout = null;
        }
        // Show UI even on error, so user can see error state
        if (isMounted) {
          setMessagesReady(true);
          setShowLoader(false);
        }
      }
    };

    initializeChat();

    return () => {
      isMounted = false;
      // Clear timeout on unmount
      if (loaderTimeout) {
        clearTimeout(loaderTimeout);
      }
      setActiveChat(null);
      // Leave chat room when component unmounts
      console.log(`🔴 Leaving chat room ${chatIdNum}`);
      websocketService.leaveChat(chatIdNum);
    };
  }, [chatIdNum, connectWebSocket]); // Значительно уменьшен массив зависимостей!

  // Запоминаем начальное количество непрочитанных и ID первого непрочитанного при первой загрузке
  useEffect(() => {
    if (messages.length > 0 && ignoreReadReceipts && unreadCount > 0 && initialUnreadCount === 0) {
      setInitialUnreadCount(unreadCount);
    }
    // Фиксируем ID первого непрочитанного сообщения при первом обнаружении
    if (detectedFirstUnreadId !== null && firstUnreadMessageId === null && showUnreadBanner) {
      setFirstUnreadMessageId(detectedFirstUnreadId);
    }
  }, [messages.length, ignoreReadReceipts, unreadCount, initialUnreadCount, detectedFirstUnreadId, firstUnreadMessageId, showUnreadBanner]);

  // Отключаем игнорирование read_receipts и скрываем баннер после намеренной прокрутки вниз или открытия клавиатуры
  useEffect(() => {
    if (initialScrolled && ignoreReadReceipts && (userScrolledToBottom || keyboardHeight > 0)) {
      setIgnoreReadReceipts(false);
      setInitialUnreadCount(0);
      // Скрываем баннер при открытии клавиатуры (пользователь начал печатать = прочитал сообщения)
      if (keyboardHeight > 0 && showUnreadBanner) {
        setShowUnreadBanner(false);
        setFirstUnreadMessageId(null); // Сбрасываем фиксированный ID
      }
    }
  }, [initialScrolled, ignoreReadReceipts, userScrolledToBottom, keyboardHeight, showUnreadBanner]);

  // Отметить как прочитанное и скрыть баннер когда пользователь внизу чата
  // userScrolledToBottom — намеренная прокрутка вниз
  // hasReachedBottom — пользователь уже находится внизу (например, при открытии из push-уведомления)
  useEffect(() => {
    if (messages.length > 0 && initialScrolled && (userScrolledToBottom || hasReachedBottom)) {
      const markReadTimer = setTimeout(async () => {
        try {
          await markChatAsRead(chatIdNum);
          if (showUnreadBanner) {
            setShowUnreadBanner(false);
            setFirstUnreadMessageId(null); // Сбрасываем фиксированный ID
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
  }, [chatIdNum, messages.length, markChatAsRead, initialScrolled, userScrolledToBottom, hasReachedBottom, showUnreadBanner]);

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
    await handleBulkDelete(deleteFor, handleDeleteWithCacheReset);
  };

  // Обертка для handleSendMessage с автоматическим скроллом вниз
  const handleSendMessage = async (content: string, replyToId?: number) => {
    await originalHandleSendMessage(content, replyToId);

    // После отправки сообщения скроллим вниз и скрываем баннер (пользователь активно участвует в диалоге)
    if (showUnreadBanner) {
      setShowUnreadBanner(false);
      setFirstUnreadMessageId(null); // Сбрасываем фиксированный ID
    }
    setTimeout(() => {
      handleScrollToBottom();
    }, 100);
  };

  // === Глобальный просмотр медиа (по всем вложениям чата) ===
  const [globalMediaViewerVisible, setGlobalMediaViewerVisible] = useState(false);
  const [globalMediaItems, setGlobalMediaItems] = useState<MediaItem[]>([]);
  const [globalMediaInitialIndex, setGlobalMediaInitialIndex] = useState(0);
  const chatAttachmentsCacheRef = useRef<Attachment[] | null>(null);

  // Сброс кеша при смене чата
  useEffect(() => {
    chatAttachmentsCacheRef.current = null;
  }, [chatIdNum]);

  // Сброс кеша вложений при удалении сообщений (в т.ч. через WebSocket)
  const deletedMessagesCount = useMemo(() => {
    return messages.filter(m => m.is_deleted).length;
  }, [messages]);

  useEffect(() => {
    chatAttachmentsCacheRef.current = null;
  }, [deletedMessagesCount]);

  const handleMediaViewerOpen = useCallback(async (attachmentId: number) => {
    const buildItems = (attachments: Attachment[]): MediaItem[] =>
      attachments
        .filter((att: Attachment) => att.file_type === 'image' || att.file_type === 'video')
        .map((att: Attachment) => ({
          type: att.file_type === 'video' ? 'video' as const : 'image' as const,
          url: replaceLocalhostWithIP(att.file_url),
          thumbnailUrl: att.thumbnail_url ? replaceLocalhostWithIP(att.thumbnail_url) : undefined,
          thumbnailLargeUrl: att.thumbnail_large_url ? replaceLocalhostWithIP(att.thumbnail_large_url) : undefined,
          attachmentId: att.id,
          duration: att.duration,
        }))
        .reverse();

    try {
      let allAttachments = chatAttachmentsCacheRef.current;

      if (!allAttachments) {
        const { attachments } = await chatApi.getChatAttachments(chatIdNum, 100, 0);
        allAttachments = attachments || [];
        chatAttachmentsCacheRef.current = allAttachments;
      }

      let items = buildItems(allAttachments);
      let index = items.findIndex(item => item.attachmentId === attachmentId);

      // Вложение не найдено в кеше — значит оно новое (только что загружено).
      // Сбрасываем кеш и получаем свежий список.
      if (index === -1) {
        chatAttachmentsCacheRef.current = null;
        const { attachments } = await chatApi.getChatAttachments(chatIdNum, 100, 0);
        allAttachments = attachments || [];
        chatAttachmentsCacheRef.current = allAttachments;
        items = buildItems(allAttachments);
        index = items.findIndex(item => item.attachmentId === attachmentId);
      }

      setGlobalMediaItems(items);
      setGlobalMediaInitialIndex(index >= 0 ? index : 0);
      setGlobalMediaViewerVisible(true);
    } catch (error) {
      console.error('Failed to load chat attachments for media viewer:', error);
    }
  }, [chatIdNum]);

  const handleGlobalMediaViewerClose = useCallback(() => {
    setGlobalMediaViewerVisible(false);
    setGlobalMediaInitialIndex(0);
  }, []);

  // Обёртки для удаления сообщений — сбрасывают кэш вложений
  const handleDeleteWithCacheReset = useCallback((...args: Parameters<typeof handleDelete>) => {
    chatAttachmentsCacheRef.current = null;
    return handleDelete(...args);
  }, [handleDelete]);

  const handleDeletePermanentWithCacheReset = useCallback((...args: Parameters<typeof handleDeletePermanent>) => {
    chatAttachmentsCacheRef.current = null;
    return handleDeletePermanent(...args);
  }, [handleDeletePermanent]);

  const handleGlobalMediaForward = useCallback((item: MediaItem) => {
    const allAttachments = chatAttachmentsCacheRef.current;
    if (!allAttachments) return;

    const attachment = allAttachments.find((att: Attachment) => att.id === item.attachmentId);
    if (!attachment) return;

    // Создаём синтетическое сообщение для пересылки
    const mediaMessage = {
      id: 0,
      chat_id: chatIdNum,
      sender_id: currentUser?.id || 0,
      content: '',
      type: attachment.file_type === 'video' ? 'video' : 'image',
      status: 'sent' as const,
      created_at: new Date().toISOString(),
      attachments: [attachment],
    };

    setGlobalMediaViewerVisible(false);
    handleForward(mediaMessage as any);
  }, [chatIdNum, currentUser?.id, handleForward]);

  const handleGlobalMediaDelete = useCallback((item: MediaItem) => {
    const allAttachments = chatAttachmentsCacheRef.current;
    if (!allAttachments) return;

    const attachment = allAttachments.find((att: Attachment) => att.id === item.attachmentId);
    if (!attachment) return;

    const doDelete = async () => {
      try {
        await chatApi.deleteAttachment(attachment.message_id, attachment.id);

        // Remove from cache
        chatAttachmentsCacheRef.current = allAttachments.filter(
          (att: Attachment) => att.id !== attachment.id
        );

        // Update media viewer items
        setGlobalMediaItems(prev => {
          const updated = prev.filter(m => m.attachmentId !== item.attachmentId);
          if (updated.length === 0) {
            setGlobalMediaViewerVisible(false);
          }
          return updated;
        });
      } catch (error) {
        console.error('Failed to delete attachment:', error);
        if (Platform.OS === 'web') {
          window.alert('Не удалось удалить медиа');
        } else {
          Alert.alert('Ошибка', 'Не удалось удалить медиа');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Вы уверены, что хотите удалить это медиа?')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Удалить медиа',
        'Вы уверены, что хотите удалить это медиа?',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Удалить', style: 'destructive', onPress: doDelete },
        ],
      );
    }
  }, []);

  // UI state - show loading only if messages are not ready AND loader should be visible
  // This creates a delayed loading indicator (appears only after 1.5s)
  if (!messagesReady) {
    if (showLoader) {
      return (
        <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }
    // If not ready but loader not visible yet, show empty screen (no flicker)
    return <View style={[styles.container, { backgroundColor: theme.background }]} />;
  }

  if (!isLayoutReady) {
    return <View style={[styles.container, { backgroundColor: theme.background }]} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ChatScreenContent
        chatId={chatIdNum}
        messageListItems={messageListItems}
        messagesKey={messagesKey}
        firstUnreadIndex={firstUnreadIndex}
        firstNewMessageIndex={firstNewMessageIndex}
        unreadCount={unreadCount}
        showUnreadBanner={showUnreadBanner}
        initialUnreadCount={initialUnreadCount}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        inputHeight={inputHeight}
        insetsBottom={insets.bottom}
        listRef={listRef}
        highlightedMessageId={highlightedMessageId}
        initialScrollIndex={safeInitialScrollIndex}
        scrollSessionKey={scrollSessionKey}
        hasReachedBottom={hasReachedBottom}
        isPositionReady={isPositionReady}
        onFlashListLoad={handleFlashListLoad}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        onLoadMore={handleLoadMore}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDeleteWithCacheReset}
        onRestore={handleRestore}
        onDeletePermanent={handleDeletePermanentWithCacheReset}
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
        isJumpingToPinned={isJumpingToPinned}
        currentDateLabel={currentDateLabel}
        showDateHeader={showDateHeader}
        showScrollToBottom={showScrollToBottom}
        newMessagesCount={newMessagesCount}
        keyboardHeight={keyboardHeight}
        keyboardHeightAnim={keyboardHeightAnim}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        replyingToMessage={replyingToMessage}
        onCancelReply={() => setReplyingToMessage(null)}
        selectedFileIds={selectedFileIds}
        onFilesSelected={handleFilesSelected}
        onRemoveFile={removeFile}
        pendingVideoFiles={pendingVideoFiles}
        onPendingVideoFiles={handlePendingVideoFiles}
        onRemovePendingVideo={removePendingVideo}
        onScrollToBottom={handleScrollToBottom}
        onPinnedMessagePress={handlePinnedMessagePress}
        onBulkDelete={onBulkDelete}
        onBulkForward={handleOpenForwardModal}
        onExitSelectionMode={handleExitSelectionMode}
        canDeleteForEveryone={canDeleteForEveryone}
        isSearchVisible={isSearchVisible}
        searchQuery={searchQuery}
        searchTotal={totalResults}
        searchCurrentIndex={currentIndex}
        isSearchLoading={isSearchLoading}
        onNavigatePrev={navigateToPrev}
        onNavigateNext={navigateToNext}
        activeSearchQuery={isSearchVisible && searchQuery ? searchQuery : undefined}
        onMediaViewerOpen={handleMediaViewerOpen}
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

      {/* Bulk Forward Messages Modal */}
      <ForwardMessagesModal
        visible={forwardModalVisible}
        selectedCount={selectedMessages.size}
        onClose={handleCloseForwardModal}
        onForward={handleBulkForward}
      />

      {/* Message Search Overlay */}
      <MessageSearchOverlay
        isVisible={isSearchVisible}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSubmitSearch={submitSearch}
        onClose={closeSearch}
      />

      {/* Глобальный просмотр медиа — по всем вложениям чата */}
      <MediaViewer
        visible={globalMediaViewerVisible}
        mediaItems={globalMediaItems}
        initialIndex={globalMediaInitialIndex}
        onClose={handleGlobalMediaViewerClose}
        onForward={handleGlobalMediaForward}
        onDelete={handleGlobalMediaDelete}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;
