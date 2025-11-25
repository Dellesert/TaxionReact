import { useState, useRef, useCallback, useEffect } from 'react';
import { FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChatStore } from '@shared/store/chatStore';
import { getDateLabel } from '@shared/utils/dateHelpers';

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
  const [isScrollingToUnread, setIsScrollingToUnread] = useState(false); // Новое состояние для плавной анимации

  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);

  // Вычисляем initialScrollIndex один раз при монтировании
  useEffect(() => {
    if (messages.length > 0 && initialScrollIndex === undefined) {
      if (firstUnreadIndex !== -1 && unreadCount >= 1) {
        console.log(`📜 [Scroll] Chat ${chatId}: Обнаружено ${unreadCount} непрочитанных, индекс самого старого: ${firstUnreadIndex}, всего сообщений: ${messages.length}`);
        setInitialScrollIndex(firstUnreadIndex);
        // НЕ скрываем UI - просто показываем сразу
        setIsScrollingToUnread(false);
      } else {
        console.log(`📜 [Scroll] Chat ${chatId}: Нет непрочитанных, показываем низ списка`);
        setInitialScrollIndex(0);
        setIsScrollingToUnread(false);
      }
    }
  }, [messages.length, firstUnreadIndex, unreadCount, initialScrollIndex, chatId]);

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

      // Проверяем, нужен ли скролл к непрочитанным
      const needsScrollToUnread = firstUnreadIndex !== -1 && unreadCount >= 1;

      if (needsScrollToUnread) {
        // НЕ скрываем UI - оставляем видимым
        console.log(`📜 [Scroll] Chat ${chatId}: Начинаем позиционирование к непрочитанным (index: ${firstUnreadIndex})`);
        hasScrolledToUnread.current = true;
        setHasReachedBottom(false);

        // Сохраняем позицию для будущего использования
        AsyncStorage.setItem(
          `chat_scroll_position_${chatId}`,
          JSON.stringify({ unreadIndex: firstUnreadIndex, timestamp: Date.now() })
        ).catch(err => console.warn('Failed to save scroll position:', err));

        // Используем небольшую задержку для гарантии рендера списка
        setTimeout(() => {
          console.log(`📜 [Scroll] Chat ${chatId}: Скроллим к индексу ${firstUnreadIndex}`);

          // Для инвертированного списка используем scrollToIndex
          // viewPosition: 0 = элемент вверху экрана (нужен для того чтобы баннер был виден)
          listRef.current?.scrollToIndex({
            index: firstUnreadIndex,
            animated: false,  // Без анимации!
            viewPosition: 0.2, // 20% от верха экрана - баннер будет чуть ниже верхнего края
          });

          // UI уже видим, просто отмечаем что скролл завершен
          console.log(`📜 [Scroll] Chat ${chatId}: Скролл завершен`);
          setInitialScrolled(true);
        }, 100);
      } else {
        // Нет непрочитанных - сразу показываем UI внизу списка
        console.log(`📜 [Scroll] Chat ${chatId}: Нет непрочитанных в handleContentSizeChange, показываем UI`);
        setHasReachedBottom(true);
        setInitialScrolled(true);
      }
    }
  }, [messages.length, firstUnreadIndex, unreadCount, chatId]);

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
    setInitialScrollIndex(undefined);
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
    initialScrollIndex,
    isScrollingToUnread, // Возвращаем новый флаг для управления видимостью UI
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
