import { useState, useRef, useCallback } from 'react';
import { FlatList } from 'react-native';
import { useChatStore } from '@store/chatStore';
import { getDateLabel } from '@utils/dateHelpers';

/**
 * Хук для управления скроллом в чате
 */
export const useChatScroll = (chatId: number, messages: any[]) => {
  const listRef = useRef<FlatList<any>>(null);
  const [initialScrolled, setInitialScrolled] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [currentDateLabel, setCurrentDateLabel] = useState<string | null>(null);
  const [showDateHeader, setShowDateHeader] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const scrollToEndOnce = useRef(false);
  const lastOldestMessageId = useRef<number | null>(null);

  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);

  // Обработчик скролла
  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;

    // Показываем элементы UI при прокрутке вверх
    if (contentOffset.y > 50) {
      setShowScrollToBottom(true);
      setShowDateHeader(true);
    } else {
      setShowScrollToBottom(false);
      setShowDateHeader(false);
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

  // Скролл к началу (новым сообщениям)
  const handleContentSizeChange = useCallback(() => {
    if (!scrollToEndOnce.current && messages.length > 0) {
      // Используем requestAnimationFrame для синхронизации с отрисовкой
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        scrollToEndOnce.current = true;
        setInitialScrolled(true);
      });
    }
  }, [messages.length]);

  // Скролл к низу по кнопке
  const handleScrollToBottom = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
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
    scrollToEndOnce.current = false;
    lastOldestMessageId.current = null;
  }, []);

  return {
    listRef,
    initialScrolled,
    showScrollToBottom,
    currentDateLabel,
    showDateHeader,
    isLoadingMore,
    hasMoreMessages,
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
