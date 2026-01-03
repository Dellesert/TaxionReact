import React, { useMemo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { PinnedMessageBanner } from '../messages/PinnedMessageBanner';
import { FloatingDateHeader } from '../common/FloatingDateHeader';
import { ScrollToBottomButton } from '../common/ScrollToBottomButton';
import { MessageListComponent } from '../messages/MessageListComponent';
import { MessageInput } from '../messages/MessageInput';
import { SelectionModeToolbar } from '../common/SelectionModeToolbar';
import { SearchNavigationBar } from '../search/SearchNavigationBar';
import { useTheme } from '@shared/hooks/useTheme';
import type { Message, Chat } from '../../types/chat.types';

interface ChatScreenContentProps {
  // Message list props
  chatId: number;
  messageListItems: any[];
  messagesKey: string;
  firstUnreadIndex: number;
  firstNewMessageIndex: number; // Индекс первого нового сообщения (пришедшего во время скролла вверх)
  unreadCount: number;
  showUnreadBanner: boolean;
  initialUnreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  inputHeight: number;
  insetsBottom: number;
  listRef: React.RefObject<any>;
  highlightedMessageId: number | null;
  initialScrollIndex: number | null;
  scrollSessionKey: number;
  hasReachedBottom: boolean;
  isPositionReady?: boolean; // Флаг готовности позиции скролла для показа списка

  // Message list handlers
  onFlashListLoad?: () => void;
  onContentSizeChange: (width: number, height: number) => void;
  onScroll: (event: any) => void;
  onViewableItemsChanged: any;
  viewabilityConfig: any;
  onLoadMore: () => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: number, deleteFor: 'everyone' | 'me') => Promise<void>;
  onRestore: (messageId: number) => Promise<void>;
  onDeletePermanent: (messageId: number) => Promise<void>;
  onPin: (messageId: number) => Promise<void>;
  onUnpin: (messageId: number) => Promise<void>;
  onForward: (message: Message) => void;
  onReplyPress: (messageId: number) => void;
  onPollPress: (pollId: number) => void;
  onTaskPress: (taskId: number) => void;

  // Selection mode props
  selectionMode: boolean;
  selectedMessages: Set<number>;
  onEnterSelectionMode: (messageId: number) => void;
  onToggleMessageSelection: (messageId: number) => void;

  // Chat props
  chatType: 'private' | 'group' | 'channel' | 'saved' | undefined;
  userRole: string;

  // Pinned messages
  pinnedMessages: Message[];
  currentUserRole: string;

  // UI state
  currentDateLabel: string;
  showDateHeader: boolean;
  showScrollToBottom: boolean;
  newMessagesCount: number;
  keyboardHeight: number;
  keyboardHeightAnim: Animated.Value;

  // Input handlers
  onSendMessage: (content: string, replyToId?: number) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  editingMessage: Message | null;
  onCancelEdit: () => void;
  replyingToMessage: Message | null;
  onCancelReply: () => void;
  selectedFileIds: number[];
  onFilesSelected: (fileIds: number[]) => void;
  onRemoveFile: (fileId: number) => void;

  // Action handlers
  onScrollToBottom: () => void;
  onPinnedMessagePress: (messageId: number) => void;
  onBulkDelete: (deleteFor: 'everyone' | 'me') => Promise<void>;
  onExitSelectionMode: () => void;
  canDeleteForEveryone: boolean;

  // Search props
  isSearchVisible?: boolean;
  searchQuery?: string;
  searchTotal?: number;
  searchCurrentIndex?: number;
  isSearchLoading?: boolean;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;

  // Search highlight - активный поисковый запрос для подсветки текста
  activeSearchQuery?: string;
}

