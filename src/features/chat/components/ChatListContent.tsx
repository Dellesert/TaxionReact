import React, { useCallback, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { View, RefreshControl, ActivityIndicator, Platform, StyleSheet, Dimensions, LayoutChangeEvent } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatItem } from '../components/ChatItem';
import { ChatListSkeleton } from '../components/ChatListSkeleton';
import { ChatEmptyState } from './ChatEmptyState';
import { useTheme } from '@shared/hooks/useTheme';
import { Chat } from '../types/chat.types';
import { ChatFilter, filterChatsBySearch, combineTabChats } from '../utils/chatHelpers';
import { useChatStore } from '@shared/store/chatStore';

export interface ChatListContentRef {
  scrollToTop: (filter?: ChatFilter, animated?: boolean) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

interface TabData {
  pinnedChats: Chat[];
  regularChats: Chat[];
  loaded: boolean;
  hasMore: boolean;
}

interface ChatListContentProps {
  chatFilter: ChatFilter;
  tabs: Record<ChatFilter, TabData>;
  searchQuery: string;
  isLoading: boolean;
  refreshing: boolean;
  canLoadMore: boolean;
  hasMoreChats: boolean;
  isLoadingMore: boolean;
  isEditMode: boolean;
  selectedChats: number[];
  translateX: Animated.SharedValue<number>;
  swipeGesture: any;
  onRefresh: () => void;
  onLoadMore: () => void;
  onChatPress: (chat: Chat) => void;
  onToggleFavorite: (chatId: number) => void;
  onTogglePinned: (chatId: number) => void;
  onMarkAsRead: (chatId: number) => void;
  onDeleteChat: (chatId: number, clearHistory?: boolean) => void;
}

export const ChatListContent = forwardRef<ChatListContentRef, ChatListContentProps>(({
  chatFilter,
  tabs,
  searchQuery,
  isLoading,
  refreshing,
  canLoadMore,
  hasMoreChats,
  isLoadingMore,
  isEditMode,
  selectedChats,
  translateX,
  swipeGesture,
  onRefresh,
  onLoadMore,
  onChatPress,
  onToggleFavorite,
  onTogglePinned,
  onMarkAsRead,
  onDeleteChat,
}, ref) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Track actual container width (for split view support)
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH);

  // Get typing users from chatStore
  const typingUsers = useChatStore((state) => state.typingUsers);

  // Refs for FlashList instances per tab
  const listRefs = useRef<Record<ChatFilter, any>>({
    all: null,
    private: null,
    group: null,
    favorite: null,
  });

  // Scroll to top helper
  const scrollToTop = useCallback((filterKey?: ChatFilter, animated: boolean = true) => {
    const key = filterKey || chatFilter;
    const listRef = listRefs.current[key];
    if (listRef) {
      listRef.scrollToOffset({ offset: 0, animated });
    }
  }, [chatFilter]);

  // Expose scrollToTop to parent
  useImperativeHandle(ref, () => ({
    scrollToTop,
  }), [scrollToTop]);

  // Handle pin toggle with scroll to top
  const handleTogglePinnedWithScroll = useCallback(async (chatId: number) => {
    await onTogglePinned(chatId);
    // Scroll to top after state update completes (no animation for immediate feedback)
    setTimeout(() => {
      scrollToTop(chatFilter, false);
    }, 150);
  }, [onTogglePinned, chatFilter, scrollToTop]);

  /**
   * Render single chat item
   */
  const renderChatItem = useCallback(
    ({ item, index }: { item: Chat; index: number }) => {
      // Get typing users for this specific chat
      const chatTypingUsers = typingUsers[item.id] || [];

      return (
        <ChatItem
          chat={item}
          onPress={onChatPress}
          isSelected={selectedChats.includes(item.id)}
          isEditMode={isEditMode}
          itemIndex={index}
          typingUsers={chatTypingUsers}
          onToggleFavorite={() => onToggleFavorite(item.id)}
          onTogglePinned={() => handleTogglePinnedWithScroll(item.id)}
          onMarkAsRead={() => onMarkAsRead(item.id)}
          onDelete={onDeleteChat}
        />
      );
    },
    [
      isEditMode,
      selectedChats,
      onChatPress,
      onToggleFavorite,
      handleTogglePinnedWithScroll,
      onMarkAsRead,
      onDeleteChat,
      typingUsers,
    ]
  );

  /**
   * Render content for a specific filter tab
   */
  const renderFilterContent = useCallback(
    (filterKey: ChatFilter) => {
      const tabData = tabs[filterKey];
      const tabChatsFromStore = combineTabChats(tabData.pinnedChats, tabData.regularChats);


      // Apply client-side search filter
      const tabChats = filterChatsBySearch(tabChatsFromStore, searchQuery);

      // Create a hash of relevant chat properties to force re-render when they change
      const chatsHash = tabChats.map(c => `${c.id}-${c.is_favorite}-${c.unread_count}-${c.is_pinned}`).join(',');

      return (
        <View key={filterKey} style={{ width: containerWidth, height: '100%' }}>
          {isLoading && !tabData.loaded ? (
            <ChatListSkeleton />
          ) : tabChats.length === 0 ? (
            <ChatEmptyState />
          ) : (
            <FlashList
              ref={(ref: any) => { listRefs.current[filterKey] = ref; }}
              data={tabChats}
              keyExtractor={(item: Chat) => item.id.toString()}
              renderItem={renderChatItem}
              extraData={{ isEditMode, selectedChats, typingUsers, chatsHash }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
              onEndReached={() => {
                if (canLoadMore && hasMoreChats && !isLoadingMore) {
                  onLoadMore();
                }
              }}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                isLoadingMore && hasMoreChats ? (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : null
              }
              drawDistance={200}
            />
          )}
        </View>
      );
    },
    [
      tabs,
      searchQuery,
      isLoading,
      refreshing,
      canLoadMore,
      hasMoreChats,
      isLoadingMore,
      chatFilter,
      theme,
      insets,
      renderChatItem,
      onRefresh,
      onLoadMore,
    ]
  );

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const filterTabsOrder: ChatFilter[] = ['all', 'private', 'group', 'favorite'];

  // Handle container layout to get actual width
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  }, [containerWidth]);

  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={handleContainerLayout}>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[
          {
            flexDirection: 'row',
            width: containerWidth * 4, // 4 tabs: all, group, private, favorite
            height: '100%',
          },
          animatedContentStyle
        ]}>
          {Platform.OS === 'ios'
            ? // Render all tabs side by side for iOS swipe
              filterTabsOrder.map((filterKey) => renderFilterContent(filterKey))
            : // Render only active tab for Android
              renderFilterContent(chatFilter)}
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
