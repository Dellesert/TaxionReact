import { useState, useRef, useCallback, useEffect } from 'react';
import { FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChatStore } from '@shared/store/chatStore';
import { getDateLabel } from '@shared/utils/dateHelpers';

/**
 * Хук для управления скроллом в чате
 *
 * ОПТИМИЗАЦИЯ: Мемоизация селекторов для снижения ре-рендеров
 */
export const useChatScroll = (chatId: number, messages: any[], firstUnreadIndex: number, unreadCount: number, currentUserId?: number) => {
  const listRef = useRef<FlatList<any>>(null);
  const [initialScrolled, setInitialScrolled] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [currentDateLabel, setCurrentDateLabel] = useState<string | null>(null);
  const [showDateHeader, setShowDateHeader] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [userScrolledToBottom, setUserScrolledToBottom] = useState(false); // Флаг намеренного скролла
  const [newMessagesCount, setNewMessagesCount] = useState(0); // Количество новых сообщений ниже текущей позиции
  const [firstNewMessageIndex, setFirstNewMessageIndex] = useState<number>(-1); // Индекс первого нового непрочитанного сообщения
  const canTrackUserScroll = useRef(false); // Разрешение отслеживать скролл пользователя
  const hasScrolledAwayFromBottom = useRef(false); // Пользователь уже уходил от низа
  const lastOldestMessageId = useRef<number | null>(null);
  const lastVisibleMessageIndex = useRef<number>(-1); // Индекс последнего видимого сообщения
  const previousMessagesLength = useRef<number>(0); // Предыдущее количество сообщений для отслеживания новых
  const previousLastMessageId = useRef<number | null>(null); // ID последнего сообщения из предыдущего состояния
  const [initialScrollIndex, setInitialScrollIndex] = useState<number | undefined>(undefined);
  const [isScrollingToUnread, setIsScrollingToUnread] = useState(false);
  const [scrollSessionKey, setScrollSessionKey] = useState(0);
  const lastScrollOffset = useRef<number>(0);
  const shouldRestoreScroll = useRef<boolean>(false);

  // Оптимизация: функции в Zustand стабильны и не меняются
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
        setHasReachedBottom(false);
      } else {
        setHasReachedBottom(true);
      }

      // FlashList автоматически использует этот индекс для начальной позиции
      setInitialScrollIndex(targetIndex);
      // Инициализируем счетчик предыдущих сообщений
      previousMessagesLength.current = messages.length;

      // Небольшая задержка перед установкой initialScrolled, чтобы список успел отрендериться
      setTimeout(() => {
        setInitialScrolled(true);

        // Восстанавливаем сохраненную позицию скролла, если она есть
        if (shouldRestoreScroll.current && lastScrollOffset.current > 0) {
          listRef.current?.scrollToOffset({
            offset: lastScrollOffset.current,
            animated: false,
          });
          shouldRestoreScroll.current = false;
        }

        // Даем время на автоматический скролл к непрочитанным, после чего разрешаем отслеживание
        setTimeout(() => {
          canTrackUserScroll.current = true;
        }, 500);
      }, 100);
    }
  }, [messages.length, firstUnreadIndex, unreadCount, initialScrollIndex, chatId]);

  // Ref для handleLoadMore чтобы избежать циклической зависимости
  const handleLoadMoreRef = useRef<(() => Promise<void>) | undefined>();

  // Обработчик скролла
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    // Сохраняем текущую позицию скролла
    lastScrollOffset.current = contentOffset.y;

    // Для инвертированного списка (inverted=true):
    // offset.y начинается с отрицательных значений или малых при старте
    // при скролле ВВЕРХ (к старым сообщениям) offset.y уменьшается
    // при скролле ВНИЗ (к новым сообщениям) offset.y увеличивается

    // Расстояние от верхнего края контента
    const distanceFromTop = contentOffset.y;

    // Для инвертированного списка проверяем близость к верхней границе
    // Когда пользователь скроллит вверх к старым сообщениям, offset.y становится маленьким или отрицательным
    const isNearTop = distanceFromTop <= 500; // Увеличен порог до 500px

    // Если пользователь близко к верху и есть еще сообщения - загружаем
    if (isNearTop && initialScrolled && !isLoadingMore && hasMoreMessages && messages.length > 0) {
      // Для инвертированного списка: messages[0] = самое СТАРОЕ сообщение
      const oldestMessage = messages[0];

      if (oldestMessage && lastOldestMessageId.current !== oldestMessage.id) {
        handleLoadMoreRef.current?.();
      }
    }

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
      }
      setShowScrollToBottom(false);
      setShowDateHeader(false);
      // Обнуляем счетчик новых сообщений при достижении низа
      setNewMessagesCount(0);
      setFirstNewMessageIndex(-1); // Сбрасываем индекс первого нового сообщения
    } else {
      setHasReachedBottom(false);
      setShowScrollToBottom(true);
      setShowDateHeader(true);
      // Пользователь ушел от низа
      if (initialScrolled && canTrackUserScroll.current) {
        hasScrolledAwayFromBottom.current = true;
      }
    }
  }, [initialScrolled, chatId, isLoadingMore, hasMoreMessages, messages]);

  // Подгружаем старые сообщения
  const handleLoadMore = useCallback(async () => {
    // Ранние проверки для оптимизации
    if (!initialScrolled || isLoadingMore || messages.length === 0 || !hasMoreMessages) {
      return;
    }

    // Для инвертированного списка: messages[0] = самое СТАРОЕ сообщение
    const oldestMessage = messages[0];
    if (!oldestMessage || lastOldestMessageId.current === oldestMessage.id) {
      return;
    }

    // Устанавливаем ID до начала загрузки для предотвращения дублирования
    lastOldestMessageId.current = oldestMessage.id;
    setIsLoadingMore(true);

    try {
      const addedCount = await loadMoreMessages(chatId, oldestMessage.id);

      if (addedCount === 0) {
        setHasMoreMessages(false);
      }
    } catch (error) {
      console.error(`Failed to load more messages for chat ${chatId}:`, error);
      // Сбрасываем ID при ошибке, чтобы можно было повторить попытку
      lastOldestMessageId.current = null;
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, messages, initialScrolled, isLoadingMore, hasMoreMessages, loadMoreMessages]);

  // Сохраняем ссылку на handleLoadMore для использования в handleScroll
  handleLoadMoreRef.current = handleLoadMore;

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

  // Отслеживаем новые сообщения от других пользователей
  useEffect(() => {
    console.log(`🔍 [useEffect] Trigger: initialScrolled=${initialScrolled}, hasReachedBottom=${hasReachedBottom}, messages.length=${messages.length}`);

    // Пропускаем при первой инициализации или если нет сообщений
    if (!initialScrolled || messages.length === 0) {
      previousMessagesLength.current = messages.length;
      // Сохраняем ID последнего сообщения
      if (messages.length > 0) {
        previousLastMessageId.current = messages[messages.length - 1].id;
      }
      console.log(`🔍 [useEffect] Skipping (not scrolled or no messages)`);
      return;
    }

    // Проверяем, появились ли новые сообщения
    const newMessagesAdded = messages.length - previousMessagesLength.current;
    console.log(`🔍 [useEffect] messages.length changed: ${previousMessagesLength.current} -> ${messages.length}, diff: ${newMessagesAdded}`);

    // ВАЖНО: обрабатываем только если длина массива УВЕЛИЧИЛАСЬ (реально добавились новые сообщения)
    // Если длина осталась прежней - это просто обновление существующего сообщения (например, pin/unpin)
    if (newMessagesAdded > 0 && currentUserId) {
      // Проверяем, куда добавились сообщения - в начало (старые) или в конец (новые)
      // Старые сообщения добавляются в НАЧАЛО массива, новые - в КОНЕЦ

      // ПРОСТАЯ И НАДЕЖНАЯ ПРОВЕРКА:
      // Сравниваем ID текущего последнего сообщения с сохраненным ID предыдущего последнего
      const currentLastMessage = messages[messages.length - 1];
      const currentLastId = currentLastMessage.id;

      // Если ID последнего сообщения НЕ изменился - значит добавились старые в начало
      if (previousLastMessageId.current !== null && currentLastId === previousLastMessageId.current) {
        console.log(`🔍 [useEffect] Last message ID unchanged (${currentLastId}) - old messages loaded from history`);
        console.log(`🔍 [useEffect] Ignoring ${newMessagesAdded} old messages`);
        previousMessagesLength.current = messages.length;
        previousLastMessageId.current = currentLastId;
        return;
      }

      // ID последнего изменился - это новые real-time сообщения в конце
      console.log(`🔍 [useEffect] Last message ID changed: ${previousLastMessageId.current} -> ${currentLastId}`);
      console.log(`🔍 [useEffect] New real-time messages detected`);

      // Это новые сообщения в конце массива
      const newMessages = messages.slice(previousMessagesLength.current);
      const newFromOthers = newMessages.filter(msg => msg.sender_id !== currentUserId).length;

      console.log(`🔍 [useEffect] New real-time messages: ${newMessages.length}, from others: ${newFromOthers}`);

      if (newFromOthers > 0) {
        // Если пользователь внизу (нет непрочитанных) - автоматически прокручиваем
        if (hasReachedBottom && unreadCount === 0) {
          console.log(`⚠️ [useEffect] User at bottom with no unreads - auto-scrolling down`);
          // Небольшая задержка для корректного рендера нового сообщения
          setTimeout(() => {
            listRef.current?.scrollToOffset({
              offset: 999999,
              animated: true,
            });
          }, 100);
        } else {
          // Если пользователь не внизу - показываем счетчик новых сообщений
          console.log(`⚠️ [useEffect] Adding ${newFromOthers} real-time messages to counter`);

          // Если это первое новое сообщение - запоминаем его индекс
          if (firstNewMessageIndex === -1) {
            const firstNewMsgIndex = messages.findIndex((msg, idx) =>
              idx >= previousMessagesLength.current && msg.sender_id !== currentUserId
            );
            if (firstNewMsgIndex !== -1) {
              setFirstNewMessageIndex(firstNewMsgIndex);
            }
          }

          setNewMessagesCount(prev => {
            console.log(`⚠️ [useEffect] newMessagesCount: ${prev} -> ${prev + newFromOthers}`);
            return prev + newFromOthers;
          });
        }
      }

      // Обновляем сохраненный ID последнего сообщения
      previousLastMessageId.current = currentLastId;
    }

    // Обновляем previousMessagesLength только если длина РЕАЛЬНО изменилась
    if (messages.length !== previousMessagesLength.current) {
      previousMessagesLength.current = messages.length;
    }
  }, [messages.length, initialScrolled, hasReachedBottom, currentUserId, chatId, firstNewMessageIndex, unreadCount]); // Добавили unreadCount в зависимости

  // Скролл к низу по кнопке
  const handleScrollToBottom = useCallback(() => {
    // Проверяем, есть ли новые непрочитанные сообщения
    if (newMessagesCount > 0 && firstNewMessageIndex !== -1) {
      // Если есть новые непрочитанные - скроллим к первому новому
      listRef.current?.scrollToIndex({
        index: firstNewMessageIndex,
        animated: true,
        viewPosition: 0.5, // Показываем в центре экрана
      });
      // Не обнуляем счетчик сразу - дадим пользователю прочитать
      // Счетчик обнулится когда пользователь доскроллит до низа
    } else {
      // Если новых непрочитанных нет - скроллим в самый низ
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
      setNewMessagesCount(0); // Обнуляем счетчик новых сообщений
      setFirstNewMessageIndex(-1); // Сбрасываем индекс первого нового сообщения
    }
  }, [messages.length, newMessagesCount, firstNewMessageIndex, chatId]);

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

      // Находим индекс самого нового видимого сообщения (наибольший индекс)
      if (visibleMessages.length > 0) {
        const indices = visibleMessages
          .map((item: any) => item.index)
          .filter((idx: number) => idx !== null && idx !== undefined);

        if (indices.length > 0) {
          const maxVisibleIndex = Math.max(...indices);
          lastVisibleMessageIndex.current = maxVisibleIndex;
        }
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
      }
    };
  }, [chatId]);

  // Сброс состояния при смене чата
  const resetScroll = useCallback(() => {
    setHasMoreMessages(true);
    setInitialScrolled(false);
    setHasReachedBottom(false);
    setUserScrolledToBottom(false); // Сбрасываем флаг намеренного скролла
    setNewMessagesCount(0); // Сбрасываем счетчик новых сообщений
    setFirstNewMessageIndex(-1); // Сбрасываем индекс первого нового сообщения
    canTrackUserScroll.current = false; // Запрещаем отслеживание до следующей инициализации
    hasScrolledAwayFromBottom.current = false; // Сбрасываем флаг ухода от низа
    lastOldestMessageId.current = null;
    lastVisibleMessageIndex.current = -1;
    previousMessagesLength.current = 0; // Сбрасываем счетчик предыдущих сообщений
    previousLastMessageId.current = null; // Сбрасываем сохраненный ID последнего сообщения
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
    newMessagesCount, // Возвращаем количество новых сообщений ниже видимой области
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
