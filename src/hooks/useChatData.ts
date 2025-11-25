import { useState, useCallback } from 'react';
import { useChatStore } from '@store/chatStore';
import { Platform } from 'react-native';
import { ChatFilter, FILTER_TABS_ORDER } from '@utils/chatHelpers';

/**
 * Custom hook for managing chat data loading and state
 */
export const useChatData = () => {
  const {
    chats,
    isLoading,
    isLoadingMore,
    totalChats,
    hasMoreChats,
    error,
    tabs,
    loadTabData,
    switchTab: storeSwitchTab,
    refreshCurrentTab,
    loadMoreChats,
    loadUnreadCount,
  } = useChatStore();

  const [canLoadMore, setCanLoadMore] = useState(false);

  /**
   * Load all tabs on mount for instant switching
   */
  const loadAllTabs = useCallback(async () => {
    // Load current tab first (highest priority)
    await loadTabData('all');

    // Allow loading more after successful first tab load
    setCanLoadMore(true);

    // Load other tabs in background for instant switching
    setTimeout(() => loadTabData('private'), 100);
    setTimeout(() => loadTabData('group'), 200);
    setTimeout(() => loadTabData('favorite'), 300);
  }, [loadTabData]);

  /**
   * Switch to a specific tab
   */
  const switchTab = useCallback(
    async (newFilter: ChatFilter) => {
      // Reset load more flag when switching tabs
      setCanLoadMore(false);
      setTimeout(() => setCanLoadMore(true), 500);

      // Use store switchTab function
      storeSwitchTab(newFilter);

      // Preload adjacent tabs for smooth swipe on iOS
      if (Platform.OS === 'ios') {
        const currentIndex = FILTER_TABS_ORDER.indexOf(newFilter);

        // Preload next tab
        if (currentIndex < FILTER_TABS_ORDER.length - 1) {
          const nextTab = FILTER_TABS_ORDER[currentIndex + 1];
          setTimeout(() => loadTabData(nextTab), 100);
        }

        // Preload previous tab
        if (currentIndex > 0) {
          const prevTab = FILTER_TABS_ORDER[currentIndex - 1];
          setTimeout(() => loadTabData(prevTab), 100);
        }
      }
    },
    [storeSwitchTab, loadTabData]
  );

  /**
   * Refresh current tab data
   */
  const refreshData = useCallback(async () => {
    setCanLoadMore(false);
    await Promise.all([refreshCurrentTab(), loadUnreadCount()]);
    setTimeout(() => setCanLoadMore(true), 500);
  }, [refreshCurrentTab, loadUnreadCount]);

  /**
   * Load more chats if conditions are met
   */
  const handleLoadMore = useCallback(() => {
    if (canLoadMore && hasMoreChats && !isLoadingMore) {
      console.log('[useChatData] Loading more chats...');
      loadMoreChats();
    }
  }, [canLoadMore, hasMoreChats, isLoadingMore, loadMoreChats]);

  return {
    chats,
    isLoading,
    isLoadingMore,
    totalChats,
    hasMoreChats,
    error,
    tabs,
    canLoadMore,
    loadAllTabs,
    switchTab,
    refreshData,
    handleLoadMore,
    loadUnreadCount,
  };
};
