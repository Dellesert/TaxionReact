import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MessageItem } from './MessageItem';
import { DateSeparator } from './DateSeparator';
import { UnreadMessagesBanner } from './UnreadMessagesBanner';
import { MessageSkeleton } from './MessageSkeleton';
import { useTheme } from '@shared/hooks/useTheme';

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
  listRef: React.RefObject<any>;
  highlightedMessageId: number | null;
  initialScrollIndex?: number;
  scrollSessionKey: number;
  onContentSizeChange: () => void;
  onScroll: (event: any) => void;
  onViewableItemsChanged: any;
  viewabilityConfig: any;
  onLoadMore: () => void; // Добавлено для загрузки старых сообщений
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
  selectionMode?: boolean;
  selectedMessages?: Set<number>;
  onEnterSelectionMode?: (messageId: number) => void;
  onToggleMessageSelection?: (messageId: number) => void;
  chatType?: 'private' | 'group' | 'channel';
  userRole?: 'owner' | 'admin' | 'member';
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
  initialScrollIndex,
  scrollSessionKey,
  onContentSizeChange,
  onScroll,
  onViewableItemsChanged,
  viewabilityConfig,
  onLoadMore,
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
  selectionMode = false,
  selectedMessages = new Set(),
  onEnterSelectionMode,
  onToggleMessageSelection,
  chatType,
  userRole,
}) => {
  const { theme } = useTheme();

  // Логируем, что onLoadMore передан
  React.useEffect(() => {
    console.log(`📋 [MessageListComponent] Chat ${chatId}: onLoadMore is ${typeof onLoadMore === 'function' ? 'defined' : 'undefined'}`);
  }, [chatId, onLoadMore]);

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
    // @ts-ignore - FlashList типы могут быть устаревшими
    <FlashList
      key={`chat-${chatId}-session-${scrollSessionKey}`}
      ref={listRef}
      data={messageListItems}
      extraData={messagesKey}
      estimatedItemSize={100}
      initialScrollIndex={initialScrollIndex}
      renderItem={({ item, index }) => {
        // Рендер разделителя даты
        if (item.type === 'date') {
          return <DateSeparator date={item.data} />;
        }

        // Рендер сообщения
        const message = item.data;

        // Показываем встроенный баннер при наличии непрочитанных
        // firstUnreadIndex - это индекс самого СТАРОГО непрочитанного сообщения (где должен быть баннер)
        const shouldShowInlineBanner = index === firstUnreadIndex && unreadCount >= 1 && showUnreadBanner;

        return (
          <>
            {shouldShowInlineBanner && <UnreadMessagesBanner unreadCount={unreadCount} />}
            <MessageItem
              message={message}
              chatType={chatType}
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
              selectionMode={selectionMode}
              isSelected={selectedMessages.has(message.id)}
              onEnterSelectionMode={onEnterSelectionMode}
              onToggleSelection={onToggleMessageSelection}
            />
          </>
        );
      }}
      keyExtractor={(item, index) =>
        item.type === 'date' ? `date-${index}` : `message-${item.data.id}`
      }
      contentContainerStyle={[
        styles.messagesList,
        { paddingBottom: inputHeight + insetsBottom },
      ]}
      inverted={true}
      keyboardShouldPersistTaps="handled"
      removeClippedSubviews={false}
      onContentSizeChange={onContentSizeChange}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onScrollToIndexFailed={(info: any) => {
        const averageHeight = info.averageItemLength || 100;
        const offset = averageHeight * info.index;
        listRef.current?.scrollToOffset({ offset, animated: false });

        setTimeout(() => {
          if (info.index < messageListItems.length) {
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
