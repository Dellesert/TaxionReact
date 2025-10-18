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
  const currentUser = useAuthStore((state) => state.user);

  // ✅ ДОБАВЬ ЭТО
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const messages = useMemo(() => allMessages[chatIdNum] || [], [allMessages, chatIdNum]);
  const hasLoadedRef = useRef(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);

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

  useEffect(() => {
    navigation.setOptions({
      title: chatName || 'Чат',
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ConnectionStatus compact />
          <TouchableOpacity onPress={() => setMembersModalVisible(true)} style={{ marginLeft: 12, marginRight: 8 }}>
            <Ionicons name="people" size={24} color="#E94444" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [chatName, navigation]);

  useEffect(() => {
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

  // Smart scroll: scroll to first unread message or to end
  useEffect(() => {
    if (messages.length > 0 && !initialScrolled) {
      // Wait for layout to be calculated
      const scrollTimer = setTimeout(() => {
        // Если непрочитанных много (>10) или они в самом начале чата,
        // скорее всего они за пределами загруженных - скроллим в конец
        const tooManyUnread = unreadCount > 10;
        const unreadAtStart = firstUnreadIndex >= 0 && firstUnreadIndex < 5;

        if (firstUnreadIndex >= 0 && unreadCount > 0 && !tooManyUnread && !unreadAtStart) {
          // Scroll to first unread message - показать баннер и первое непрочитанное
          console.log(`📜 Scrolling to first unread message at index ${firstUnreadIndex} (${unreadCount} unread)`);
          listRef.current?.scrollToIndex({
            index: firstUnreadIndex,
            animated: false,
            viewPosition: 0.2, // Показать баннер чуть выше середины экрана
          });
        } else {
          // No unread messages OR too many unread OR unread at very start - scroll to end
          const reason = unreadCount === 0 ? 'no unread' :
                        tooManyUnread ? `too many unread (${unreadCount})` :
                        'unread at start';
          console.log(`📜 Scrolling to end (${reason})`);
          listRef.current?.scrollToEnd({ animated: false });
        }
        setInitialScrolled(true);
      }, 150);

      return () => clearTimeout(scrollTimer);
    } else if (messages.length > 0 && initialScrolled) {
      // After initial scroll, only scroll to end for new messages
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: false });
      });
    }
  }, [messages.length, firstUnreadIndex, unreadCount, initialScrolled]);

  // Mark messages as read when entering chat - WITH DELAY to show unread banner first
  useEffect(() => {
    if (messages.length > 0 && initialScrolled) {
      // Задержка перед маркировкой как прочитанных - дать пользователю увидеть баннер
      const markReadTimer = setTimeout(() => {
        // Mark the last message as read to indicate all messages in chat are read
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
          markMessageRead(lastMessage.id);
        }
      }, 2000); // Задержка 2 секунды чтобы пользователь увидел баннер

      return () => clearTimeout(markReadTimer);
    }
  }, [chatIdNum, messages.length, markMessageRead, initialScrolled]);

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

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
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
    <FlatList
      ref={listRef}
      data={messages}
      renderItem={({ item, index }) => {
        // Show banner only if we're scrolling to unread messages
        const shouldShowBanner = index === firstUnreadIndex &&
                                 unreadCount > 0 &&
                                 unreadCount <= 10 &&
                                 firstUnreadIndex >= 5;

        return (
          <>
            {shouldShowBanner && <UnreadMessagesBanner unreadCount={unreadCount} />}
            <MessageItem message={item} />
          </>
        );
      }}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[
        styles.messagesList,
        { paddingBottom: inputHeight + insets.bottom },
      ]}
      inverted={false}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews={false}
      onScrollToIndexFailed={(info) => {
        // Fallback: scroll to end if scrollToIndex fails
        console.warn('scrollToIndex failed:', info);
        setTimeout(() => {
          listRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }}
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
