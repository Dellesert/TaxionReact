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
  const isInJumpContext = useRef(false); // Флаг что мы в контексте после jumpToMessage
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
  const currentContentHeight = useRef<number>(0); // Текущая высота контента (обновляется при каждом вызове handleContentSizeChange)
  const isLoadingOldMessages = useRef<boolean>(false); // Флаг загрузки старых сообщений
  const contentHeightBeforeLoad = useRef<number>(0); // Высота контента перед загрузкой старых сообщений
  const scrollOffsetBeforeLoad = useRef<number>(0); // Позиция скролла перед загрузкой
  const isLoadingNewerMessages = useRef<boolean>(false); // Флаг загрузки более новых сообщений (при скролле вниз в jump context)
  const lastNewestMessageId = useRef<number | null>(null); // ID последнего загруженного сообщения при incremental load
  const isAnimatingToPin = useRef<boolean>(false); // Флаг анимации к закрепленному сообщению

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

      // Даем время на автоматический скролл к непрочитанным, после чего разрешаем отслеживание
      setTimeout(() => {
        canTrackUserScroll.current = true;
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
      }, 10);
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
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    // Сохраняем текущую позицию скролла
    lastScrollOffset.current = contentOffset.y;

    // 🔍 ДИАГНОСТИКА iOS: Логируем каждый 20-й скролл чтобы не спамить
    if (Platform.OS === 'ios') {
      scrollLogCounter.current++;
      if (scrollLogCounter.current === 1) {
      }
      if (initialScrolled && scrollLogCounter.current % 20 === 0) {
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
    }

    // Если пользователь близко к верху и есть еще сообщения - загружаем
    // ВАЖНО: Убрали проверку initialScrolled, так как на iOS первое событие скролла происходит ДО установки этого флага
    if (isNearTop && !isLoadingMore && hasMoreMessages && messages.length > 0) {
      // Для инвертированного списка: messages[0] = самое СТАРОЕ сообщение
      const oldestMessage = messages[0];

      if (oldestMessage && lastOldestMessageId.current !== oldestMessage.id) {

        // Запускаем загрузку немедленно (без задержки)
        handleLoadMoreRef.current?.();
      }
    }

    // Проверяем достигли ли низа списка
    const isAtBottom = distanceFromBottom <= 500;

    if (isAtBottom) {
      // Если мы в контексте после jump и достигли низа загруженных сообщений - загружаем следующую партию
      // НО НЕ ЗАГРУЖАЕМ если идет анимация к закрепленному сообщению
      if (isInJumpContext.current && !isLoadingMore && !isLoadingNewerMessages.current && !isAnimatingToPin.current && messages.length > 0) {
        const newestMessage = messages[messages.length - 1];

        // Проверяем что мы еще не загружали от этого сообщения
        if (newestMessage && lastNewestMessageId.current !== newestMessage.id) {
          console.log('📍 Reached bottom in jump context, loading next batch after message:', newestMessage.id);
          lastNewestMessageId.current = newestMessage.id;
          isLoadingNewerMessages.current = true;

          // Сбрасываем счетчик "новых" сообщений т.к. мы в jump context
          setNewMessagesCount(0);
          setFirstNewMessageIndex(-1);

          const loadMoreMessagesAfter = useChatStore.getState().loadMoreMessagesAfter;
          loadMoreMessagesAfter(chatId, newestMessage.id).then((hasMore) => {
            isLoadingNewerMessages.current = false;

            // Если больше нет сообщений - значит достигли самого последнего, выходим из jump context
            if (!hasMore) {
              console.log('📍 No more messages after, exiting jump context');
              isInJumpContext.current = false;
              lastNewestMessageId.current = null;
            }
          }).catch(() => {
            isLoadingNewerMessages.current = false;
            lastNewestMessageId.current = null;
          });
        }
      }

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

    // Сохраняем позицию перед загрузкой
    const currentOffset = lastScrollOffset.current;
    const currentHeight = currentContentHeight.current;

    scrollOffsetBeforeLoad.current = currentOffset;
    contentHeightBeforeLoad.current = currentHeight;

    setIsLoadingMore(true);
    isLoadingOldMessages.current = true;

    try {
      const addedCount = await loadMoreMessages(chatId, oldestMessage.id);

      if (addedCount === 0) {
        setHasMoreMessages(false);
        isLoadingOldMessages.current = false;
        contentHeightBeforeLoad.current = 0;
        scrollOffsetBeforeLoad.current = 0;
      }
    } catch (error) {
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

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      isLoadingOldMessages.current = false;
      contentHeightBeforeLoad.current = 0;
      scrollOffsetBeforeLoad.current = 0;
    };
  }, []);

  // Обработчик изменения размера контента
  const handleContentSizeChange = useCallback((_width: number, height: number) => {
    // Обновляем текущую высоту контента
    currentContentHeight.current = height;

    // Сохраняем позицию непрочитанных для восстановления
    if (initialScrolled && firstUnreadIndex !== -1 && unreadCount >= 1) {
      AsyncStorage.setItem(
        `chat_scroll_position_${chatId}`,
        JSON.stringify({ unreadIndex: firstUnreadIndex, timestamp: Date.now() })
      ).catch(err => console.warn('Failed to save scroll position:', err));
    }

    // ✅ ВРЕМЕННО ОТКЛЮЧЕНА коррекция скролла для теста
    // Проверяем, можно ли обойтись без неё, полагаясь на точный estimatedItemSize
    if (isLoadingOldMessages.current) {
      isLoadingOldMessages.current = false;
      contentHeightBeforeLoad.current = 0;
      scrollOffsetBeforeLoad.current = 0;
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

    // ВАЖНО: Пропускаем эту логику если мы в jump context
    // В этом случае добавление сообщений в конец - это инкрементальная загрузка, а не новые сообщения
    if (isInJumpContext.current) {
      previousMessagesLength.current = messages.length;
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
  const handleScrollToBottom = useCallback(async () => {
    console.log('📍 handleScrollToBottom called, isInJumpContext:', isInJumpContext.current, 'newMessagesCount:', newMessagesCount);
    const loadMessages = useChatStore.getState().loadMessages;

    // ПРИОРИТЕТ 1: Если мы в контексте после jump - перезагружаем последние сообщения
    const wasInJumpContext = isInJumpContext.current;
    if (wasInJumpContext) {
      console.log('📍 In jump context, animating scroll...');

      // Сбрасываем флаги сразу
      isInJumpContext.current = false;
      lastNewestMessageId.current = null;

      // Сначала делаем псевдо-анимацию скролла на текущем контенте
      const currentHeight = currentContentHeight.current;
      const currentOffset = lastScrollOffset.current;

      // Шаг 1: Скроллим на 30% вниз от текущей позиции
      listRef.current?.scrollToOffset({
        offset: currentOffset + (currentHeight - currentOffset) * 0.3,
        animated: true,
      });

      // Шаг 2: Скроллим на 60% (через 120ms)
      setTimeout(() => {
        listRef.current?.scrollToOffset({
          offset: currentOffset + (currentHeight - currentOffset) * 0.6,
          animated: true,
        });

        // Шаг 3: Скроллим на 90% (через еще 120ms)
        setTimeout(() => {
          listRef.current?.scrollToOffset({
            offset: currentOffset + (currentHeight - currentOffset) * 0.9,
            animated: true,
          });

          // Шаг 4: Загружаем последние сообщения и скроллим в самый низ (через еще 120ms)
          setTimeout(async () => {
            await loadMessages(chatId);

            // После загрузки скроллим в самый низ
            setTimeout(() => {
              listRef.current?.scrollToOffset({
                offset: 999999,
                animated: true,
              });
              setHasReachedBottom(true);
              setUserScrolledToBottom(true);
              setNewMessagesCount(0);
              setFirstNewMessageIndex(-1);
              setShowScrollToBottom(false);
            }, 100);
          }, 120);
        }, 120);
      }, 120);
      return;
    }

    // ПРИОРИТЕТ 2: Проверяем, есть ли новые непрочитанные сообщения
    if (newMessagesCount > 0 && firstNewMessageIndex !== -1) {
      console.log('📍 Scrolling to first new message at index:', firstNewMessageIndex);
      // Если есть новые непрочитанные - скроллим к первому новому
      listRef.current?.scrollToIndex({
        index: firstNewMessageIndex,
        animated: true,
        viewPosition: 0.5, // Показываем в центре экрана
      });
      // Не обнуляем счетчик сразу - дадим пользователю прочитать
      // Счетчик обнулится когда пользователь доскроллит до низа
    } else {
      // Просто скроллим в самый низ
      console.log('📍 Scrolling to bottom (normal)');
      listRef.current?.scrollToOffset({
        offset: 999999,
        animated: true,
      });
      setHasReachedBottom(true);
      setUserScrolledToBottom(true);
      setNewMessagesCount(0);
      setFirstNewMessageIndex(-1);
      setShowScrollToBottom(false);
    }
  }, [messages.length, newMessagesCount, firstNewMessageIndex, chatId]);

  // Скролл к конкретному сообщению
  const handleReplyPress = useCallback(async (messageId: number, setHighlightedMessageId: (id: number | null) => void) => {
    console.log('⚪ useChatScroll.handleReplyPress CALLED with messageId:', messageId);
    console.log('⚪ Current messages array length:', messages.length);

    const messageIndex = messages.findIndex(m => m.id === messageId);
    console.log('⚪ Found messageIndex:', messageIndex);

    if (messageIndex !== -1) {
      // ✅ ФИНАЛЬНАЯ СТРАТЕГИЯ: Как в Telegram - мгновенный прыжок + короткая доводка

      const currentVisibleIndex = lastVisibleMessageIndex.current;
      const distance = Math.abs(messageIndex - currentVisibleIndex);

      console.log(`📍 Scrolling to pinned message: distance=${distance} items`);

      // Для близких элементов (< 10) - обычная анимация работает отлично
      if (distance < 10) {
        listRef.current?.scrollToIndex({
          index: messageIndex,
          animated: true,
          viewPosition: 0.5,
        });

        setHighlightedMessageId(messageId);
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 2000);
        return;
      }

      // ✅ ДЛЯ ДАЛЬНИХ ЭЛЕМЕНТОВ: Плавная анимация как в Telegram
      // Просто используем scrollToIndex с анимацией - FlashList сам сделает плавный переход

      console.log(`📍 Smooth scroll to pinned message: distance=${distance} items`);

      // Один плавный скролл с анимацией
      listRef.current?.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5,
      });

      // Подсвечиваем сообщение после скролла
      setTimeout(() => {
        setHighlightedMessageId(messageId);
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, 2000);
      }, 500); // Ждём завершения анимации скролла

    } else {
      // ✅ НОВАЯ СТРАТЕГИЯ: Непрерывная анимация с подменой контента
      // 1. Начинаем скролл вверх на текущих сообщениях
      // 2. Параллельно загружаем новый контекст
      // 3. Незаметно подменяем сообщения во время скролла
      // 4. Продолжаем скролл уже к закрепленному в новом контексте

      console.log('📍 Starting seamless scroll to pinned message...');

      const performSeamlessScroll = async () => {
        try {
          const currentVisibleIndex = lastVisibleMessageIndex.current;
          const currentMessages = messages;

          isAnimatingToPin.current = true;

          // ШАГ 1: Сначала загружаем контекст
          console.log('📍 Phase 1: Loading context first...');

          const jumpToMessage = useChatStore.getState().jumpToMessage;
          await jumpToMessage(chatId, messageId);

          console.log('📍 Phase 2: Context loaded');

          // Устанавливаем флаги jump контекста
          isInJumpContext.current = true;
          setShowScrollToBottom(true);
          setHasReachedBottom(false);
          setNewMessagesCount(0);
          setFirstNewMessageIndex(-1);

          // Даём время FlashList обновиться
          await new Promise(resolve => setTimeout(resolve, 150));

          const updatedMessages = useChatStore.getState().messages[chatId] || [];
          const targetIndex = updatedMessages.findIndex(m => m.id === messageId);

          console.log('📍 Phase 3: Ready to scroll, total:', updatedMessages.length, 'target:', targetIndex);

          previousMessagesLength.current = updatedMessages.length;

          if (targetIndex !== -1) {
            // Проверяем направление списка
            const isInverted = updatedMessages.length >= 2 &&
              new Date(updatedMessages[0].created_at) > new Date(updatedMessages[updatedMessages.length - 1].created_at);

            console.log('  List inverted:', isInverted);

            // ШАГ 2: Определяем точки для плавного скролла снизу вверх
            const WINDOW_SIZE = 22;
            let scrollStart: number; // Стартовая точка (внизу, более новые сообщения)
            let midPoint: number;    // Промежуточная точка

            if (isInverted) {
              // Inverted: 0=новое (внизу), большой индекс=старое (вверху)
              // target имеет большой индекс (старое сообщение вверху)
              scrollStart = Math.max(0, targetIndex - WINDOW_SIZE); // Ещё ниже
              midPoint = Math.max(0, targetIndex - Math.floor(WINDOW_SIZE * 0.55)); // Промежуточная
            } else {
              // Normal: 0=старое (вверху), большой индекс=новое (внизу)
              // target имеет малый индекс (старое сообщение вверху)
              scrollStart = Math.min(updatedMessages.length - 1, targetIndex + WINDOW_SIZE); // Более новые (внизу)
              midPoint = Math.min(updatedMessages.length - 1, targetIndex + Math.floor(WINDOW_SIZE * 0.55)); // Промежуточная
            }

            console.log('📍 Phase 4: Scroll path:');
            console.log('  Start (bottom):', scrollStart);
            console.log('  Mid point:', midPoint);
            console.log('  Target (top):', targetIndex);

            // ШАГ 2.1: Мгновенно прыгаем к стартовой точке внизу (БЕЗ анимации)
            listRef.current?.scrollToIndex({
              index: scrollStart,
              animated: false, // БЕЗ анимации - незаметный прыжок
              viewPosition: 0.5,
            });

            console.log('📍 Phase 4.1: Jumped to start (bottom)');

            // ШАГ 2.2: Небольшая пауза для рендера
            setTimeout(() => {
              // Первый скролл: снизу к промежуточной точке
              console.log('📍 Phase 4.2: First scroll up to midpoint');

              listRef.current?.scrollToIndex({
                index: midPoint,
                animated: true,
                viewPosition: 0.5,
              });

              // ШАГ 3: Продолжаем к цели
              setTimeout(() => {
                console.log('📍 Phase 5: Continuing to target');

                listRef.current?.scrollToIndex({
                  index: targetIndex,
                  animated: true, // Продолжение плавного движения вверх
                  viewPosition: 0.5,
                });

                // Снимаем флаг анимации
                setTimeout(() => {
                  isAnimatingToPin.current = false;
                }, 800);

                // Подсветка
                setTimeout(() => {
                  setHighlightedMessageId(messageId);
                  setTimeout(() => {
                    setHighlightedMessageId(null);
                  }, 2000);
                }, 600);
              }, 350); // Задержка между первым и вторым скроллом
            }, 50); // Пауза после прыжка
          } else {
            console.error('📍 ERROR: Target not found');
            isAnimatingToPin.current = false;
          }
        } catch (error) {
          console.error('📍 ERROR:', error);
          isAnimatingToPin.current = false;
        }
      };

      performSeamlessScroll();
    }
  }, [messages, chatId]);

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
    setHasMoreMessages(true);
    setInitialScrolled(false);
    setHasReachedBottom(false);
    setUserScrolledToBottom(false); // Сбрасываем флаг намеренного скролла
    setNewMessagesCount(0); // Сбрасываем счетчик новых сообщений
    setFirstNewMessageIndex(-1); // Сбрасываем индекс первого нового сообщения
    canTrackUserScroll.current = false; // Запрещаем отслеживание до следующей инициализации
    isInJumpContext.current = false; // Сбрасываем флаг контекста
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
    currentContentHeight.current = 0; // ✅ Сбрасываем текущую высоту контента
    isLoadingOldMessages.current = false;
    contentHeightBeforeLoad.current = 0;
    scrollOffsetBeforeLoad.current = 0;
    isLoadingNewerMessages.current = false; // ✅ Сбрасываем флаг загрузки новых сообщений
    lastNewestMessageId.current = null; // ✅ Сбрасываем ID последнего загруженного сообщения
    isAnimatingToPin.current = false; // ✅ Сбрасываем флаг анимации
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
    handleKeyboardWillShow,
    handleKeyboardWillHide,
    handleKeyboardAnimating,
    onViewableItemsChanged,
    viewabilityConfig,
    resetScroll,
  };
};
