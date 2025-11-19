import React from 'react';
import { FlatList, View, StyleSheet, ActivityIndicator } from 'react-native';
import { MessageItem } from './MessageItem';
import { DateSeparator } from './DateSeparator';
import { UnreadMessagesBanner } from './UnreadMessagesBanner';
import { MessageSkeleton } from './MessageSkeleton';
import { useTheme } from '@hooks/useTheme';

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
  initialScrollIndex?: number;
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
  selectionMode = false,
  selectedMessages = new Set(),
  onEnterSelectionMode,
  onToggleMessageSelection,
  chatType,
  userRole,
}) => {
  const { theme } = useTheme();

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
      initialScrollIndex={initialScrollIndex}
      getItemLayout={(data, index) => {
        // Приблизительная высота элемента для оптимизации
        const averageItemHeight = 80;
        return {
          length: averageItemHeight,
          offset: averageItemHeight * index,
          index,
        };
      }}
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
