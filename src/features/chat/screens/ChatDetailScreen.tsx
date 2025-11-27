/**
 * Chat Detail Screen (Refactored)
 * Экран деталей чата с сообщениями
 */

import React from 'react';
import { View, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAuthStore } from '@shared/store/authStore';
import { Loading } from '@shared/components/common/Loading';
import { MessageInput } from '../components/MessageInput';

// Custom Hooks
import { useChatDetailData } from '../hooks/useChatDetailData';
import { useChatMessageActions } from '../hooks/useChatMessageActions';
import { useChatTyping } from '../hooks/useChatTyping';

// Components
import { ChatDetailHeader } from '../components/ChatDetailHeader';
import { MessageListComponent } from '../components/MessageListComponent';
import { EmptyMessagesState } from '../components/EmptyMessagesState';

type ChatDetailRouteParams = {
  chatId: string;
};

const ChatDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: ChatDetailRouteParams }, 'params'>>();
  const { chatId: chatIdParam } = route.params;
  const chatId = Number(chatIdParam);

  const user = useAuthStore((state) => state.user);

  // Custom Hooks
  const { chat, messages, shouldShowLoadingScreen } = useChatDetailData(chatId);
  const { flatListRef, handleSendMessage, handleReaction, handleLongPress, handleLoadMore } =
    useChatMessageActions(chatId);
  const { typingUsers, handleTyping } = useChatTyping(chatId);

  // Loading state
  if (shouldShowLoadingScreen) {
    return <Loading text="Загрузка сообщений..." fullScreen />;
  }

  // Chat not found
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
      <ChatDetailHeader chat={chat} typingUsers={typingUsers} />

      {messages.length === 0 ? (
        <EmptyMessagesState chatName={chat.name} />
      ) : (
        <MessageListComponent
          chatId={chatId}
          messageListItems={messages.map(msg => ({ type: 'message' as const, data: msg }))}
          messagesKey={`chat-${chatId}`}
          firstUnreadIndex={-1}
          unreadCount={0}
          showUnreadBanner={false}
          initialUnreadCount={0}
          isLoading={false}
          isLoadingMore={false}
          inputHeight={60}
          insetsBottom={0}
          keyboardHeight={0}
          listRef={flatListRef}
          highlightedMessageId={null}
          scrollSessionKey={0}
          onContentSizeChange={() => {}}
          onScroll={() => {}}
          onViewableItemsChanged={null}
          viewabilityConfig={{}}
          onLoadMore={handleLoadMore}
          onReply={() => {}}
          onEdit={() => {}}
          onDelete={async () => {}}
          onRestore={async () => {}}
          onDeletePermanent={async () => {}}
          onPin={async () => {}}
          onUnpin={async () => {}}
          onForward={() => {}}
          onReplyPress={() => {}}
          onPollPress={() => {}}
        />
      )}

      <MessageInput onSend={handleSendMessage} onTyping={handleTyping} />
    </KeyboardAvoidingView>
  );
};

export default ChatDetailScreen;
