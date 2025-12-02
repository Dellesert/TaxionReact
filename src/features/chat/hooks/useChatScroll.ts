import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { FlatList, Platform } from 'react-native';
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
  const wasAtBottomBeforeNewMessage = useRef<boolean>(true); // Был ли пользователь внизу перед новым сообщением
  const previousUnreadCount = useRef<number>(0); // Количество непрочитанных до прихода новых сообщений
  const hasCalculatedInitialIndex = useRef<boolean>(false); // Флаг, что индекс уже вычислен
  const [isScrollingToUnread, setIsScrollingToUnread] = useState(false);
  const [scrollSessionKey, setScrollSessionKey] = useState(0);
  const lastScrollOffset = useRef<number>(0);
  const isRestoringPosition = useRef<boolean>(false); // Флаг процесса восстановления
  const isLoadingOldMessages = useRef<boolean>(false); // Флаг загрузки старых сообщений
  const contentHeightBeforeLoad = useRef<number>(0); // Высота контента перед загрузкой старых сообщений
  const scrollOffsetBeforeLoad = useRef<number>(0); // Позиция скролла перед загрузкой
  const currentContentHeight = useRef<number>(0); // Текущая высота контента (обновляется при каждом вызове handleContentSizeChange)
  const scrollAdjustmentTimer = useRef<NodeJS.Timeout | null>(null); // Таймер для множественных корректировок

  // ✅ Вычисляем initialScrollIndex В USEMEMO, до первого рендера!
  const initialScrollIndex = useMemo(() => {
    // ⚠️ КРИТИЧЕСКИ ВАЖНО: Вычисляем ТОЛЬКО ОДИН РАЗ при первом рендере!
    // Если уже вычисляли - возвращаем undefined (блокируем повторное вычисление)
    if (hasCalculatedInitialIndex.current) {
      return undefined;
    }

    // Если нет сообщений - возвращаем undefined
    if (messages.length === 0) {
      return undefined;
    }

    // Помечаем что индекс вычислен (ПЕРЕД любыми return!)
    hasCalculatedInitialIndex.current = true;

    // ПРИОРИТЕТ 1: Если есть непрочитанные - скроллим к первому непрочитанному
    if (firstUnreadIndex !== -1 && unreadCount >= 1) {
      setHasReachedBottom(false);
      return firstUnreadIndex;
    }

    // ПРИОРИТЕТ 2: Скроллим к последнему сообщению (вниз)
    setHasReachedBottom(true);
    return messages.length - 1;
  }, [messages.length, firstUnreadIndex, unreadCount, chatId]);

  // Оптимизация: функции в Zustand стабильны и не меняются
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);

  // Устанавливаем initialScrolled после появления сообщений
  useEffect(() => {
    if (messages.length > 0 && !initialScrolled) {
      // Инициализируем счетчик предыдущих сообщений
      previousMessagesLength.current = messages.length;

      // Обычная инициализация - мгновенный показ
      setInitialScrolled(true);
      console.log('✅ [Init] initialScrolled set to true, messages:', messages.length);

      // Даем время на автоматический скролл к непрочитанным, после чего разрешаем отслеживание
      setTimeout(() => {
        canTrackUserScroll.current = true;
        console.log('✅ [Init] canTrackUserScroll enabled');
      }, 300);
    }
  }, [messages.length, initialScrolled]);

  // Ref для handleLoadMore чтобы избежать циклической зависимости
  const handleLoadMoreRef = useRef<(() => Promise<void>) | null>(null);

  // Handle keyboard show - for inverted list
  const handleKeyboardWillShow = useCallback((keyboardHeight: number) => {
    // Скроллим список вниз на высоту клавиатуры после небольшой задержки
    // чтобы дать время padding начать анимацию
    if (listRef.current && initialScrolled && messages.length > 0) {
      setTimeout(() => {
        const currentOffset = lastScrollOffset.current;
        const newOffset = currentOffset + keyboardHeight;

        if (listRef.current) {
          listRef.current.scrollToOffset({
            offset: newOffset,
            animated: true, // Используем анимацию для плавности
          });
        }
      }, 100);
    }
  }, [initialScrolled, messages.length]);

  // Handle keyboard animation progress - не используется
  const handleKeyboardAnimating = useCallback((_currentHeight: number, _targetHeight: number) => {
    // Не делаем ничего
  }, []);

  // Handle keyboard hide - for inverted list
  const handleKeyboardWillHide = useCallback(() => {
    // При скрытии клавиатуры также ничего не делаем
    // Паддинг уменьшится и сообщения вернутся на место
  }, []);

  // Счетчик для throttling логов (чтобы не спамить консоль)
  const scrollLogCounter = useRef(0);

  // Обработчик скролла
  const handleScroll = useCallback((event: any) => {
    // ⚠️ КРИТИЧЕСКИ ВАЖНО: Игнорируем события скролла во время восстановления позиции!
    if (isRestoringPosition.current) {
      return;
    }

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    // Сохраняем текущую позицию скролла
    lastScrollOffset.current = contentOffset.y;

    // 🔍 ДИАГНОСТИКА iOS: Логируем каждый 20-й скролл чтобы не спамить
    if (Platform.OS === 'ios') {
      scrollLogCounter.current++;
      if (scrollLogCounter.current === 1) {
        console.log('🎯 [First Scroll Event]', {
          initialScrolled,
          offsetY: contentOffset.y.toFixed(2),
          messagesCount: messages.length,
        });
      }
      if (initialScrolled && scrollLogCounter.current % 20 === 0) {
        console.log('📱 [iOS Scroll Debug]', {
          offsetY: contentOffset.y.toFixed(2),
          contentHeight: contentSize.height.toFixed(2),
          layoutHeight: layoutMeasurement.height.toFixed(2),
          messagesCount: messages.length,
        });
      }
    }

    // Для инвертированного списка (inverted=true):
    // offset.y начинается с отрицательных значений или малых при старте
    // при скролле ВВЕРХ (к старым сообщениям) offset.y уменьшается
    // при скролле ВНИЗ (к новым сообщениям) offset.y увеличивается

    // Расстояние от верхнего края контента
    const distanceFromTop = contentOffset.y;

    // Вычисляем расстояния от краев для определения позиции скролла
    // Порог 500px ≈ 5 сообщений (среднее сообщение ~100px)
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;

    // Для инвертированного списка проверяем близость к верхней границе
    // Когда пользователь скроллит вверх к старым сообщениям, offset.y становится маленьким или отрицательным

    // ⚠️ ВАЖНО: На iOS с inverted={true} поведение может отличаться
    // Попробуем два варианта проверки:
    // 1. Стандартный: distanceFromTop <= 500 (работает на Web/Android)
    // 2. Альтернативный: проверка расстояния от конца контента (может работать на iOS)
    const isNearTopStandard = distanceFromTop <= 500;
    const isNearTopAlternative = distanceFromBottom >= contentSize.height - layoutMeasurement.height - 500;

    // Для iOS используем альтернативную проверку, для остальных - стандартную
    const isNearTop = Platform.OS === 'ios' ? isNearTopAlternative : isNearTopStandard;

    // 🔍 ДИАГНОСТИКА: Логируем данные скролла только когда близко к верху (для отладки iOS)
    if (isNearTop && !isLoadingMore) {
      console.log('📱 [Scroll Near Top]', {
        platform: Platform.OS,
        initialScrolled,
        offsetY: contentOffset.y.toFixed(2),
        distanceFromTop: distanceFromTop.toFixed(2),
        distanceFromBottom: distanceFromBottom.toFixed(2),
        isNearTopStandard,
        isNearTopAlternative,
        hasMoreMessages,
        messagesCount: messages.length,
        oldestMessageId: messages[0]?.id,
        lastOldestId: lastOldestMessageId.current,
      });
    }

    // Если пользователь близко к верху и есть еще сообщения - загружаем
    // ВАЖНО: Убрали проверку initialScrolled, так как на iOS первое событие скролла происходит ДО установки этого флага
    if (isNearTop && !isLoadingMore && hasMoreMessages && messages.length > 0) {
      // Для инвертированного списка: messages[0] = самое СТАРОЕ сообщение
      const oldestMessage = messages[0];

      if (oldestMessage && lastOldestMessageId.current !== oldestMessage.id) {
        console.log('🔄 [Scroll] Triggering load more, distanceFromTop:', distanceFromTop, 'platform:', Platform.OS);
        handleLoadMoreRef.current?.();
      }
    }

    // Проверяем достигли ли низа списка
    const isAtBottom = distanceFromBottom <= 500;

    if (isAtBottom) {
      setHasReachedBottom(true);
      wasAtBottomBeforeNewMessage.current = true; // Запоминаем что пользователь внизу
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
      wasAtBottomBeforeNewMessage.current = false; // Запоминаем что пользователь НЕ внизу
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
    if (isLoadingMore || messages.length === 0 || !hasMoreMessages) {
      return;
    }

    // Для инвертированного списка: messages[0] = самое СТАРОЕ сообщение
    const oldestMessage = messages[0];
    if (!oldestMessage || lastOldestMessageId.current === oldestMessage.id) {
      return;
    }

    // Устанавливаем ID до начала загрузки для предотвращения дублирования
    lastOldestMessageId.current = oldestMessage.id;

    // ✅ КРИТИЧЕСКИ ВАЖНО: Сохраняем ТОЧНУЮ позицию скролла и высоту контента
    // ДО начала загрузки, чтобы потом точно восстановить визуальную позицию
    const currentOffset = lastScrollOffset.current;
    const currentHeight = currentContentHeight.current;

    scrollOffsetBeforeLoad.current = currentOffset;
    contentHeightBeforeLoad.current = currentHeight;

    console.log('📥 [LoadMore] Saving state - offset:', currentOffset.toFixed(2), 'height:', currentHeight.toFixed(2));

    setIsLoadingMore(true);
    isLoadingOldMessages.current = true;

    try {
      const addedCount = await loadMoreMessages(chatId, oldestMessage.id);
      console.log('📥 [LoadMore] Loaded', addedCount, 'new messages');

      if (addedCount === 0) {
        setHasMoreMessages(false);
        isLoadingOldMessages.current = false;
        contentHeightBeforeLoad.current = 0;
        scrollOffsetBeforeLoad.current = 0;
      }
      // Если addedCount > 0, флаги сбросятся в handleContentSizeChange после коррекции
    } catch (error) {
      console.error(`Failed to load more messages for chat ${chatId}:`, error);
      lastOldestMessageId.current = null;
      isLoadingOldMessages.current = false;
      contentHeightBeforeLoad.current = 0;
      scrollOffsetBeforeLoad.current = 0;
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, messages, isLoadingMore, hasMoreMessages, loadMoreMessages]);

  // Сохраняем ссылку на handleLoadMore для использования в handleScroll
  useEffect(() => {
    handleLoadMoreRef.current = handleLoadMore;
  }, [handleLoadMore]);

  // Cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      // Очищаем таймер коррекции скролла при размонтировании
      if (scrollAdjustmentTimer.current) {
        clearTimeout(scrollAdjustmentTimer.current);
      }
      // Сбрасываем флаги при размонтировании
      isRestoringPosition.current = false;
      isLoadingOldMessages.current = false;
    };
  }, []);

  // Обработчик изменения размера контента
  const handleContentSizeChange = useCallback((_width: number, height: number) => {
    // Обновляем текущую высоту контента в начале для точности
    currentContentHeight.current = height;

    // Сохраняем позицию непрочитанных для восстановления
    if (initialScrolled && firstUnreadIndex !== -1 && unreadCount >= 1) {
      AsyncStorage.setItem(
        `chat_scroll_position_${chatId}`,
        JSON.stringify({ unreadIndex: firstUnreadIndex, timestamp: Date.now() })
      ).catch(err => console.warn('Failed to save scroll position:', err));
    }

    // ✅ ПРОФЕССИОНАЛЬНОЕ РЕШЕНИЕ v2: Агрессивная коррекция с множественными попытками
    // Проблема: React Native может рендерить контент в несколько проходов, вызывая микро-рывки
    // Решение: Множественные коррекции в разные моменты жизненного цикла рендера
    // ВАЖНО: Работает только после инициализации (initialScrolled=true), чтобы не мешать первоначальному скроллу
    if (isLoadingOldMessages.current && contentHeightBeforeLoad.current > 0 && initialScrolled) {
      const heightDifference = height - contentHeightBeforeLoad.current;

      // Проверяем что высота действительно увеличилась (загрузились новые сообщения)
      if (heightDifference > 0) {
        console.log('📏 [ContentSize] Height increased by', heightDifference.toFixed(2), 'px');

        // КРИТИЧЕСКИ ВАЖНО: Блокируем handleScroll на всё время коррекции
        isRestoringPosition.current = true;

        const newOffset = scrollOffsetBeforeLoad.current + heightDifference;

        // Очищаем предыдущий таймер если есть
        if (scrollAdjustmentTimer.current) {
          clearTimeout(scrollAdjustmentTimer.current);
        }

        // 🎯 СТРАТЕГИЯ: Тройная коррекция для максимальной плавности
        // 1️⃣ Немедленная синхронная коррекция
        if (listRef.current) {
          listRef.current.scrollToOffset({
            offset: newOffset,
            animated: false,
          });
          lastScrollOffset.current = newOffset;
          console.log('1️⃣ [Immediate] Scroll adjusted to', newOffset.toFixed(2));
        }

        // 2️⃣ Коррекция в следующем animation frame (перед отрисовкой)
        requestAnimationFrame(() => {
          if (listRef.current) {
            listRef.current.scrollToOffset({
              offset: newOffset,
              animated: false,
            });
            lastScrollOffset.current = newOffset;
            console.log('2️⃣ [RAF] Scroll adjusted to', newOffset.toFixed(2));
          }
        });

        // 3️⃣ Финальная коррекция через 16ms (1 frame @ 60fps)
        scrollAdjustmentTimer.current = setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollToOffset({
              offset: newOffset,
              animated: false,
            });
            lastScrollOffset.current = newOffset;
            console.log('3️⃣ [Final] Scroll adjusted to', newOffset.toFixed(2));
          }

          // Разблокируем handleScroll после финальной коррекции
          setTimeout(() => {
            isRestoringPosition.current = false;
            console.log('🔓 [ContentSize] Scroll handlers unlocked');
          }, 50);
        }, 16);

        // Сбрасываем флаги после запуска корректировок
        isLoadingOldMessages.current = false;
        contentHeightBeforeLoad.current = 0;
        scrollOffsetBeforeLoad.current = 0;
      }
    }
  }, [initialScrolled, firstUnreadIndex, unreadCount, chatId]);

  // Отслеживаем новые сообщения от других пользователей
  useEffect(() => {

    // Пропускаем при первой инициализации или если нет сообщений
    if (!initialScrolled || messages.length === 0) {
      previousMessagesLength.current = messages.length;
      previousUnreadCount.current = unreadCount;
      // Сохраняем ID последнего сообщения
      if (messages.length > 0) {
        previousLastMessageId.current = messages[messages.length - 1].id;
      }
      return;
    }

    // Проверяем, появились ли новые сообщения
    const newMessagesAdded = messages.length - previousMessagesLength.current;

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
        previousMessagesLength.current = messages.length;
        previousLastMessageId.current = currentLastId;
        return;
      }

      // Это новые сообщения в конце массива
      const newMessages = messages.slice(previousMessagesLength.current);
      const newFromOthers = newMessages.filter(msg => msg.sender_id !== currentUserId).length;

      if (newFromOthers > 0) {
        // ВАЖНО: Когда приходит новое сообщение от другого пользователя, у него нет read_receipt,
        // поэтому unreadCount будет включать это новое сообщение.
        //
        // Логика: Если до прихода нового сообщения у пользователя не было "старых" непрочитанных,
        // то нужно сделать автоскролл.
        //
        // Пример 1: Был внизу, все прочитано
        //   - previousUnreadCount = 0
        //   - приходит 1 новое → unreadCount = 1
        //   - увеличение = 1, это ОК → автоскролл ✅
        //
        // Пример 2: Был внизу, первое сообщение пришло (еще не отправлен read_receipt)
        //   - previousUnreadCount = 1 (первое новое без read_receipt)
        //   - приходит 1 новое → unreadCount = 2
        //   - увеличение = 1, это ОК → автоскролл ✅
        //
        // Пример 3: Был вверху, есть старые непрочитанные
        //   - previousUnreadCount = 5 (старые непрочитанные)
        //   - приходит 1 новое → unreadCount = 6
        //   - увеличение = 1, НО wasAtBottom = false → НЕТ автоскролла ❌

        const unreadIncrease = unreadCount - previousUnreadCount.current;
        const shouldAutoScroll = wasAtBottomBeforeNewMessage.current && unreadIncrease === newMessagesAdded;

        // Если пользователь был внизу И увеличение непрочитанных = количеству новых - автоматически прокручиваем
        if (shouldAutoScroll) {
          // Небольшая задержка для корректного рендера нового сообщения
          setTimeout(() => {
            if (listRef.current) {
              listRef.current.scrollToOffset({
                offset: 999999,
                animated: true,
              });
            } else {
              console.log(`❌ [AUTO-SCROLL] listRef.current is null`);
            }
          }, 100);
        } else {

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

    // Обновляем previousUnreadCount после обработки
    previousUnreadCount.current = unreadCount;
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


  // Сброс состояния при смене чата
  const resetScroll = useCallback(() => {
    // Очищаем таймер коррекции скролла если он активен
    if (scrollAdjustmentTimer.current) {
      clearTimeout(scrollAdjustmentTimer.current);
      scrollAdjustmentTimer.current = null;
    }

    setHasMoreMessages(true);
    setInitialScrolled(false);
    setHasReachedBottom(false);
    setUserScrolledToBottom(false); // Сбрасываем флаг намеренного скролла
    setNewMessagesCount(0); // Сбрасываем счетчик новых сообщений
    setFirstNewMessageIndex(-1); // Сбрасываем индекс первого нового сообщения
    canTrackUserScroll.current = false; // Запрещаем отслеживание до следующей инициализации
    hasScrolledAwayFromBottom.current = false; // Сбрасываем флаг ухода от низа
    wasAtBottomBeforeNewMessage.current = true; // По умолчанию считаем что пользователь внизу
    previousUnreadCount.current = 0; // Сбрасываем счетчик предыдущих непрочитанных
    lastOldestMessageId.current = null;
    lastVisibleMessageIndex.current = -1;
    previousMessagesLength.current = 0; // Сбрасываем счетчик предыдущих сообщений
    previousLastMessageId.current = null; // Сбрасываем сохраненный ID последнего сообщения
    hasCalculatedInitialIndex.current = false; // ✅ Сбрасываем флаг вычисления индекса
    setIsScrollingToUnread(false);
    setShowScrollToBottom(false);
    setShowDateHeader(false);
    setScrollSessionKey(prev => prev + 1); // Увеличиваем ключ для форсирования ремонтирования FlashList
    lastScrollOffset.current = 0;
    isRestoringPosition.current = false; // ✅ Сбрасываем флаг процесса восстановления
    isLoadingOldMessages.current = false; // ✅ Сбрасываем флаг загрузки старых сообщений
    contentHeightBeforeLoad.current = 0; // ✅ Сбрасываем сохраненную высоту контента
    scrollOffsetBeforeLoad.current = 0; // ✅ Сбрасываем сохраненную позицию скролла
    currentContentHeight.current = 0; // ✅ Сбрасываем текущую высоту контента
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
    isRestoringPosition, // Возвращаем ref для блокировки onScrollToIndexFailed
    handleScroll,
    handleLoadMore,
    handleContentSizeChange,
    handleScrollToBottom,
    handleReplyPress,
    handleKeyboardWillShow,
    handleKeyboardWillHide,
    handleKeyboardAnimating,
    onViewableItemsChanged,
    viewabilityConfig,
    resetScroll,
  };
};
