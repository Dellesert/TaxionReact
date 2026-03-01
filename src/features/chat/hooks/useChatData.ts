import { useState, useCallback } from 'react';
import { useChatStore } from '@shared/store/chatStore';
import { ChatFilter } from '../utils/chatHelpers';

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
    silentRefreshCurrentTab,
    loadMoreChats,
    loadUnreadCount,
  } = useChatStore();

  const [canLoadMore, setCanLoadMore] = useState(false);

  /**
   * Load initial chat data on mount.
   * Only loads the 'all' tab (2 API calls instead of 8).
   * Other tabs load on-demand when the user switches to them,
   * with instant preview derived from cached 'all' tab data.
   */
  const loadAllTabs = useCallback(async () => {
    // Load only the 'all' tab — other tabs load on-demand via switchTab
    await loadTabData('all');

    // Allow loading more after successful first tab load
    setCanLoadMore(true);
  }, [loadTabData]);

  /**
   * Switch to a specific tab
   */
  const switchTab = useCallback(
    async (newFilter: ChatFilter) => {
      // Reset load more flag when switching tabs
      setCanLoadMore(false);
      setTimeout(() => setCanLoadMore(true), 500);

      // Use store switchTab — loads tab data on-demand if not cached
      storeSwitchTab(newFilter);
    },
    [storeSwitchTab]
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
    silentRefreshCurrentTab,
    handleLoadMore,
    loadUnreadCount,
  };
};
