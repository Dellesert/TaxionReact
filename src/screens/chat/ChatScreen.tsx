import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Platform, Keyboard } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChatStackParamList } from '@navigation/types';
import { MessageInput } from '@components/chat/MessageInput';
import { ChatMembersModal } from '@components/chat/ChatMembersModal';
import { ForwardMessageModal } from '@components/chat/ForwardMessageModal';
import { PinnedMessageBanner } from '@components/chat/PinnedMessageBanner';
import { FloatingDateHeader } from '@components/chat/FloatingDateHeader';
import { ScrollToBottomButton } from '@components/chat/ScrollToBottomButton';
import { MessageListComponent } from '@components/chat/MessageListComponent';
import { ChatHeader } from '@components/chat/ChatHeader';
import PollDetailModal from '@components/poll/PollDetailModal';
import { useTheme } from '@hooks/useTheme';
import { useChatMessages } from '@hooks/useChatMessages';
import { useChatActions } from '@hooks/useChatActions';
import { useChatScroll } from '@hooks/useChatScroll';
import { websocketService } from '@services/websocket.service';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getChatDisplayName, getChatDisplayAvatar, getPersonalChatCompanion, getUserStatusText } from '@utils/chatUtils';

type Props = NativeStackScreenProps<ChatStackParamList, 'Chat'>;

/**
 * Рефакторенный экран чата - разделен на компоненты и хуки
 */
