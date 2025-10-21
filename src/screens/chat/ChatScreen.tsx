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
import { ForwardMessageModal } from '@components/chat/ForwardMessageModal';
import { ConnectionStatus } from '@components/common/ConnectionStatus';
import { UnreadMessagesBanner } from '@components/chat/UnreadMessagesBanner';
import { TypingIndicator } from '@components/chat/TypingIndicator';
import { Avatar } from '@components/common/Avatar';
import { PinnedMessageBanner } from '@components/chat/PinnedMessageBanner';
import { DateSeparator } from '@components/chat/DateSeparator';
import { useTheme } from '@hooks/useTheme';
import { websocketService } from '@services/websocket.service';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getChatDisplayName, getChatDisplayAvatar, getPersonalChatCompanion, getUserStatusText } from '@utils/chatUtils';
import { getDateLabel, getDateKey } from '@utils/dateHelpers';

// ✅ ДОБАВЬ ЭТО
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<ChatStackParamList, 'Chat'>;

// Тип элемента списка - может быть сообщение или разделитель даты
type MessageListItem =
  | { type: 'message'; data: any }
  | { type: 'date'; data: string };

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
  const markChatAsRead = useChatStore((state) => state.markChatAsRead);
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

  // Группируем сообщения по датам с разделителями
  // Массив messages уже инвертирован: [новые -> старые]
  // В inverted FlatList: index 0 отображается ВНИЗУ, последний index отображается ВВЕРХУ
  const messageListItems: MessageListItem[] = useMemo(() => {
    if (messages.length === 0) return [];

    const items: MessageListItem[] = [];

    messages.forEach((message, index) => {
      const currentDateKey = getDateKey(message.created_at);
      const nextMessage = messages[index + 1];
      const nextDateKey = nextMessage ? getDateKey(nextMessage.created_at) : null;

      // Если следующее сообщение (визуально ВЫШЕ) имеет другую дату,
      // добавляем разделитель ПЕРЕД текущим сообщением
      if (nextDateKey && currentDateKey !== nextDateKey) {
        const currentDateLabel = getDateLabel(message.created_at);
        items.push({ type: 'date', data: currentDateLabel });
      }

      // Добавляем само сообщение
      items.push({ type: 'message', data: message });
    });

    // Добавляем разделитель для самого старого сообщения в конец массива
    // Он будет последним в items[], визуально отобразится ВВЕРХУ
    if (messages.length > 0) {
      const oldestDateLabel = getDateLabel(messages[messages.length - 1].created_at);
      items.push({ type: 'date', data: oldestDateLabel });
    }

    return items;
  }, [messages]);

  // Создаем ключ для extraData чтобы FlatList перерисовывался при изменении read_receipts и delivered_to
  const messagesKey = useMemo(() => {
    return messages.map(m => `${m.id}-${m.read_receipts?.length || 0}-${m.delivered_to?.length || 0}`).join(',');
  }, [messages]);
  const hasLoadedRef = useRef(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<any | null>(null);
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);
  const lastOldestMessageId = useRef<number | null>(null);

  // Флаг для отслеживания, показывали ли уже баннер при входе в чат
  const [showUnreadBanner, setShowUnreadBanner] = useState(true);

  // Флаг для показа кнопки "scroll to bottom"
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

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

    // Показываем кнопку "scroll to bottom" только если НЕ находимся в самом низу чата
    // В inverted списке offset.y близок к 0 = мы внизу (у новых сообщений)
    // Если offset.y > 50, значит мы прокрутили вверх от самого низа
    if (contentOffset.y > 50) {
      setShowScrollToBottom(true);
    } else {
      setShowScrollToBottom(false);
    }

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
    const displayName = chat ? getChatDisplayName(chat, currentUser?.id) : (chatName || 'Чат');
    const displayAvatar = chat ? getChatDisplayAvatar(chat, currentUser?.id) : undefined;

    // Для личных чатов получаем собеседника и его статус
    const companion = chat ? getPersonalChatCompanion(chat, currentUser?.id) : null;
    const statusText = companion ? getUserStatusText(companion) : '';
    const isPrivateChat = chat?.type === 'private';

    // Для групповых чатов получаем список участников
    const membersText = chat && chat.type === 'group' && chat.members
      ? `${chat.members.length} участников`
      : '';

    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={theme.primary} />
        </TouchableOpacity>
      ),
      headerTitle: () => (
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('ChatSettings', {
              chatId: chatIdNum,
              chatName: displayName,
            });
          }}
          activeOpacity={0.7}
        >
          {isConnected ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text }}>
                {displayName}
              </Text>
              {isPrivateChat && statusText && (
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  {statusText}
                </Text>
              )}
              {!isPrivateChat && membersText && (
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  {membersText}
                </Text>
              )}
            </View>
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
              chatName: displayName,
            });
          }}
          activeOpacity={0.7}
          style={{ marginRight: 8 }}
        >
          <Avatar
            imageUrl={displayAvatar}
            name={displayName}
            size={36}
          />
        </TouchableOpacity>
      ),
    });
  }, [chatName, navigation, isConnected, theme, chatIdNum, getChatById, currentUser]);

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

  // Mark messages as read when entering chat or receiving new messages
  useEffect(() => {
    if (messages.length > 0 && initialScrolled) {
      // Небольшая задержка чтобы успеть показать баннер непрочитанных сообщений
      const markReadTimer = setTimeout(() => {
        markChatAsRead(chatIdNum);
        // Скрываем баннер после первой отметки
        if (showUnreadBanner) {
          setShowUnreadBanner(false);
        }
      }, 1000); // 1 секунда задержки

      return () => clearTimeout(markReadTimer);
    }
  }, [chatIdNum, messages.length, markChatAsRead, initialScrolled]);

  const handleSendMessage = async (content: string, replyToId?: number) => {
    if (!content.trim()) {
      setError({ error: 'Message content cannot be empty' });
      return;
    }
    if (!getChatById(chatIdNum)) {
      setError({ error: 'Chat not found' });
      return;
    }

    try {
      // Check if editing a message (MessageInput formats as "EDIT:{id}:{content}")
      if (content.startsWith('EDIT:')) {
        const parts = content.split(':');
        const messageId = parseInt(parts[1]);
        const newContent = parts.slice(2).join(':');

        console.log('Editing message:', messageId, 'new content:', newContent);

        // Call edit API
        await useChatStore.getState().updateMessage(messageId, newContent);

        // Clear editing state
        setEditingMessage(null);
      } else {
        // Send message through HTTP API with optional reply_to_id
        // Server will broadcast it to all WebSocket clients including sender
        await sendMessage(chatIdNum, content.trim(), replyToId);
      }
    } catch (error: any) {
      console.error('Failed to send/edit message:', error);
      setError({ error: error.message || 'Failed to send/edit message' });
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

  // Message action handlers
  const handleReply = (message: any) => {
    console.log('Reply to message:', message.id);
    setReplyingToMessage(message);
  };

  const handleEdit = (message: any) => {
    console.log('Edit message:', message.id);
    setEditingMessage(message);
  };

  const deleteMessageForUser = useChatStore((state) => state.deleteMessageForUser);
  const restoreMessage = useChatStore((state) => state.restoreMessage);
  const pinMessage = useChatStore((state) => state.pinMessage);
  const unpinMessage = useChatStore((state) => state.unpinMessage);
  const getPinnedMessages = useChatStore((state) => state.getPinnedMessages);

  // Получаем закрепленные сообщения для текущего чата
  const pinnedMessages = useMemo(() => {
    return getPinnedMessages(chatIdNum);
  }, [chatIdNum, messages, getPinnedMessages]);

  const handleDelete = async (messageId: number, deleteFor: 'everyone' | 'me') => {
    console.log('Delete message:', messageId, 'for:', deleteFor);
    try {
      await deleteMessageForUser(messageId, deleteFor);
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      setError({ error: error.message || 'Failed to delete message' });
    }
  };

  const handleRestore = async (messageId: number) => {
    console.log('Restore message:', messageId);
    try {
      await restoreMessage(messageId);
    } catch (error: any) {
      console.error('Failed to restore message:', error);
      setError({ error: error.message || 'Failed to restore message' });
    }
  };

  const handlePin = async (messageId: number) => {
    console.log('Pin message:', messageId);
    try {
      await pinMessage(messageId);
    } catch (error: any) {
      console.error('Failed to pin message:', error);
      setError({ error: error.message || 'Failed to pin message' });
    }
  };

  const handleUnpin = async (messageId: number) => {
    console.log('Unpin message:', messageId);
    try {
      await unpinMessage(messageId);
    } catch (error: any) {
      console.error('Failed to unpin message:', error);
      setError({ error: error.message || 'Failed to unpin message' });
    }
  };

  const handlePinnedMessagePress = (messageId: number) => {
    console.log('Scroll to pinned message:', messageId);
    handleReplyPress(messageId); // Используем ту же логику скролла, что и для ответов
  };

  const handleForward = (message: any) => {
    console.log('Forward message:', message.id);
    setForwardingMessage(message);
  };

  const handleForwardToChat = async (targetChatId: number) => {
    if (!forwardingMessage) return;

    try {
      console.log('Forwarding message', forwardingMessage.id, 'to chat', targetChatId);

      // Получаем имя отправителя оригинального сообщения
      const senderName = forwardingMessage.sender?.name ||
                        forwardingMessage.sender?.email?.split('@')[0] ||
                        `User ${forwardingMessage.sender_id}`;

      // Получаем название чата, откуда пересылается сообщение
      const sourceChat = getChatById(chatIdNum);
      const sourceChatName = sourceChat ? getChatDisplayName(sourceChat) : '';

      // Форматируем временную метку
      const timestamp = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Форматируем пересланное сообщение с префиксом и разделителем
      const forwardPrefix = `📩 Переслано от ${senderName}${sourceChatName ? ` (${sourceChatName})` : ''}`;
      const timestampLine = `📅 ${timestamp}`;
      const separator = '\n─────────────\n';
      const forwardedContent = `${forwardPrefix}\n${timestampLine}${separator}${forwardingMessage.content}\n\n⚠️ Это копия сообщения на момент пересылки`;

      await sendMessage(targetChatId, forwardedContent);

      console.log('Message forwarded successfully');
    } catch (error: any) {
      console.error('Failed to forward message:', error);
      setError({ error: error.message || 'Failed to forward message' });
      throw error; // Пробрасываем ошибку для обработки в модальном окне
    }
  };

  const handleReplyPress = (messageId: number) => {
    console.log('Scroll to message:', messageId);

    // Находим индекс сообщения в инвертированном массиве
    const messageIndex = messages.findIndex(m => m.id === messageId);

    if (messageIndex !== -1) {
      // Прокручиваем к сообщению
      listRef.current?.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5, // Центрируем сообщение на экране
      });

      // Подсвечиваем сообщение
      setHighlightedMessageId(messageId);

      // Убираем подсветку через 2 секунды
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    } else {
      console.log('Message not found in current list, may need to load older messages');
      // TODO: Можно добавить загрузку старых сообщений до нужного ID
    }
  };

  const handleScrollToBottom = () => {
    // В inverted списке scrollToOffset(0) = самые новые сообщения (внизу визуально)
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
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
    {/* Индикатор печатающих пользователей */}
    <TypingIndicator userNames={typingUserNames} />

    {/* Баннер закрепленных сообщений */}
    {pinnedMessages.length > 0 && (
      <PinnedMessageBanner
        pinnedMessages={pinnedMessages}
        onPress={handlePinnedMessagePress}
        onUnpin={handleUnpin}
      />
    )}

    <FlatList
      ref={listRef}
      data={messageListItems}
      extraData={messagesKey}
      renderItem={({ item, index }) => {
        // Рендер разделителя даты
        if (item.type === 'date') {
          return <DateSeparator date={item.data} />;
        }

        // Рендер сообщения
        const message = item.data;

        // Показываем баннер только при первом входе в чат (showUnreadBanner=true)
        // После автоматической отметки сообщений как прочитанных баннер скрывается
        const shouldShowBanner = index === firstUnreadIndex && unreadCount > 0 && showUnreadBanner;

        // Получаем роль пользователя в этом чате
        const currentChat = getChatById(chatIdNum);
        const currentMember = currentChat?.members?.find(m => m.user_id === currentUser?.id);
        const userRole = currentMember?.role || 'member';

        // Логирование для первого сообщения
        if (index === 0) {
          console.log('🔐 User role in chat:', {
            chatId: chatIdNum,
            userId: currentUser?.id,
            role: userRole,
            membersCount: currentChat?.members?.length,
            currentMember,
          });
        }

        return (
          <>
            <MessageItem
              message={message}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onPin={handlePin}
              onUnpin={handleUnpin}
              onForward={handleForward}
              onReplyPress={handleReplyPress}
              isHighlighted={message.id === highlightedMessageId}
              userRole={userRole}
            />
            {shouldShowBanner && <UnreadMessagesBanner unreadCount={unreadCount} />}
          </>
        );
      }}
      keyExtractor={(item, index) =>
        item.type === 'date' ? `date-${index}` : `message-${item.data.id}`
      }
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
      // Обработчик ошибки прокрутки
      onScrollToIndexFailed={(info) => {
        console.log('Failed to scroll to index:', info);
        // Попробуем прокрутить через небольшую задержку
        setTimeout(() => {
          if (info.index < messages.length) {
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0.5,
            });
          }
        }, 100);
      }}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : null
      }
    />

    {/* Floating кнопка "scroll to bottom" */}
    {showScrollToBottom && (
      <TouchableOpacity
        style={[styles.scrollToBottomButton, { backgroundColor: theme.primary }]}
        onPress={handleScrollToBottom}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    )}

    {/* Оборачиваем панель, чтобы измерить её высоту */}
    <View
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h !== inputHeight) setInputHeight(h);
      }}
    >


      <MessageInput
        onSend={handleSendMessage}
        onTyping={handleTyping}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        replyingToMessage={replyingToMessage}
        onCancelReply={() => setReplyingToMessage(null)}
      />
    </View>
  </View>
</KeyboardAvoidingView>


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
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 999,
  },
});

export default ChatScreen;
