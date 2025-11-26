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
  const [userScrolledToBottom, setUserScrolledToBottom] = useState(false); // Флаг намеренного скролла
  const canTrackUserScroll = useRef(false); // Разрешение отслеживать скролл пользователя
  const hasScrolledAwayFromBottom = useRef(false); // Пользователь уже уходил от низа
  const lastOldestMessageId = useRef<number | null>(null);
  const [initialScrollIndex, setInitialScrollIndex] = useState<number | undefined>(undefined);
  const [isScrollingToUnread, setIsScrollingToUnread] = useState(false);
  const [scrollSessionKey, setScrollSessionKey] = useState(0);
  const lastScrollOffset = useRef<number>(0);
  const shouldRestoreScroll = useRef<boolean>(false);

  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);

  // Загружаем сохраненную позицию скролла при входе в чат
  useEffect(() => {
    const loadScrollPosition = async () => {
      try {
        const savedPosition = await AsyncStorage.getItem(`chat_scroll_offset_${chatId}`);
        if (savedPosition) {
          const offset = parseFloat(savedPosition);
          lastScrollOffset.current = offset;
          shouldRestoreScroll.current = true;
          console.log(`📜 [Scroll] Chat ${chatId}: Загружена сохраненная позиция offset=${offset}`);
        }
      } catch (error) {
        console.warn('Failed to load scroll position:', error);
      }
    };

    loadScrollPosition();
  }, [chatId]);

  // Вычисляем initialScrollIndex при появлении сообщений или смене чата
  useEffect(() => {
    if (messages.length > 0 && initialScrollIndex === undefined) {
      const targetIndex = (firstUnreadIndex !== -1 && unreadCount >= 1)
        ? firstUnreadIndex
        : messages.length - 1;

      if (firstUnreadIndex !== -1 && unreadCount >= 1) {
        console.log(`📜 [Scroll] Chat ${chatId}: Обнаружено ${unreadCount} непрочитанных, устанавливаем initialScrollIndex=${firstUnreadIndex}`);
        setHasReachedBottom(false);
      } else {
        console.log(`📜 [Scroll] Chat ${chatId}: Нет непрочитанных, устанавливаем initialScrollIndex=${messages.length - 1}`);
        setHasReachedBottom(true);
      }

      // FlashList автоматически использует этот индекс для начальной позиции
      setInitialScrollIndex(targetIndex);

      // Небольшая задержка перед установкой initialScrolled, чтобы список успел отрендериться
      setTimeout(() => {
        setInitialScrolled(true);

        // Восстанавливаем сохраненную позицию скролла, если она есть
        if (shouldRestoreScroll.current && lastScrollOffset.current > 0) {
          console.log(`📜 [Scroll] Chat ${chatId}: Восстанавливаем позицию offset=${lastScrollOffset.current}`);
          listRef.current?.scrollToOffset({
            offset: lastScrollOffset.current,
            animated: false,
          });
          shouldRestoreScroll.current = false;
        }

        // Даем время на автоматический скролл к непрочитанным, после чего разрешаем отслеживание
        setTimeout(() => {
          canTrackUserScroll.current = true;
          console.log(`📜 [Scroll] Chat ${chatId}: Разрешено отслеживание намеренного скролла пользователя`);
        }, 500);
      }, 100);
    }
  }, [messages.length, firstUnreadIndex, unreadCount, initialScrollIndex, chatId]);

  // Обработчик скролла
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    // Сохраняем текущую позицию скролла
    lastScrollOffset.current = contentOffset.y;

    // Для инвертированного списка (inverted=true):
    // offset.y = 0 означает самый верх (старые сообщения)
    // большой offset.y означает самый низ (новые сообщения)
    // Проверяем расстояние от низа
    // Порог 500px ≈ 5 сообщений (среднее сообщение ~100px)
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const isAtBottom = distanceFromBottom <= 500;

    if (isAtBottom) {
      setHasReachedBottom(true);
      // Отмечаем, что пользователь намеренно проскроллил вниз
      // только если:
      // 1. Прошло достаточно времени после инициализации (canTrackUserScroll)
      // 2. Пользователь уже уходил от низа (hasScrolledAwayFromBottom) - это гарантирует намеренность
      if (initialScrolled && canTrackUserScroll.current && hasScrolledAwayFromBottom.current) {
        setUserScrolledToBottom(true);
        console.log(`📜 [Scroll] Chat ${chatId}: Пользователь намеренно проскроллил вниз`);
      }
      setShowScrollToBottom(false);
      setShowDateHeader(false);
    } else {
      setHasReachedBottom(false);
      setShowScrollToBottom(true);
      setShowDateHeader(true);
      // Пользователь ушел от низа
      if (initialScrolled && canTrackUserScroll.current) {
        hasScrolledAwayFromBottom.current = true;
        console.log(`📜 [Scroll] Chat ${chatId}: Пользователь ушел от низа`);
      }
    }
  }, [initialScrolled, chatId]);

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

  // Обработчик изменения размера контента - теперь только для сохранения позиции
  const handleContentSizeChange = useCallback(() => {
    // Сохраняем позицию непрочитанных для восстановления
    if (initialScrolled && firstUnreadIndex !== -1 && unreadCount >= 1) {
      AsyncStorage.setItem(
        `chat_scroll_position_${chatId}`,
        JSON.stringify({ unreadIndex: firstUnreadIndex, timestamp: Date.now() })
      ).catch(err => console.warn('Failed to save scroll position:', err));
    }
  }, [initialScrolled, firstUnreadIndex, unreadCount, chatId]);

  // Скролл к низу по кнопке
  const handleScrollToBottom = useCallback(() => {
    // Для инвертированного списка:
    // offset=0 = самый верх (старые сообщения)
    // большой offset = самый низ (новые сообщения)
    // Нужно скроллить к большому offset - используем очень большое число
    listRef.current?.scrollToOffset({
      offset: 999999,
      animated: true,
    });
    setHasReachedBottom(true);
    setUserScrolledToBottom(true); // Пользователь намеренно проскроллил вниз
  }, [messages.length]);

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

  // Сохраняем позицию скролла при выходе из чата
  useEffect(() => {
    return () => {
      // Сохраняем позицию при размонтировании
      if (lastScrollOffset.current > 0) {
        AsyncStorage.setItem(
          `chat_scroll_offset_${chatId}`,
          lastScrollOffset.current.toString()
        ).catch(err => console.warn('Failed to save scroll offset:', err));
        console.log(`📜 [Scroll] Chat ${chatId}: Сохранена позиция offset=${lastScrollOffset.current}`);
      }
    };
  }, [chatId]);

  // Сброс состояния при смене чата
  const resetScroll = useCallback(() => {
    setHasMoreMessages(true);
    setInitialScrolled(false);
    setHasReachedBottom(false);
    setUserScrolledToBottom(false); // Сбрасываем флаг намеренного скролла
    canTrackUserScroll.current = false; // Запрещаем отслеживание до следующей инициализации
    hasScrolledAwayFromBottom.current = false; // Сбрасываем флаг ухода от низа
    lastOldestMessageId.current = null;
    setInitialScrollIndex(undefined);
    setIsScrollingToUnread(false);
    setShowScrollToBottom(false);
    setShowDateHeader(false);
    setScrollSessionKey(prev => prev + 1); // Увеличиваем ключ для форсирования ремонтирования FlashList
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
    userScrolledToBottom, // Возвращаем флаг намеренного скролла
    initialScrollIndex,
    isScrollingToUnread, // Возвращаем новый флаг для управления видимостью UI
    scrollSessionKey, // Возвращаем ключ сеанса для FlashList
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