export const ChatScreenContent: React.FC<ChatScreenContentProps> = ({
  chatId,
  messageListItems,
  messagesKey,
  firstUnreadIndex,
  firstNewMessageIndex,
  unreadCount,
  showUnreadBanner,
  initialUnreadCount,
  isLoading,
  isLoadingMore,
  inputHeight,
  insetsBottom,
  listRef,
  highlightedMessageId,
  initialScrollIndex,
  scrollSessionKey,
  hasReachedBottom,
  isPositionReady,
  onFlashListLoad,
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
  selectionMode,
  selectedMessages,
  onEnterSelectionMode,
  onToggleMessageSelection,
  chatType,
  userRole,
  pinnedMessages,
  currentUserRole,
  currentDateLabel,
  showDateHeader,
  showScrollToBottom,
  newMessagesCount,
  keyboardHeight,
  keyboardHeightAnim,
  onSendMessage,
  onTyping,
  editingMessage,
  onCancelEdit,
  replyingToMessage,
  onCancelReply,
  selectedFileIds,
  onFilesSelected,
  onRemoveFile,
  onScrollToBottom,
  onPinnedMessagePress,
  onBulkDelete,
  onExitSelectionMode,
  canDeleteForEveryone,
  isSearchVisible,
  searchQuery,
  searchTotal,
  searchCurrentIndex,
  isSearchLoading,
  onNavigatePrev,
  onNavigateNext,
  activeSearchQuery,
}) => {
  const { theme } = useTheme();

  // Создаем анимированный стиль для поднятия инпута через transform
  // Используем translateY вместо bottom для совместимости с native driver
  const inputWrapperAnimatedStyle = useMemo(() => {
    return {
      transform: [
        {
          translateY: keyboardHeightAnim.interpolate({
            inputRange: [0, 1000],
            outputRange: [0, -1000], // Двигаем вверх на высоту клавиатуры
          }),
        },
      ],
    };
  }, [keyboardHeightAnim]);

  return (
    <>
      <FloatingDateHeader dateLabel={currentDateLabel} visible={showDateHeader} />

      {pinnedMessages.length > 0 && (
        <View style={styles.pinnedMessageWrapper}>
          <PinnedMessageBanner
            pinnedMessages={pinnedMessages}
            chatType={chatType}
            currentUserRole={currentUserRole}
            onPress={onPinnedMessagePress}
            onUnpin={onUnpin}
          />
        </View>
      )}

      <View style={styles.flex1}>
        <MessageListComponent
          chatId={chatId}
          messageListItems={messageListItems}
          messagesKey={messagesKey}
          firstUnreadIndex={firstUnreadIndex}
          firstNewMessageIndex={firstNewMessageIndex}
          newMessagesCount={newMessagesCount}
          unreadCount={unreadCount}
          showUnreadBanner={showUnreadBanner}
          initialUnreadCount={initialUnreadCount}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          inputHeight={inputHeight}
          insetsBottom={insetsBottom}
          keyboardHeightAnim={keyboardHeightAnim}
          keyboardHeight={keyboardHeight}
          hasReachedBottom={hasReachedBottom}
          listRef={listRef}
          highlightedMessageId={highlightedMessageId}
          initialScrollIndex={initialScrollIndex}
          scrollSessionKey={scrollSessionKey}
          onContentSizeChange={onContentSizeChange}
          onScroll={onScroll}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onLoadMore={onLoadMore}
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
          selectionMode={selectionMode}
          selectedMessages={selectedMessages}
          onEnterSelectionMode={onEnterSelectionMode}
          onToggleMessageSelection={onToggleMessageSelection}
          chatType={chatType}
          userRole={userRole}
          onFlashListLoad={onFlashListLoad}
          isPositionReady={isPositionReady}
          searchQuery={activeSearchQuery}
        />

        <ScrollToBottomButton
          visible={showScrollToBottom}
          onPress={onScrollToBottom}
          unreadCount={newMessagesCount}
        />
      </View>

      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.backgroundSecondary,
            minHeight: 72, // Фиксированная минимальная высота для предотвращения layout shift
          },
          inputWrapperAnimatedStyle,
        ]}
      >
        {isSearchVisible ? (
          <SearchNavigationBar
            total={searchTotal ?? 0}
            currentIndex={searchCurrentIndex ?? 0}
            isLoading={isSearchLoading ?? false}
            onNavigatePrev={onNavigatePrev ?? (() => {})}
            onNavigateNext={onNavigateNext ?? (() => {})}
            searchQuery={searchQuery ?? ''}
            hideNavigation={keyboardHeight > 0}
          />
        ) : selectionMode ? (
          <SelectionModeToolbar
            selectedCount={selectedMessages.size}
            onCancel={onExitSelectionMode}
            onDelete={onBulkDelete}
            canDeleteForEveryone={canDeleteForEveryone}
          />
        ) : (
          <MessageInput
            onSend={onSendMessage}
            onTyping={onTyping}
            editingMessage={editingMessage}
            onCancelEdit={onCancelEdit}
            replyingToMessage={replyingToMessage}
            onCancelReply={onCancelReply}
            onFilesSelected={onFilesSelected}
            selectedFileIds={selectedFileIds}
            onRemoveFile={onRemoveFile}
          />
        )}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  hiddenContent: {
    flex: 1,
  },
  pinnedMessageWrapper: {
    zIndex: 10,
  },
  inputWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