export const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { chatId, chatName, unreadCount: routeUnreadCount } = route.params;
  const chatIdNum = useMemo(() => Number(chatId), [chatId]);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Фиксированная высота инпута - НЕ меняем чтобы избежать пересчета layout
  const inputHeight = 72;
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [showUnreadBanner, setShowUnreadBanner] = useState(true);
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<number | null>(null);
  const [ignoreReadReceipts, setIgnoreReadReceipts] = useState(true); // Игнорируем read_receipts до первого скролла
  const [initialUnreadCount, setInitialUnreadCount] = useState(0); // Запоминаем начальное количество непрочитанных
  const [savedUnreadCount, setSavedUnreadCount] = useState(0); // Сохраняем unread_count ДО WebSocket


  // Хуки
  const { messages, messageListItems, messagesKey, firstUnreadIndex, unreadCount } = useChatMessages(chatIdNum, ignoreReadReceipts, savedUnreadCount);

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
    handleScroll,
    handleLoadMore,
    handleContentSizeChange,
    handleScrollToBottom,
    handleReplyPress: scrollToMessage,
    onViewableItemsChanged,
    viewabilityConfig,
    resetScroll,
  } = useChatScroll(chatIdNum, messages, firstUnreadIndex, unreadCount);


  // Store
  const isLoading = useChatStore((state) => state.isLoading);
  const loadMessages = useChatStore((state) => state.loadMessages);
  const getChatById = useChatStore((state) => state.getChatById);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const markChatAsRead = useChatStore((state) => state.markChatAsRead);
  const setError = useChatStore((state) => state.set);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const getPinnedMessages = useChatStore((state) => state.getPinnedMessages);
  const currentUser = useAuthStore((state) => state.user);

  const chat = useChatStore((state) => state.chats.find(c => c.id === chatIdNum));

  // Печатающие пользователи
  const typingUserNames = useMemo(() => {
    const typing = typingUsers[chatIdNum] || [];
    return typing
      .filter(t => t.user_id !== currentUser?.id)
      .map(t => t.user?.name || t.user?.email?.split('@')[0] || `User ${t.user_id}`);
  }, [typingUsers, chatIdNum, currentUser]);

  // Закрепленные сообщения
  const pinnedMessages = useMemo(() => {
    return getPinnedMessages(chatIdNum);
  }, [chatIdNum, messages, getPinnedMessages]);

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

  // Настройка заголовка
  useEffect(() => {
    const displayName = chat ? getChatDisplayName(chat, currentUser?.id) : (chatName || 'Чат');
    const displayAvatar = chat ? getChatDisplayAvatar(chat, currentUser?.id) : undefined;
    const companion = chat ? getPersonalChatCompanion(chat, currentUser?.id) : null;
    const statusText = companion ? getUserStatusText(companion) : '';
    const isPrivateChat = chat?.type === 'private';
    const membersText = chat && chat.type === 'group' && chat.members
      ? `${chat.members.length} участников`
      : '';

    // Формируем текст печати для заголовка
    let typingText = '';
    if (typingUserNames.length > 0) {
      if (isPrivateChat) {
        // В личном чате просто "печатает..." без имени
        typingText = 'печатает...';
      } else {
        // В групповом чате показываем имя
        if (typingUserNames.length === 1) {
          typingText = `${typingUserNames[0]} печатает...`;
        } else {
          typingText = `${typingUserNames[0]} и ещё ${typingUserNames.length - 1} печатают...`;
        }
      }
    }

    // Финальный текст статуса: приоритет у typing
    const finalStatusText = typingText || (isPrivateChat ? statusText : membersText);

    const handleHeaderPress = () => {
      navigation.navigate('ChatSettings', {
        chatId: chatIdNum,
        chatName: displayName,
      });
    };

    navigation.setOptions({
      headerLeft: () => <ChatHeader.Left onBackPress={() => navigation.goBack()} />,
      headerTitle: () => (
        <ChatHeader.Title
          displayName={displayName}
          statusText={finalStatusText}
          membersText={''}
          isPrivateChat={true}
          isConnected={isConnected}
          onHeaderPress={handleHeaderPress}
        />
      ),
      headerTitleAlign: 'center',
      headerRight: () => (
        <ChatHeader.Right
          displayAvatar={displayAvatar}
          displayName={displayName}
          onHeaderPress={handleHeaderPress}
        />
      ),
    });
  }, [chatName, navigation, isConnected, chatIdNum, chat, currentUser, typingUserNames]);

  // Инициализация чата
  useEffect(() => {
    resetScroll();
    setShowUnreadBanner(true);
    setIgnoreReadReceipts(true);
    setInitialUnreadCount(0);

    const chat = getChatById(chatIdNum);
    console.log(`🔍 [ChatScreen] Chat ${chatIdNum}:`, chat ? `unread_count=${chat.unread_count}` : 'НЕ НАЙДЕН в store');
    console.log(`📍 [ChatScreen] routeUnreadCount из навигации:`, routeUnreadCount);

    // Используем unread_count из store или из параметров навигации
    const unreadCountToSave = chat?.unread_count ?? routeUnreadCount ?? 0;
    console.log(`💾 [ChatScreen] Сохраняем savedUnreadCount=${unreadCountToSave} для чата ${chatIdNum}`);
    setSavedUnreadCount(unreadCountToSave);

    if (chat) {
      setActiveChat(chat);
    }

    loadMessages(chatIdNum).catch((error) => {
      console.error(`❌ [ChatScreen] Ошибка загрузки сообщений чата ${chatIdNum}:`, error);
      if (error?.status === 403) {
        console.warn(`⚠️ [ChatScreen] Нет доступа к чату ${chatIdNum}`);
        // Можно показать сообщение пользователю или перенаправить назад
      }
    });

    const connectWebSocket = async () => {
      if (!websocketService.isConnected()) {
        const token = (await AsyncStorage.getItem('jwtToken')) || '';
        if (token) {
          await websocketService.connect(token);
          await new Promise<void>(resolve => setTimeout(resolve, 500));
        } else {
          setError({ error: 'No authentication token found' });
          return;
        }
      }

      // WebSocket is already connected and subscribed to user's personal channel
      // Events will arrive automatically - no need to join/leave specific chats
    };
    connectWebSocket();

    return () => {
      setActiveChat(null);
      // No need to leave chat - events are delivered via personal channel
    };
  }, [chatIdNum]);

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
      rootNavigation.navigate('TaskDetail', { taskId, fromChat: true });
    }
  };

  const handleReplyPressWithHighlight = (messageId: number) => {
    scrollToMessage(messageId, setHighlightedMessageId);
  };

  const handlePinnedMessagePress = (messageId: number) => {
    handleReplyPressWithHighlight(messageId);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
    },
  });

  // Не показываем UI пока layout не готов (избегаем прыжков)
  if (!isLayoutReady) {
    return <View style={[styles.container, dynamicStyles.container]} />;
  }

  // Скрываем контент во время плавного скролла к непрочитанным
  const shouldShowContent = contentReady && !isScrollingToUnread;

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Floating sticky date header */}
      <FloatingDateHeader dateLabel={currentDateLabel} visible={showDateHeader && shouldShowContent} />

      <View style={styles.flex1}>
        {shouldShowContent ? (
          <>
            {/* Баннер закрепленных сообщений */}
            {pinnedMessages.length > 0 && (
              <PinnedMessageBanner
                pinnedMessages={pinnedMessages}
                chatType={chat?.type}
                currentUserRole={chat?.members?.find(m => m.user_id === currentUser?.id)?.role}
                onPress={handlePinnedMessagePress}
                onUnpin={handleUnpin}
              />
            )}

            {/* Список сообщений - flex: 1 чтобы занимал все оставшееся место */}
            <View style={{ flex: 1 }}>
              <MessageListComponent
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
          />

              {/* Кнопка scroll to bottom - абсолютное позиционирование */}
              <ScrollToBottomButton visible={showScrollToBottom} onPress={handleScrollToBottom} />
            </View>

            {/* Панель ввода - обычный layout внизу */}
            <View
              style={[
                styles.inputWrapper,
                {
                  marginBottom: keyboardHeight,
                  // Убираем paddingBottom так как tab bar теперь absolute
                  backgroundColor: theme.backgroundSecondary,
                }
              ]}
            >
              <MessageInput
                onSend={handleSendMessage}
                onTyping={handleTyping}
                editingMessage={editingMessage}
                onCancelEdit={() => setEditingMessage(null)}
                replyingToMessage={replyingToMessage}
                onCancelReply={() => setReplyingToMessage(null)}
                onFilesSelected={(fileIds) => setSelectedFileIds(prev => [...prev, ...fileIds])}
                selectedFileIds={selectedFileIds}
                onRemoveFile={(fileId) => setSelectedFileIds(prev => prev.filter(id => id !== fileId))}
              />
            </View>
          </>
        ) : (
          // Показываем пустой экран пока контент не готов
          <View style={{ flex: 1, backgroundColor: theme.background }} />
        )}
      </View>

      {/* Модалки */}
      <ChatMembersModal
        visible={membersModalVisible}
        chatId={chatIdNum}
        onClose={() => setMembersModalVisible(false)}
        isCreator={currentUser?.id === chat?.creator_id}
        creatorId={chat?.creator_id}
      />

      <ForwardMessageModal
        visible={!!forwardingMessage}
        message={forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        onForward={handleForwardToChat}
      />

      {selectedPollId && (
        <PollDetailModal
          visible={pollModalVisible}
          pollId={selectedPollId}
          onClose={() => {
            setPollModalVisible(false);
            setSelectedPollId(null);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex1: { flex: 1 },
  inputWrapper: {
    // Явно задаем что этот view НЕ должен менять свою позицию
  },
});

export default ChatScreen;
