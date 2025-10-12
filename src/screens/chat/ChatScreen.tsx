import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Text,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '@navigation/types';
import { MessageItem } from '@components/chat/MessageItem';
import { MessageInput } from '@components/chat/MessageInput';
import { websocketService } from '@services/websocket.service';
import { useChatStore } from '@store/chatStore';

type Props = NativeStackScreenProps<ChatStackParamList, 'Chat'>;

export const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { chatId, chatName } = route.params;
  const chatIdNum = useMemo(() => Number(chatId), [chatId]);

  // Get state from chatStore
  const allMessages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const loadMessages = useChatStore((state) => state.loadMessages);

  // Memoize messages to avoid creating new array reference
  const messages = useMemo(() => {
    return allMessages[chatIdNum] || [];
  }, [allMessages, chatIdNum]);

  const hasLoadedRef = useRef(false);

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({
      title: chatName || 'Чат',
    });
  }, [chatName, navigation]);

  // Load messages and manage WebSocket
  useEffect(() => {
    // Load messages from API/mock only once
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      console.log('📥 Loading messages for chat:', chatIdNum);
      loadMessages(chatIdNum);
    }

    // Join chat room via WebSocket
    if (websocketService.isConnected()) {
      console.log('🔌 Joining chat room:', chatIdNum);
      websocketService.joinChat(chatIdNum);
    }

    // Leave chat room on unmount
    return () => {
      if (websocketService.isConnected()) {
        console.log('🔌 Leaving chat room:', chatIdNum);
        websocketService.leaveChat(chatIdNum);
      }
    };
  }, [chatIdNum]);

  const handleSendMessage = (content: string) => {
    console.log('📤 Sending message:', content);

    // Send message through WebSocket
    if (websocketService.isConnected()) {
      websocketService.send({
        type: 'new_message',
        chat_id: chatIdNum,
        data: {
          content: content,
          type: 'text',
        },
      });
    } else {
      console.error('❌ WebSocket not connected, cannot send message');
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (websocketService.isConnected()) {
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={messages}
        renderItem={({ item }) => <MessageItem message={item} />}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messagesList}
        inverted={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Нет сообщений</Text>
          </View>
        }
      />
      <MessageInput onSend={handleSendMessage} onTyping={handleTyping} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  messagesList: {
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});

export default ChatScreen;
