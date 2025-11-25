import { useState, useCallback, useRef } from 'react';
import { Poll, PollStatus } from '../types/poll.types';
import * as pollApi from '../api/poll.api';
import { PollFilter, deduplicatePolls } from '../utils/pollListHelpers';

const POLLS_PER_PAGE = 50;

interface UsePollListDataReturn {
  polls: Poll[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  refreshing: boolean;
  error: string | null;
  canLoadMore: boolean;
  lastLoadedCount: React.MutableRefObject<number>;
  loadPolls: (append?: boolean, customLimit?: number) => Promise<void>;
  handleRefresh: () => Promise<void>;
  handleLoadMore: () => Promise<void>;
  setCanLoadMore: (value: boolean) => void;
}

/**
 * Custom hook for managing poll list data loading
 */
export const usePollListData = (
  filter: PollFilter,
  searchQuery: string
): UsePollListDataReturn => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canLoadMore, setCanLoadMore] = useState(false);
  const lastLoadedCount = useRef(0);

  const loadPolls = useCallback(
    async (append: boolean = false, customLimit?: number) => {
      try {
        if (!append) {
          setIsLoading(true);
          setCanLoadMore(false);
        }
        setError(null);

        const offset = append ? polls.length : 0;
        const limit = customLimit || POLLS_PER_PAGE;

        let response;

        // Use server search if search query exists
        if (searchQuery.trim()) {
          console.log('🔍 Searching polls with query:', searchQuery.trim());
          response = await pollApi.searchPolls(searchQuery.trim(), limit, offset);
          console.log('🔍 Search results:', response.polls.length, 'polls');
        } else {
          // Form filters based on selected filter
          const filters =
            filter !== 'all' ? { status: filter as PollStatus } : undefined;
          console.log('📋 Loading polls with filters:', filters);
          response = await pollApi.getPolls(filters, limit, offset);
          console.log('📋 Loaded:', response.polls.length, 'polls');
        }

        if (append) {
          // Deduplicate in case backend hasn't restarted with the fix
          const updatedPolls = deduplicatePolls(polls, response.polls);
          setPolls(updatedPolls);
          setTotal(response.total);
          setHasMore(response.hasMore);
        } else {
          // Always use fresh data from server when updating
          setPolls(response.polls);
          setHasMore(response.hasMore);
          setTotal(response.total);

          // If loaded more than one page, allow loading more immediately
          if (customLimit && customLimit > POLLS_PER_PAGE) {
            setCanLoadMore(true);
          }
        }

        // Allow loading more after initial load
        if (!append && !customLimit) {
          setTimeout(() => setCanLoadMore(true), 500);
        }
      } catch (error: any) {
        console.error('Failed to load polls:', error);
        setError(error.message || 'Failed to load polls');
      } finally {
        setIsLoading(false);
      }
    },
    [filter, searchQuery, polls]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setCanLoadMore(false);
    await loadPolls(false);
    setRefreshing(false);
  }, [loadPolls]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    await loadPolls(true);
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, loadPolls]);

  return {
    polls,
    total,
    hasMore,
    isLoading,
    isLoadingMore,
    refreshing,
    error,
    canLoadMore,
    lastLoadedCount,
    loadPolls,
    handleRefresh,
    handleLoadMore,
    setCanLoadMore,
  };
};
