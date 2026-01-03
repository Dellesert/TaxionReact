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
  submitSearch: () => void;
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

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Используем ref для callback чтобы избежать пересоздания performSearch
  const onNavigateToMessageRef = useRef(onNavigateToMessage);
  onNavigateToMessageRef.current = onNavigateToMessage;

  // Ref для отслеживания последнего выполненного запроса (предотвращает дублирование)
  const lastSearchQueryRef = useRef<string>('');

  // Ref для доступа к результатам без пересоздания performSearch
  const searchResultsRef = useRef<Message[]>([]);

  // Выполнить поиск
  // navigateToFirst - перейти к первому результату (только при явном submit)
  const performSearch = useCallback(
    async (query: string, newOffset: number = 0, append: boolean = false, navigateToFirst: boolean = false) => {
      if (query.length < MIN_QUERY_LENGTH) {
        setSearchResults([]);
        searchResultsRef.current = [];
        setTotalResults(0);
        setCurrentIndex(0);
        setHasMore(false);
        lastSearchQueryRef.current = '';
        return;
      }

      // Предотвращаем дублирование запроса с тем же query и offset=0
      if (!append && newOffset === 0 && lastSearchQueryRef.current === query) {
        // Если это submit и результаты уже есть - просто навигируем
        if (navigateToFirst) {
          const results = searchResultsRef.current;
          if (results.length > 0) {
            setCurrentIndex(0);
            onNavigateToMessageRef.current(results[0].id);
          }
        }
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

        // Обновляем ref только для новых поисков (не append)
        if (!append) {
          lastSearchQueryRef.current = query;
        }

        if (append) {
          const newResults = [...searchResultsRef.current, ...response.messages];
          searchResultsRef.current = newResults;
          setSearchResults(newResults);
        } else {
          searchResultsRef.current = response.messages;
          setSearchResults(response.messages);
          setCurrentIndex(0);
        }

        setTotalResults(response.total);
        setHasMore(response.has_more);
        setOffset(newOffset);

        // Если есть результаты и явно запрошена навигация, перейти к первому
        if (navigateToFirst && !append && response.messages.length > 0) {
          onNavigateToMessageRef.current(response.messages[0].id);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Search error:', error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [chatId]
  );

  // Debounced поиск при изменении запроса (только подсчет, без навигации)
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (searchQuery.length >= MIN_QUERY_LENGTH) {
      debounceTimer.current = setTimeout(() => {
        performSearch(searchQuery, 0, false, false);
      }, DEBOUNCE_DELAY);
    } else {
      setSearchResults([]);
      searchResultsRef.current = [];
      setTotalResults(0);
      setCurrentIndex(0);
      setHasMore(false);
      lastSearchQueryRef.current = '';
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery, performSearch]);

  // Явный запуск поиска (по нажатию кнопки "Найти" на клавиатуре)
  const submitSearch = useCallback(() => {
    if (searchQuery.length >= MIN_QUERY_LENGTH) {
      performSearch(searchQuery, 0, false, true);
    }
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
    searchResultsRef.current = [];
    setTotalResults(0);
    setCurrentIndex(0);
    setHasMore(false);
    setOffset(0);
    lastSearchQueryRef.current = '';

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Навигация к предыдущему результату
  const navigateToPrev = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onNavigateToMessageRef.current(searchResults[newIndex].id);
    }
  }, [currentIndex, searchResults]);

  // Навигация к следующему результату
  const navigateToNext = useCallback(() => {
    if (currentIndex < searchResults.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onNavigateToMessageRef.current(searchResults[newIndex].id);
    } else if (hasMore) {
      // Загружаем ещё результаты и переходим к следующему
      loadMoreResults();
    }
  }, [currentIndex, searchResults, hasMore]);

  // Навигация к конкретному результату
  const navigateToResult = useCallback(
    (messageId: number) => {
      const index = searchResults.findIndex((msg) => msg.id === messageId);
      if (index !== -1) {
        setCurrentIndex(index);
      }
      onNavigateToMessageRef.current(messageId);
    },
    [searchResults]
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
    submitSearch,
    navigateToPrev,
    navigateToNext,
    navigateToResult,
    loadMoreResults,
  };
};
