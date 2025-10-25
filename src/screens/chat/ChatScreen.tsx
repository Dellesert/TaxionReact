import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Platform, Keyboard } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChatStackParamList } from '@navigation/types';
import { MessageInput } from '@components/chat/MessageInput';
import { ChatMembersModal } from '@components/chat/ChatMembersModal';
import { ForwardMessageModal } from '@components/chat/ForwardMessageModal';
import { TypingIndicator } from '@components/chat/TypingIndicator';
import { PinnedMessageBanner } from '@components/chat/PinnedMessageBanner';
import { FloatingDateHeader } from '@components/chat/FloatingDateHeader';
import { ScrollToBottomButton } from '@components/chat/ScrollToBottomButton';
import { MessageListComponent } from '@components/chat/MessageListComponent';
import { ChatHeader } from '@components/chat/ChatHeader';
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
  const { chatId, chatName } = route.params;
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


  // Хуки
  const { messages, messageListItems, messagesKey, firstUnreadIndex, unreadCount } = useChatMessages(chatIdNum);
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
    handleScroll,
    handleLoadMore,
    handleContentSizeChange,
    handleScrollToBottom,
    handleReplyPress: scrollToMessage,
    onViewableItemsChanged,
    viewabilityConfig,
    resetScroll,
  } = useChatScroll(chatIdNum, messages);

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

  // Показываем контент сразу без fade-in анимации
  useFocusEffect(
    React.useCallback(() => {
      // Небольшая задержка для завершения slide анимации навигации
      const readyTimer = setTimeout(() => {
        setContentReady(true);
      }, Platform.OS === 'ios' ? 270 : 350);

      return () => {
        clearTimeout(readyTimer);
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
          statusText={statusText}
          membersText={membersText}
          isPrivateChat={isPrivateChat}
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
  }, [chatName, navigation, isConnected, chatIdNum, chat, currentUser]);

  // Инициализация чата
  useEffect(() => {
    resetScroll();
    setShowUnreadBanner(true);
    loadMessages(chatIdNum);

    const chat = getChatById(chatIdNum);
    if (chat) {
      setActiveChat(chat);
    }

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

      if (websocketService.isConnected() && getChatById(chatIdNum)) {
        websocketService.joinChat(chatIdNum);
      }
    };
    connectWebSocket();

    return () => {
      setActiveChat(null);
      if (websocketService.isConnected()) {
        websocketService.leaveChat(chatIdNum);
      }
    };
  }, [chatIdNum]);

  // Отметить как прочитанное
  useEffect(() => {
    if (messages.length > 0 && initialScrolled) {
      const markReadTimer = setTimeout(() => {
        markChatAsRead(chatIdNum);
        if (showUnreadBanner) {
          setShowUnreadBanner(false);
        }
      }, 1000);
      return () => clearTimeout(markReadTimer);
    }
  }, [chatIdNum, messages.length, markChatAsRead, initialScrolled]);

  const handleTyping = (isTyping: boolean) => {
    if (websocketService.isConnected() && getChatById(chatIdNum)) {
      websocketService.sendTyping(chatIdNum, isTyping);
    }
  };

  const handlePollPress = (pollId: number) => {
    const rootNavigation = navigation.getParent();
    if (rootNavigation) {
      rootNavigation.navigate('PollDetail', { pollId, fromChat: true });
    }
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

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Floating sticky date header */}
      <FloatingDateHeader dateLabel={currentDateLabel} visible={showDateHeader} />

      <View style={styles.flex1}>
        {contentReady ? (
          <>
            {/* Индикатор печатающих */}
            <TypingIndicator userNames={typingUserNames} />

            {/* Баннер закрепленных сообщений */}
            {pinnedMessages.length > 0 && (
              <PinnedMessageBanner
                pinnedMessages={pinnedMessages}
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
      />

      <ForwardMessageModal
        visible={!!forwardingMessage}
        message={forwardingMessage}
        onClose={() => setForwardingMessage(null)}
        onForward={handleForwardToChat}
      />
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
