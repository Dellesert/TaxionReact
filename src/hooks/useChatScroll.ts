import { useState, useRef, useCallback, useEffect } from 'react';
import { FlatList } from 'react-native';
import { useChatStore } from '@store/chatStore';
import { getDateLabel } from '@utils/dateHelpers';

/**
 * Хук для управления скроллом в чате
 */
export const useChatScroll = (chatId: number, messages: any[], firstUnreadIndex: number, unreadCount: number) => {
  const listRef = useRef<FlatList<any>>(null);
  const [initialScrolled, setInitialScrolled] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [currentDateLabel, setCurrentDateLabel] = useState<string | null>(null);
  const [showDateHeader, setShowDateHeader] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const scrollToEndOnce = useRef(false);
  const lastOldestMessageId = useRef<number | null>(null);
  const hasScrolledToUnread = useRef(false);
  const [initialScrollIndex, setInitialScrollIndex] = useState<number | undefined>(undefined);

  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);

  // Вычисляем initialScrollIndex один раз при монтировании
  useEffect(() => {
    if (messages.length > 0 && initialScrollIndex === undefined) {
      if (firstUnreadIndex !== -1 && unreadCount > 2) {
        setInitialScrollIndex(firstUnreadIndex);
      } else {
        setInitialScrollIndex(0);
      }
    }
  }, [messages.length, firstUnreadIndex, unreadCount, initialScrollIndex]);

  // Обработчик скролла
  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;

    // Проверяем достигли ли мы самого нового сообщения (низа)
    // contentOffset.y близок к 0 означает что мы внизу (так как список inverted)
    const isAtBottom = contentOffset.y < 50;

    if (isAtBottom) {
      setHasReachedBottom(true);
      setShowScrollToBottom(false);
      setShowDateHeader(false);
    } else {
      setHasReachedBottom(false);
      setShowScrollToBottom(true);
      setShowDateHeader(true);
    }
  }, []);

  // Подгружаем старые сообщения
  const handleLoadMore = useCallback(async () => {
    if (!initialScrolled || isLoadingMore || messages.length === 0 || !hasMoreMessages) {
      return;
    }

    const oldestMessage = messages[messages.length - 1];
    if (!oldestMessage || lastOldestMessageId.current === oldestMessage.id) {
      return;
    }

    lastOldestMessageId.current = oldestMessage.id;
    setIsLoadingMore(true);

    try {
      const addedCount = await loadMoreMessages(chatId, oldestMessage.id);
      if (addedCount === 0) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, messages, initialScrolled, isLoadingMore, hasMoreMessages, loadMoreMessages]);

  // Обработчик изменения размера контента
  const handleContentSizeChange = useCallback(() => {
    if (!scrollToEndOnce.current && messages.length > 0) {
      scrollToEndOnce.current = true;
      setInitialScrolled(true);

      if (firstUnreadIndex !== -1 && unreadCount > 2) {
        hasScrolledToUnread.current = true;
        setHasReachedBottom(false);
      } else {
        setHasReachedBottom(true);
      }
    }
  }, [messages.length, firstUnreadIndex, unreadCount]);

  // Скролл к низу по кнопке
  const handleScrollToBottom = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setHasReachedBottom(true);
  }, []);

  // Скролл к конкретному сообщению
  const handleReplyPress = useCallback((messageId: number, setHighlightedMessageId: (id: number | null) => void) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);

    if (messageIndex !== -1) {
      listRef.current?.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5,
      });

      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    }
  }, [messages]);

  // Обработчик видимых элементов для sticky date header
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const visibleMessages = viewableItems.filter((item: any) => item.item.type === 'message');
      const topVisibleItem = visibleMessages[visibleMessages.length - 1];

      if (topVisibleItem && topVisibleItem.item.data) {
        const message = topVisibleItem.item.data;
        const dateLabel = getDateLabel(message.created_at);
        setCurrentDateLabel(dateLabel);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  });

  // Сброс состояния при смене чата
  const resetScroll = useCallback(() => {
    setHasMoreMessages(true);
    setInitialScrolled(false);
    setHasReachedBottom(false);
    scrollToEndOnce.current = false;
    lastOldestMessageId.current = null;
    hasScrolledToUnread.current = false;
    setInitialScrollIndex(undefined); // Сбрасываем initialScrollIndex
  }, []);

  return {
    listRef,
    initialScrolled,
    showScrollToBottom,
    currentDateLabel,
    showDateHeader,
    isLoadingMore,
    hasMoreMessages,
    hasReachedBottom,
    initialScrollIndex, // Добавляем в возвращаемое значение
    handleScroll,
    handleLoadMore,
    handleContentSizeChange,
    handleScrollToBottom,
    handleReplyPress,
    onViewableItemsChanged,
    viewabilityConfig,
    resetScroll,
  };
};
