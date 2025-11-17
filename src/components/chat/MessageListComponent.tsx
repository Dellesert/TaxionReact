import React from 'react';
import { FlatList, View, StyleSheet, ActivityIndicator } from 'react-native';
import { MessageItem } from './MessageItem';
import { DateSeparator } from './DateSeparator';
import { UnreadMessagesBanner } from './UnreadMessagesBanner';
import { MessageSkeleton } from './MessageSkeleton';
import { useTheme } from '@hooks/useTheme';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';

type MessageListItem =
  | { type: 'message'; data: any }
  | { type: 'date'; data: string };

interface MessageListComponentProps {
  chatId: number;
  messageListItems: MessageListItem[];
  messagesKey: string;
  firstUnreadIndex: number;
  unreadCount: number;
  showUnreadBanner: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  inputHeight: number;
  insetsBottom: number;
  listRef: React.RefObject<FlatList<any> | null>;
  highlightedMessageId: number | null;
  onContentSizeChange: () => void;
  onScroll: (event: any) => void;
  onViewableItemsChanged: any;
  viewabilityConfig: any;
  onReply: (message: any) => void;
  onEdit: (message: any) => void;
  onDelete: (messageId: number, deleteFor: 'everyone' | 'me') => void;
  onRestore: (messageId: number) => void;
  onDeletePermanent: (messageId: number) => void;
  onPin: (messageId: number) => void;
  onUnpin: (messageId: number) => void;
  onForward: (message: any) => void;
  onReplyPress: (messageId: number) => void;
  onPollPress: (pollId: number) => void;
  onTaskPress?: (taskId: number) => void;
}

/**
 * Компонент списка сообщений в чате
 */
export const MessageListComponent: React.FC<MessageListComponentProps> = ({
  chatId,
  messageListItems,
  messagesKey,
  firstUnreadIndex,
  unreadCount,
  showUnreadBanner,
  isLoading,
  isLoadingMore,
  inputHeight,
  insetsBottom,
  listRef,
  highlightedMessageId,
  onContentSizeChange,
  onScroll,
  onViewableItemsChanged,
  viewabilityConfig,
  onReply,
  onEdit,
  onDelete,
  onRestore,
  onDeletePermanent,
  onPin,
  onUnpin,
  onForward,
  onReplyPress,
  onPollPress,
  onTaskPress,
}) => {
  const { theme } = useTheme();
  const getChatById = useChatStore((state) => state.getChatById);
  const currentUser = useAuthStore((state) => state.user);

  // Показываем skeleton'ы если сообщения еще не загружены
  const showSkeletons = isLoading && messageListItems.length === 0;

  if (showSkeletons) {
    return (
      <View style={styles.skeletonsContainer}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <MessageSkeleton key={i} isOwn={i % 3 === 0} />
        ))}
      </View>
    );
  }

  return (
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

        // Показываем встроенный баннер только если непрочитанных больше 2
        // (иначе sticky баннер сам справится)
        // firstUnreadIndex - это индекс самого СТАРОГО непрочитанного сообщения (где должен быть баннер)
        const shouldShowInlineBanner = index === firstUnreadIndex && unreadCount > 2 && showUnreadBanner;

        // Получаем роль пользователя в этом чате
        const currentChat = getChatById(chatId);
        const currentMember = currentChat?.members?.find(m => m.user_id === currentUser?.id);
        const userRole = currentMember?.role || 'member';

        return (
          <>
            <MessageItem
              message={message}
              chatType={currentChat?.type}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onRestore={onRestore}
              onDeletePermanent={onDeletePermanent}
              onPin={onPin}
              onUnpin={onUnpin}
              onForward={onForward}
              onReplyPress={onReplyPress}
              onPollPress={onPollPress}
              onTaskPress={onTaskPress}
              isHighlighted={message.id === highlightedMessageId}
              userRole={userRole}
            />
            {shouldShowInlineBanner && <UnreadMessagesBanner unreadCount={unreadCount} />}
          </>
        );
      }}
      keyExtractor={(item, index) =>
        item.type === 'date' ? `date-${index}` : `message-${item.data.id}`
      }
      contentContainerStyle={[
        styles.messagesList,
        { paddingTop: inputHeight + insetsBottom },
      ]}
      inverted={true}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews={false}
      onContentSizeChange={onContentSizeChange}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onScrollToIndexFailed={(info) => {
        console.warn('⚠️ scrollToIndex failed:', info);
        // Сначала скроллим к средней позиции (чтобы FlatList отрендерил больше элементов)
        const averageHeight = info.averageItemLength || 100;
        const offset = averageHeight * info.index;
        listRef.current?.scrollToOffset({ offset, animated: false });

        // Затем пытаемся снова через задержку
        setTimeout(() => {
          if (info.index < messageListItems.length) {
            console.log('🔄 Retrying scroll to index:', info.index);
            listRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
              viewPosition: 0.2,
            });
          }
        }, 300);
      }}
      ListFooterComponent={
        isLoadingMore ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  skeletonsContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  messagesList: {
    paddingVertical: 20,
  },
});
