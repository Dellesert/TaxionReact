import { useState, useCallback } from 'react';
import { Poll, PollStatus } from '../types/poll.types';
import * as pollApi from '../api/poll.api';

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
 * Simplified to match task list behavior
 */
export const usePollListData = (): UsePollListDataReturn => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPolls = useCallback(
    async (filters?: { status?: PollStatus }, searchQuery?: string) => {
      try {
        setIsLoading(true);
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
      } catch (error: any) {
        console.error('Failed to load polls:', error);
        setError(error.message || 'Failed to load polls');
      } finally {
        setIsLoading(false);
      }
    },
    []
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
        setPolls(prevPolls => [...prevPolls, ...response.polls]);
        setTotal(response.total);
        setHasMore(response.hasMore);
      } catch (error: any) {
        console.error('Failed to load more polls:', error);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [hasMore, isLoadingMore, isLoading, polls.length]
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
