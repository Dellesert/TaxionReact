import { useState, useCallback, useEffect } from 'react';
import { Poll, PollStatus } from '../types/poll.types';
import * as pollApi from '../api/poll.api';
import { usePollStore } from '@shared/store/pollStore';

const POLLS_PER_PAGE = 50;

interface UsePollListDataReturn {
  polls: Poll[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadPolls: (filters?: { status?: PollStatus }, searchQuery?: string) => Promise<void>;
  handleRefresh: (filters?: { status?: PollStatus }, searchQuery?: string) => Promise<void>;
  handleLoadMore: (filters?: { status?: PollStatus }, searchQuery?: string) => Promise<void>;
}

/**
 * Custom hook for managing poll list data loading
 * With MMKV caching support
 */
export const usePollListData = (): UsePollListDataReturn => {
  // Cache store
  const cachedPolls = usePollStore((state) => state.polls);
  const cachedTotal = usePollStore((state) => state.total);
  const setCachedPolls = usePollStore((state) => state.setPolls);
  const appendCachedPolls = usePollStore((state) => state.appendPolls);

  // Initialize from cache
  const hasCachedData = cachedPolls.length > 0;

  const [polls, setPolls] = useState<Poll[]>(cachedPolls);
  const [total, setTotal] = useState(cachedTotal);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(!hasCachedData);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync from cache on mount
  useEffect(() => {
    if (hasCachedData) {
      setPolls(cachedPolls);
      setTotal(cachedTotal);
    }
  }, []);

  const loadPolls = useCallback(
    async (filters?: { status?: PollStatus }, searchQuery?: string) => {
      try {
        // Only show loading if no cached data
        if (!hasCachedData) {
          setIsLoading(true);
        }
        setError(null);

        let response;

        // Use server search if search query exists
        if (searchQuery && searchQuery.trim()) {
          response = await pollApi.searchPolls(searchQuery.trim(), POLLS_PER_PAGE, 0);
        } else {
          response = await pollApi.getPolls(filters, POLLS_PER_PAGE, 0);
        }

        setPolls(response.polls);
        setTotal(response.total);
        setHasMore(response.hasMore);

        // Save to cache (only for non-search queries)
        if (!searchQuery || !searchQuery.trim()) {
          setCachedPolls(response.polls, response.total);
        }
      } catch (error: any) {
        console.error('Failed to load polls:', error);
        setError(error.message || 'Failed to load polls');
      } finally {
        setIsLoading(false);
      }
    },
    [hasCachedData, setCachedPolls]
  );

  const handleRefresh = useCallback(
    async (filters?: { status?: PollStatus }, searchQuery?: string) => {
      await loadPolls(filters, searchQuery);
    },
    [loadPolls]
  );

  const handleLoadMore = useCallback(
    async (filters?: { status?: PollStatus }, searchQuery?: string) => {
      if (!hasMore || isLoadingMore || isLoading) {
        return;
      }

      try {
        setIsLoadingMore(true);

        let response;
        const offset = polls.length;

        // Use server search if search query exists
        if (searchQuery && searchQuery.trim()) {
          response = await pollApi.searchPolls(searchQuery.trim(), POLLS_PER_PAGE, offset);
        } else {
          response = await pollApi.getPolls(filters, POLLS_PER_PAGE, offset);
        }

        // Append new polls
        const newPolls = [...polls, ...response.polls];
        setPolls(newPolls);
        setTotal(response.total);
        setHasMore(response.hasMore);

        // Save to cache (only for non-search queries)
        if (!searchQuery || !searchQuery.trim()) {
          appendCachedPolls(response.polls);
        }
      } catch (error: any) {
        console.error('Failed to load more polls:', error);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [hasMore, isLoadingMore, isLoading, polls, appendCachedPolls]
  );

  return {
    polls,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    loadPolls,
    handleRefresh,
    handleLoadMore,
  };
};
