/**
 * useMessageSearch Hook
 * Хук для поиска сообщений в чате
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { searchMessagesInChat } from '../api/chat.api';
import { Message } from '../types/chat.types';

interface UseMessageSearchProps {
  chatId: number;
  onNavigateToMessage: (messageId: number) => void;
}

interface UseMessageSearchResult {
  isSearchVisible: boolean;
  searchQuery: string;
  searchResults: Message[];
  totalResults: number;
  currentIndex: number;
  isLoading: boolean;
  hasMore: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  navigateToPrev: () => void;
  navigateToNext: () => void;
  navigateToResult: (messageId: number) => void;
  loadMoreResults: () => void;
}

const DEBOUNCE_DELAY = 300;
const PAGE_SIZE = 20;
const MIN_QUERY_LENGTH = 3;

export const useMessageSearch = ({
  chatId,
  onNavigateToMessage,
}: UseMessageSearchProps): UseMessageSearchResult => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Выполнить поиск
  const performSearch = useCallback(
    async (query: string, newOffset: number = 0, append: boolean = false) => {
      if (query.length < MIN_QUERY_LENGTH) {
        setSearchResults([]);
        setTotalResults(0);
        setCurrentIndex(0);
        setHasMore(false);
        return;
      }

      // Отменяем предыдущий запрос
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);

      try {
        const response = await searchMessagesInChat(chatId, query, PAGE_SIZE, newOffset);

        if (append) {
          setSearchResults((prev) => [...prev, ...response.messages]);
        } else {
          setSearchResults(response.messages);
          setCurrentIndex(0);
        }

        setTotalResults(response.total);
        setHasMore(response.has_more);
        setOffset(newOffset);

        // Если есть результаты и это новый поиск, перейти к первому
        if (!append && response.messages.length > 0) {
          onNavigateToMessage(response.messages[0].id);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Search error:', error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [chatId, onNavigateToMessage]
  );

  // Debounced поиск при изменении запроса
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.length >= MIN_QUERY_LENGTH) {
      debounceTimer.current = setTimeout(() => {
        performSearch(searchQuery, 0, false);
      }, DEBOUNCE_DELAY);
    } else {
      setSearchResults([]);
      setTotalResults(0);
      setCurrentIndex(0);
      setHasMore(false);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Открыть поиск
  const openSearch = useCallback(() => {
    setIsSearchVisible(true);
  }, []);

  // Закрыть поиск
  const closeSearch = useCallback(() => {
    setIsSearchVisible(false);
    setSearchQuery('');
    setSearchResults([]);
    setTotalResults(0);
    setCurrentIndex(0);
    setHasMore(false);
    setOffset(0);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Навигация к предыдущему результату
  const navigateToPrev = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onNavigateToMessage(searchResults[newIndex].id);
    }
  }, [currentIndex, searchResults, onNavigateToMessage]);

  // Навигация к следующему результату
  const navigateToNext = useCallback(() => {
    if (currentIndex < searchResults.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onNavigateToMessage(searchResults[newIndex].id);
    } else if (hasMore) {
      // Загружаем ещё результаты и переходим к следующему
      loadMoreResults();
    }
  }, [currentIndex, searchResults, hasMore, onNavigateToMessage]);

  // Навигация к конкретному результату
  const navigateToResult = useCallback(
    (messageId: number) => {
      const index = searchResults.findIndex((msg) => msg.id === messageId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
      onNavigateToMessage(messageId);
    },
    [searchResults, onNavigateToMessage]
  );

  // Загрузить больше результатов
  const loadMoreResults = useCallback(() => {
    if (!isLoading && hasMore) {
      const newOffset = offset + PAGE_SIZE;
      performSearch(searchQuery, newOffset, true);
    }
  }, [isLoading, hasMore, offset, searchQuery, performSearch]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isSearchVisible,
    searchQuery,
    searchResults,
    totalResults,
    currentIndex,
    isLoading,
    hasMore,
    openSearch,
    closeSearch,
    setSearchQuery,
    navigateToPrev,
    navigateToNext,
    navigateToResult,
    loadMoreResults,
  };
};
