import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ChatStackParamList } from '@navigation/types';
import { MessageItem } from '@components/chat/MessageItem';
import { MessageInput } from '@components/chat/MessageInput';
import { ChatMembersModal } from '@components/chat/ChatMembersModal';
import { ConnectionStatus } from '@components/common/ConnectionStatus';
import { UnreadMessagesBanner } from '@components/chat/UnreadMessagesBanner';
import { TypingIndicator } from '@components/chat/TypingIndicator';
import { Avatar } from '@components/common/Avatar';
import { useTheme } from '@hooks/useTheme';
import { websocketService } from '@services/websocket.service';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ ДОБАВЬ ЭТО
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<ChatStackParamList, 'Chat'>;

export const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { chatId, chatName } = route.params;
  const chatIdNum = useMemo(() => Number(chatId), [chatId]);
  const { theme } = useTheme();

  const listRef = useRef<FlatList<any>>(null);
  const [initialScrolled, setInitialScrolled] = useState(false);
  const [inputHeight, setInputHeight] = useState(56);

  const allMessages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const loadMessages = useChatStore((state) => state.loadMessages);
  const setError = useChatStore((state) => state.set);
  const getChatById = useChatStore((state) => state.getChatById);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const markMessageRead = useChatStore((state) => state.markMessageRead);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const currentUser = useAuthStore((state) => state.user);

  // ✅ ДОБАВЬ ЭТО
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  // Инвертируем массив для inverted FlatList
  // [новые -> старые] для отображения
  const messages = useMemo(() => {
    const msgs = allMessages[chatIdNum] || [];
    return [...msgs].reverse();
  }, [allMessages, chatIdNum]);
  const hasLoadedRef = useRef(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);
  const lastOldestMessageId = useRef<number | null>(null);

  // Флаг для отслеживания, показывали ли уже баннер при входе в чат
  const [showUnreadBanner, setShowUnreadBanner] = useState(true);

  // Получаем имена печатающих пользователей (исключая текущего пользователя)
  const typingUserNames = useMemo(() => {
    const typing = typingUsers[chatIdNum] || [];
    return typing
      .filter(t => t.user_id !== currentUser?.id)
      .map(t => t.user?.name || t.user?.email?.split('@')[0] || `User ${t.user_id}`);
  }, [typingUsers, chatIdNum, currentUser]);

  // Обработчик скролла - используем простую защиту через isLoadingMore
  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromEnd = contentSize.height - layoutMeasurement.height - contentOffset.y;

    // В inverted списке при скролле ВВЕРХ (к старым) offset.y увеличивается
    // Самая надёжная защита - проверяем только isLoadingMore флаг
    // React гарантирует, что этот флаг установлен правильно
    if (
      distanceFromEnd < 300 &&
      !isLoadingMore &&
      hasMoreMessages &&
      initialScrolled
    ) {
      handleLoadMore();
    }
  };

  // Calculate first unread message index and total unread count
  const { firstUnreadIndex, unreadCount } = useMemo(() => {
    if (!currentUser || messages.length === 0) {
      return { firstUnreadIndex: -1, unreadCount: 0 };
    }

    let firstIndex = -1;
    let count = 0;

    // Логируем структуру сообщений для отладки
    if (messages.length > 0) {
      console.log('📨 Messages info:', {
        total: messages.length,
        firstMsg: { id: messages[0].id, sender_id: messages[0].sender_id },
        lastMsg: { id: messages[messages.length - 1].id, sender_id: messages[messages.length - 1].sender_id },
        currentUserId: currentUser.id,
      });

      // Детальная информация о нескольких последних сообщениях
      const lastFew = messages.slice(-5);
      console.log('📨 Last 5 messages detail:', lastFew.map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        content: m.content.substring(0, 30),
        read_receipts: m.read_receipts,
        read_by: m.read_by,
      })));
    }

    // Ищем первое непрочитанное сообщение
    // Массив отсортирован от старых к новым (старые вверху [0], новые внизу [length-1])
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      // Message is unread if:
      // 1. It's not sent by current user
      // 2. Current user is not in read_receipts array
      const readReceipts = message.read_receipts || [];
      const hasReadReceipt = readReceipts.some((receipt) => receipt.user_id === currentUser.id);

      const isUnread = message.sender_id !== currentUser.id && !hasReadReceipt;

      // Логируем каждое непрочитанное сообщение
      if (isUnread && count < 3) {
        console.log(`🔴 Unread message #${count + 1}:`, {
          index: i,
          id: message.id,
          sender_id: message.sender_id,
          content: message.content.substring(0, 30),
          readReceipts: readReceipts.length,
          hasReadReceipt,
        });
      }

      if (isUnread) {
        if (firstIndex === -1) {
          firstIndex = i; // Запоминаем индекс ПЕРВОГО непрочитанного (самого старого)
        }
        count++;
      }
    }

    console.log(`📊 Unread messages: ${count}, first unread at index: ${firstIndex} (of ${messages.length})`);
    return { firstUnreadIndex: firstIndex, unreadCount: count };
  }, [messages, currentUser]);

  const [isConnected, setIsConnected] = useState(websocketService.isConnected());

  // Проверяем статус подключения каждую секунду
  useEffect(() => {
    const interval = setInterval(() => {
      setIsConnected(websocketService.isConnected());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const chat = getChatById(chatIdNum);

    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('ChatSettings', {
              chatId: chatIdNum,
              chatName: chatName,
            });
          }}
          activeOpacity={0.7}
        >
          {isConnected ? (
            <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>
              {chatName || 'Чат'}
            </Text>
          ) : (
            <ConnectionStatus compact />
          )}
        </TouchableOpacity>
      ),
      headerTitleAlign: 'center',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('ChatSettings', {
              chatId: chatIdNum,
              chatName: chatName,
            });
          }}
          activeOpacity={0.7}
          style={{ marginRight: 8 }}
        >
          <Avatar
            imageUrl={chat?.avatar_url || chat?.avatar}
            name={chatName || 'Чат'}
            size={36}
          />
        </TouchableOpacity>
      ),
    });
  }, [chatName, navigation, isConnected, theme, chatIdNum, getChatById]);

  useEffect(() => {
    // Сбрасываем состояние при смене чата
    setHasMoreMessages(true);
    setInitialScrolled(false);
    scrollToEndOnce.current = false;
    lastOldestMessageId.current = null;
    setShowUnreadBanner(true); // Показываем баннер при входе в новый чат

    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadMessages(chatIdNum);
    }

    // Set active chat and reset unread count
    const chat = getChatById(chatIdNum);
    if (chat) {
      setActiveChat(chat);
    }

    const connectWebSocket = async () => {
      if (!websocketService.isConnected()) {
        const token = (await AsyncStorage.getItem('jwtToken')) || '';
        if (token) {
          await websocketService.connect(token);
          // Wait a bit for connection to establish
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          setError({ error: 'No authentication token found' });
          return;
        }
      }

      // Join chat room after WebSocket is connected
      if (websocketService.isConnected() && getChatById(chatIdNum)) {
        websocketService.joinChat(chatIdNum);
        console.log('📍 Joined chat room:', chatIdNum);
      }
    };
    connectWebSocket();
    return () => {
      // Clear active chat when leaving
      setActiveChat(null);
      if (websocketService.isConnected()) {
        websocketService.leaveChat(chatIdNum);
        console.log('📍 Left chat room:', chatIdNum);
      }
    };
  }, [chatIdNum]); // ✅ ИСПРАВЛЕНИЕ: Удалены setError, getChatById, setActiveChat из dependencies

  // Scroll to end (newest messages at bottom) - DISABLED
  // Используем onContentSizeChange вместо useEffect для надежного скролла
  const scrollToEndOnce = useRef(false);

  const handleContentSizeChange = () => {
    if (!scrollToEndOnce.current && messages.length > 0) {
      console.log(`📜 Scrolling to top (newest) (${messages.length} messages)`);
      setTimeout(() => {
        // С inverted=true, scrollToOffset(0) = самые новые сообщения
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        scrollToEndOnce.current = true;
        setInitialScrolled(true);
      }, 100);
    }
  };

  // Mark messages as read when entering chat - WITH DELAY to show unread banner first
  useEffect(() => {
    if (messages.length > 0 && initialScrolled && showUnreadBanner) {
      // Задержка перед маркировкой как прочитанных - дать пользователю увидеть баннер
      const markReadTimer = setTimeout(() => {
        // Mark the last message as read to indicate all messages in chat are read
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
          markMessageRead(lastMessage.id);
          // Скрываем баннер после отметки - больше не показываем для новых сообщений пока в чате
          setShowUnreadBanner(false);
          console.log('🚫 Unread banner hidden - messages marked as read');
        }
      }, 2000); // Задержка 2 секунды чтобы пользователь увидел баннер

      return () => clearTimeout(markReadTimer);
    }
  }, [chatIdNum, messages.length, markMessageRead, initialScrolled, showUnreadBanner]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) {
      setError({ error: 'Message content cannot be empty' });
      return;
    }
    if (!getChatById(chatIdNum)) {
      setError({ error: 'Chat not found' });
      return;
    }

    try {
      // Send message through HTTP API
      // Server will broadcast it to all WebSocket clients including sender
      await sendMessage(chatIdNum, content.trim());
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setError({ error: error.message || 'Failed to send message' });
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (websocketService.isConnected() && getChatById(chatIdNum)) {
      websocketService.sendTyping(chatIdNum, isTyping);
    }
  };

  // Подгружаем старые сообщения при скролле ВНИЗ (в inverted списке)
  const handleLoadMore = async () => {
    console.log(`\n🔄 === handleLoadMore called ===`);

    // НЕ загружаем пока не произошел первый скролл
    if (!initialScrolled) {
      console.log(`⏸️ Waiting for initial scroll before loading more`);
      return;
    }

    // Проверяем условия для загрузки
    if (isLoadingMore || messages.length === 0 || !hasMoreMessages) {
      console.log(`⏸️ Skipping load more: isLoading=${isLoadingMore}, hasMore=${hasMoreMessages}, count=${messages.length}`);
      return;
    }

    // Массив инвертирован: [новые ... старые]
    // Последнее сообщение в массиве - самое старое
    const oldestMessage = messages[messages.length - 1];
    if (!oldestMessage) {
      console.log(`❌ No oldest message found`);
      return;
    }

    // Проверяем, что ID самого старого сообщения изменился с последней загрузки
    if (lastOldestMessageId.current === oldestMessage.id) {
      console.log(`⏸️ Already loading messages before ID ${oldestMessage.id}, skipping duplicate request`);
      return;
    }

    console.log(`📜 Loading more messages before ID ${oldestMessage.id} (total messages: ${messages.length})`);
    lastOldestMessageId.current = oldestMessage.id;
    setIsLoadingMore(true);

    try {
      const addedCount = await loadMoreMessages(chatIdNum, oldestMessage.id);
      console.log(`✅ Added ${addedCount} NEW older messages to the list`);

      // Если не добавлено новых сообщений, значит все дубликаты или конец достигнут
      if (addedCount === 0) {
        console.log(`🏁 No new messages added (all duplicates or end reached)`);
        setHasMoreMessages(false);
      } else {
        console.log(`➕ Added ${addedCount} messages, can continue loading`);
      }
    } catch (error) {
      console.error('❌ Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
      console.log(`🔄 === handleLoadMore finished ===\n`);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundTertiary,
    },
    loadingContainer: {
      backgroundColor: theme.background,
    },
    emptyText: {
      color: theme.textSecondary,
    },
  });

  if (isLoading && messages.length === 0) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
  style={[styles.container, dynamicStyles.container]}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
