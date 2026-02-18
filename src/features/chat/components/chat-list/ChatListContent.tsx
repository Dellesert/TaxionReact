import React, { useCallback, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { View, RefreshControl, ActivityIndicator, Platform, StyleSheet, Dimensions, LayoutChangeEvent, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatItem } from './ChatItem';
import { ChatListSkeleton } from './ChatListSkeleton';
import { ChatEmptyState } from './ChatEmptyState';
import { useTheme } from '@shared/hooks/useTheme';
import { useCustomScrollbarStyle } from '@shared/hooks/useCustomScrollbarStyle';
import { Chat } from '../../types/chat.types';
import { ChatFilter, filterChatsBySearch, combineTabChats } from '../../utils/chatHelpers';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';

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
  onClearHistory: (chatId: number) => void;
}

export const ChatListContent = forwardRef<ChatListContentRef, ChatListContentProps>(({
  chatFilter,
  tabs: tabsFromProps,
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
  onClearHistory,
}, ref) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { scrollbarRef } = useCustomScrollbarStyle();

  // Track actual container width (for split view support)
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH);

  // Get typing users from chatStore
  const typingUsers = useChatStore((state) => state.typingUsers);

  // Subscribe to tabs directly from store for real-time presence updates
  // Using a custom equality function to detect member status changes
  const tabs = useChatStore((state) => state.tabs);

  // Create a version counter that changes when any member status changes
  // This forces re-render when presence updates happen
  const tabsVersion = useChatStore((state) => {
    let hash = '';
    const tabKeys = ['all', 'private', 'group', 'channel'] as const;
    for (const key of tabKeys) {
      const tab = state.tabs[key];
      for (const chat of [...tab.pinnedChats, ...tab.regularChats]) {
        if (chat.members) {
          for (const m of chat.members) {
            hash += `${m.user_id}:${m.user?.status || 'unknown'},`;
          }
        }
      }
    }
    return hash;
  });

  // Get current user ID for chat filtering
  const currentUser = useAuthStore((state) => state.user);

  // Refs for FlashList instances per tab
  const listRefs = useRef<Record<ChatFilter, any>>({
    all: null,
    private: null,
    group: null,
    channel: null,
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
          onClearHistory={() => onClearHistory(item.id)}
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
      onClearHistory,
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
      const tabChats = filterChatsBySearch(tabChatsFromStore, searchQuery, currentUser?.id);

      // Create a hash of relevant chat properties to force re-render when they change
      // Include member status for online indicator updates, read status for checkmarks, and avatar for group chat updates
      const chatsHash = tabChats.map(c => {
        const memberStatus = c.members?.map(m => `${m.user_id}:${m.user?.status}`).join('|') || '';
        const readByLength = c.last_message?.read_by?.length || 0;
        const deliveredLength = c.last_message?.delivered_to?.length || 0;
        return `${c.id}-${c.is_favorite}-${c.unread_count}-${c.is_pinned}-${memberStatus}-${readByLength}-${deliveredLength}-${c.avatar || ''}-${c.name || ''}`;
      }).join(',');

      return (
        <View key={filterKey} style={{ width: containerWidth, height: '100%' }}>
          {isLoading && !tabData.loaded ? (
            <ChatListSkeleton />
          ) : tabChats.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyStateContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.textSecondary}
                  colors={[theme.primary]}
                  progressBackgroundColor={theme.card}
                />
              }
            >
              <ChatEmptyState searchQuery={searchQuery} />
            </ScrollView>
          ) : (
            <FlashList
              ref={(ref: any) => { listRefs.current[filterKey] = ref; }}
              data={tabChats}
              keyExtractor={(item: Chat) => item.id.toString()}
              renderItem={renderChatItem}
              extraData={{ isEditMode, selectedChats, typingUsers, chatsHash, tabsVersion }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.textSecondary}
                  colors={[theme.primary]}
                  progressBackgroundColor={theme.card}
                />
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
      tabsVersion,
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
      currentUser?.id,
    ]
  );

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const filterTabsOrder: ChatFilter[] = ['all', 'private', 'group', 'channel'];

  // Handle container layout to get actual width
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  }, [containerWidth]);

  return (
    <View ref={scrollbarRef} style={{ flex: 1, overflow: 'hidden' }} onLayout={handleContainerLayout}>
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
  emptyStateContainer: {
    flexGrow: 1,
  },
});
