/**
 * Chat Detail Screen (Refactored)
 * Экран деталей чата с сообщениями
 */

import React, { useRef } from 'react';
import { View, KeyboardAvoidingView, Platform, Animated, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
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
  chatId: number;
};

const ChatDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: ChatDetailRouteParams }, 'params'>>();
  const { chatId } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const user = useAuthStore((state) => state.user);

  // Фиктивный Animated.Value для совместимости (этот экран использует KeyboardAvoidingView)
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <Loading text="Чат не найден" fullScreen />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
            insetsBottom={insets.bottom}
            keyboardHeightAnim={keyboardHeightAnim}
            listRef={flatListRef}
            highlightedMessageId={null}
            scrollSessionKey={0}
            isRestoringPosition={{ current: false }}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatDetailScreen;