>
  <View style={styles.inner}>
    {/* Индикатор печатающих пользователей */}
      <TypingIndicator userNames={typingUserNames} />
    <FlatList
      ref={listRef}
      data={messages}
      renderItem={({ item, index }) => {
        // Показываем баннер только при первом входе в чат (showUnreadBanner=true)
        // После автоматической отметки сообщений как прочитанных баннер скрывается
        const shouldShowBanner = index === firstUnreadIndex && unreadCount > 0 && showUnreadBanner;

        return (
          <>
            <MessageItem message={item} />
            {shouldShowBanner && <UnreadMessagesBanner unreadCount={unreadCount} />}
          </>
        );
      }}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[
        styles.messagesList,
        { paddingTop: inputHeight + insets.bottom },
      ]}
      inverted={true}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews={false}
      // Скролл к самым новым при первой загрузке
      onContentSizeChange={handleContentSizeChange}
      // Используем onScroll вместо onEndReached для надежности
      onScroll={handleScroll}
      scrollEventThrottle={16}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : null
      }
    />

    {/* Оборачиваем панель, чтобы измерить её высоту */}
    <View
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h !== inputHeight) setInputHeight(h);
      }}
    >
      

      <MessageInput onSend={handleSendMessage} onTyping={handleTyping} />
    </View>
  </View>
</KeyboardAvoidingView>


      <ChatMembersModal
        visible={membersModalVisible}
        chatId={chatIdNum}
        onClose={() => setMembersModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  messagesList: { paddingVertical: 20 },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40,
  },
  emptyText: { fontSize: 16 },
});

export default ChatScreen;
