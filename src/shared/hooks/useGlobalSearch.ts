/**
 * useGlobalSearch Hook
 * Управление глобальным поиском: дебаунс, API-вызовы, пагинация
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { globalSearch } from '@shared/api/globalSearch.api';
import { SearchCategory, SearchEntityType } from '@shared/types/globalSearch.types';

interface UseGlobalSearchOptions {
  debounceMs?: number;
  initialLimit?: number;
}

interface UseGlobalSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: SearchCategory[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  loadMore: (categoryType: SearchEntityType) => Promise<void>;
  clearSearch: () => void;
}

export const useGlobalSearch = (options?: UseGlobalSearchOptions): UseGlobalSearchReturn => {
  const { debounceMs = 300, initialLimit = 5 } = options || {};

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchCategory[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const debouncedQuery = useDebounce(query, debounceMs);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length === 0) {
      setResults([]);
      setTotalCount(0);
      setError(null);
      setIsOpen(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await globalSearch({
          q: debouncedQuery.trim(),
          limit: initialLimit,
        });

        // Ignore stale responses
        if (currentRequestId !== requestIdRef.current) return;

        setResults(response.categories || []);
        setTotalCount(response.total_count || 0);
        setIsOpen(true);
      } catch (err: any) {
        if (currentRequestId !== requestIdRef.current) return;
        setError(err.message || 'Ошибка поиска');
        setResults([]);
        setTotalCount(0);
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    performSearch();
  }, [debouncedQuery, initialLimit]);

  const loadMore = useCallback(async (categoryType: SearchEntityType) => {
    const existingCategory = results.find(c => c.type === categoryType);
    if (!existingCategory || !existingCategory.has_more) return;

    setIsLoadingMore(true);

    try {
      const response = await globalSearch({
        q: query.trim(),
        category: categoryType,
        offset: (existingCategory.results || []).length,
        limit: 10,
      });

      const newCategory = (response.categories || []).find(c => c.type === categoryType);
      if (newCategory) {
        setResults(prev =>
          (prev || []).map(cat =>
            cat.type === categoryType
              ? {
                  ...cat,
                  results: [...(cat.results || []), ...(newCategory.results || [])],
                  has_more: newCategory.has_more,
                  total: newCategory.total,
                }
              : cat
          )
        );
      }
    } catch (err: any) {
      console.error('[useGlobalSearch] loadMore error:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [query, results]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotalCount(0);
    setError(null);
    setIsOpen(false);
    requestIdRef.current++;
  }, []);

  return {
    query,
    setQuery,
    results,
    totalCount,
    isLoading,
    isLoadingMore,
    error,
    isOpen,
    setIsOpen,
    loadMore,
    clearSearch,
  };
};
