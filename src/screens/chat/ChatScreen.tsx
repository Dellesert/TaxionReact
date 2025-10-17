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
import { websocketService } from '@services/websocket.service';
import { useChatStore } from '@store/chatStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ ДОБАВЬ ЭТО
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<ChatStackParamList, 'Chat'>;

export const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { chatId, chatName } = route.params;
  const chatIdNum = useMemo(() => Number(chatId), [chatId]);

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

  // ✅ ДОБАВЬ ЭТО
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const messages = useMemo(() => allMessages[chatIdNum] || [], [allMessages, chatIdNum]);
  const hasLoadedRef = useRef(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);

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
          websocketService.connect(token);
        } else {
          setError({ error: 'No authentication token found' });
        }
      }
      if (websocketService.isConnected() && getChatById(chatIdNum)) {
        websocketService.joinChat(chatIdNum);
      }
    };
    connectWebSocket();
    return () => {
      // Clear active chat when leaving
      setActiveChat(null);
      if (websocketService.isConnected()) {
        websocketService.leaveChat(chatIdNum);
      }
    };
  }, [chatIdNum, setError, getChatById, setActiveChat]);

  useEffect(() => {
  if (messages.length > 0) {
    const id = requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    return () => cancelAnimationFrame(id);
  }
}, [messages.length]);

  // Mark messages as read when entering chat
  useEffect(() => {
    if (messages.length > 0) {
      // Mark the last message as read to indicate all messages in chat are read
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        markMessageRead(lastMessage.id);
      }
    }
  }, [chatIdNum, messages.length, markMessageRead]);

  const handleSendMessage = (content: string) => {
    if (!content.trim()) {
      setError({ error: 'Message content cannot be empty' });
      return;
    }
    if (!getChatById(chatIdNum)) {
      setError({ error: 'Chat not found' });
      return;
    }
    if (websocketService.isConnected()) {
      websocketService.send({
        type: 'new_message',
        chat_id: chatIdNum,
        data: { content: content.trim(), type: 'text' },
      });
    } else {
      setError({ error: 'WebSocket not connected' });
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (websocketService.isConnected() && getChatById(chatIdNum)) {
      websocketService.sendTyping(chatIdNum, isTyping);
    }
  };

  if (isLoading && messages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E94444" />
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
  style={styles.container}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
>
  <View style={styles.inner}>
    <FlatList
      ref={listRef}
      data={messages}
      renderItem={({ item }) => <MessageItem message={item} />}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={[
        styles.messagesList,
        { paddingBottom: inputHeight + insets.bottom }, // 👈 место для инпута
      ]}
      inverted={false}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews={false}

      // 👇 как только контент посчитан/обновился — уезжаем в самый низ
      onContentSizeChange={() => {
        if (messages.length === 0) return;
        listRef.current?.scrollToEnd({ animated: false });
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated: false });
        });
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { flex: 1 }, // ✅ важно
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF',
  },
  messagesList: { paddingVertical: 20 },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40,
  },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
});

export default ChatScreen;
