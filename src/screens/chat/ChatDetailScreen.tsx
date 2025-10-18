import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useChatStore } from '@store/chatStore';
import { useWebSocket } from '@hooks/useWebSocket';
import { useTypingIndicator } from '@hooks/useTypingIndicator';
import { Loading } from '@components/common/Loading';
import { ChatHeader } from '@components/chat/ChatHeader';
import { MessageBubble } from '@components/chat/MessageBubble';
import { MessageInput } from '@components/chat/MessageInput';
import { Message } from '../../types/chat.types';
import { useAuthStore } from '@store/authStore';

type ChatDetailRouteParams = {
  chatId: string;
};

const ChatDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: ChatDetailRouteParams }, 'params'>>();
  const { chatId: chatIdParam } = route.params;
  const chatId = Number(chatIdParam);

  const user = useAuthStore((state) => state.user);

  // Use individual selectors to prevent re-renders
  const loadMessages = useChatStore((state) => state.loadMessages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const addReaction = useChatStore((state) => state.addReaction);
  const chats = useChatStore((state) => state.chats);
  const isLoading = useChatStore((state) => state.isLoading);
  const chatMessages = useChatStore((state) => state.messages[chatId] || []);

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const hasLoadedRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  const chat = useMemo(() => chats.find((c) => c.id === chatId), [chats, chatId]);

  const { sendTyping } = useWebSocket();
  const { startTyping, typingUsers } = useTypingIndicator(chatId);

  useEffect(() => {
    if (chatId && !isNaN(chatId) && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadMessages(chatId).catch((error) => {
        console.error('Failed to load messages:', error);
        Alert.alert('Ошибка', 'Не удалось загрузить сообщения');
        hasLoadedRef.current = false;
      });
    }
  }, [chatId]);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(chatId, content);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (error: any) {
      Alert.alert('Ошибка', error.message || 'Не удалось отправить сообщение');
      throw error;
    }
  };

  const handleTyping = () => {
    startTyping();
    sendTyping(chatId);
  };

  const handleReaction = async (messageId: number, emoji: string) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleLongPress = (message: Message) => {
    Alert.alert(
      'Действия с сообщением',
      undefined,
      [
        { text: 'Ответить', onPress: () => console.log('Reply to', message.id) },
        { text: 'Переслать', onPress: () => console.log('Forward', message.id) },
        { text: 'Скопировать', onPress: () => console.log('Copy', message.content) },
        {
          text: 'Удалить',
          onPress: () => console.log('Delete', message.id),
          style: 'destructive',
        },
        { text: 'Отмена', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  if (isLoading && chatMessages.length === 0) {
    return <Loading text="Загрузка сообщений..." fullScreen />;
  }

  if (!chat) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loading text="Чат не найден" fullScreen />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ChatHeader chat={chat} typingUsers={typingUsers} />

      <FlatList
        ref={flatListRef}
        data={chatMessages}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwnMessage={item.sender_id === user?.id}
            onReact={handleReaction}
            onLongPress={handleLongPress}
          />
        )}
        inverted
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
        onEndReached={() => {
          // TODO: Implement pagination
          console.log('Load more messages');
        }}
        onEndReachedThreshold={0.5}
      />

      <MessageInput onSend={handleSendMessage} onTyping={handleTyping} />
    </KeyboardAvoidingView>
  );
};

export default ChatDetailScreen;
