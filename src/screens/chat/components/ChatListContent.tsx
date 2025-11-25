import React, { useCallback } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, Platform, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatItem } from '@components/chat/ChatItem';
import { ChatListSkeleton } from '@components/chat/ChatListSkeleton';
import { ChatEmptyState } from './ChatEmptyState';
import { useTheme } from '@hooks/useTheme';
import { Chat } from '@/types/chat.types';
import { ChatFilter, filterChatsBySearch, combineTabChats } from '@utils/chatHelpers';

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

export const ChatListContent: React.FC<ChatListContentProps> = ({
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
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  /**
   * Render single chat item
   */
  const renderChatItem = useCallback(
    ({ item }: { item: Chat }) => (
      <ChatItem
        chat={item}
        onPress={onChatPress}
        isSelected={selectedChats.includes(item.id)}
        isEditMode={isEditMode}
        onToggleFavorite={() => onToggleFavorite(item.id)}
        onTogglePinned={() => onTogglePinned(item.id)}
        onMarkAsRead={() => onMarkAsRead(item.id)}
        onDelete={onDeleteChat}
      />
    ),
    [
      isEditMode,
      selectedChats,
      onChatPress,
      onToggleFavorite,
      onTogglePinned,
      onMarkAsRead,
      onDeleteChat,
    ]
  );

  /**
   * Render content for a specific filter tab
   */
  const renderFilterContent = useCallback(
    (filterKey: ChatFilter) => {
      const tabData = tabs[filterKey];
      const tabChatsFromStore = combineTabChats(tabData.pinnedChats, tabData.regularChats);

      console.log(
        `[ChatListContent] renderFilterContent for tab "${filterKey}" - pinned: ${tabData.pinnedChats.length}, regular: ${tabData.regularChats.length}, total: ${tabChatsFromStore.length}`
      );

      // Apply client-side search filter
      const tabChats = filterChatsBySearch(tabChatsFromStore, searchQuery);

      return (
        <View key={filterKey} style={{ width: SCREEN_WIDTH, height: '100%' }}>
          {isLoading && !tabData.loaded ? (
            <ChatListSkeleton />
          ) : tabChats.length === 0 ? (
            <ChatEmptyState />
          ) : (
            <FlatList
              data={tabChats}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderChatItem}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
              onEndReached={() => {
                console.log('[ChatListContent] onEndReached triggered:', {
                  canLoadMore,
                  hasMoreChats,
                  isLoadingMore,
                  currentTab: chatFilter,
                  tabHasMore: tabs[chatFilter]?.hasMore,
                });
                if (canLoadMore && hasMoreChats && !isLoadingMore) {
                  console.log('[ChatListContent] Loading more chats...');
                  onLoadMore();
                } else {
                  console.log('[ChatListContent] Blocked from loading more');
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
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={15}
              windowSize={5}
              getItemLayout={(_data, index) => ({
                length: 80,
                offset: 80 * index,
                index,
              })}
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

  return (
    <View style={{ flex: 1, overflow: 'hidden' }}>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.horizontalTabsContainer, animatedContentStyle]}>
          {Platform.OS === 'ios'
            ? // Render all tabs side by side for iOS swipe
              filterTabsOrder.map((filterKey) => renderFilterContent(filterKey))
            : // Render only active tab for Android
              renderFilterContent(chatFilter)}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  horizontalTabsContainer: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 4, // 4 tabs: all, group, private, favorite
    height: '100%',
  },
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
