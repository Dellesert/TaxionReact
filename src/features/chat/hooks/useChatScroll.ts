import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  const wasAtBottomBeforeNewMessage = useRef<boolean>(true); // Был ли пользователь внизу перед новым сообщением
  const previousUnreadCount = useRef<number>(0); // Количество непрочитанных до прихода новых сообщений
  const hasCalculatedInitialIndex = useRef<boolean>(false); // Флаг, что индекс уже вычислен
  const [isScrollingToUnread, setIsScrollingToUnread] = useState(false);
  const [scrollSessionKey, setScrollSessionKey] = useState(0);
  const lastScrollOffset = useRef<number>(0);
  const savedScrollOffset = useRef<number | null>(null);
  const hasRestoredScroll = useRef<boolean>(false); // Флаг что позиция уже восстановлена
  const [hasSavedPosition, setHasSavedPosition] = useState(false); // State для триггера useMemo
  const [isLoadingPosition, setIsLoadingPosition] = useState(true); // Флаг загрузки позиции из AsyncStorage
  const isRestoringPosition = useRef<boolean>(false); // Флаг процесса восстановления
  const [isScrollReady, setIsScrollReady] = useState(false); // ⚡ Флаг готовности скролла для показа UI

  // ✅ СИНХРОННАЯ загрузка сохраненной позиции ДО первого рендера
  // Используем useMemo для загрузки при изменении chatId
  useMemo(() => {
    // Загружаем из AsyncStorage
    AsyncStorage.getItem(`chat_scroll_offset_${chatId}`)
      .then(savedPosition => {
        if (savedPosition) {
          const offset = parseFloat(savedPosition);
          savedScrollOffset.current = offset;
          setHasSavedPosition(true); // Триггерим перевычисление initialScrollIndex
        } else {
          savedScrollOffset.current = null;
          setHasSavedPosition(false);
        }
        setIsLoadingPosition(false); // Загрузка завершена
      })
      .catch(error => {
        console.warn('Failed to load scroll position:', error);
        savedScrollOffset.current = null;
        setHasSavedPosition(false);
        setIsLoadingPosition(false); // Загрузка завершена (с ошибкой)
      });
  }, [chatId]); // Загружаем заново при изменении chatId

  // ✅ Вычисляем initialScrollIndex В USEMEMO, до первого рендера!
  const initialScrollIndex = useMemo(() => {
    // ⚠️ КРИТИЧЕСКИ ВАЖНО: Вычисляем ТОЛЬКО ОДИН РАЗ при первом рендере!
    // Если уже вычисляли - возвращаем undefined (блокируем повторное вычисление)
    if (hasCalculatedInitialIndex.current) {
      return undefined;
    }

    // ⚠️ КРИТИЧЕСКИ ВАЖНО: ЖДЕМ пока AsyncStorage загрузит позицию!
    // Если еще загружается - возвращаем undefined и ждем следующего вызова
    if (isLoadingPosition) {
      return undefined;
    }

    // Если нет сообщений - возвращаем undefined
    if (messages.length === 0) {
      return undefined;
    }

    // Помечаем что индекс вычислен (ПЕРЕД любыми return!)
    hasCalculatedInitialIndex.current = true;

    // ПРИОРИТЕТ 1: Если есть сохраненная позиция скролла - НЕ устанавливаем initialScrollIndex!
    // ❌ НЕ ИСПОЛЬЗУЕМ initialScrollIndex - он вызовет видимый скролл!
    // Позиция будет восстановлена через scrollToOffset в useEffect
    if (hasSavedPosition && savedScrollOffset.current !== null) {
      setHasReachedBottom(false);
      // ⚠️ КРИТИЧЕСКИ ВАЖНО: возвращаем undefined, чтобы FlatList не скроллил автоматически
      return undefined;
    }

    // ПРИОРИТЕТ 2: Если есть непрочитанные - скроллим к первому непрочитанному
    if (firstUnreadIndex !== -1 && unreadCount >= 1) {
      setHasReachedBottom(false);
      return firstUnreadIndex;
    }

    // ПРИОРИТЕТ 3: Скроллим к последнему сообщению (вниз)
    setHasReachedBottom(true);
    return messages.length - 1;
  }, [messages.length, firstUnreadIndex, unreadCount, hasSavedPosition, isLoadingPosition, chatId]); // Добавили isLoadingPosition!

  // Оптимизация: функции в Zustand стабильны и не меняются
  const loadMoreMessages = useChatStore((state) => state.loadMoreMessages);

  // ⚡ ОПТИМИЗАЦИЯ: Устанавливаем isScrollReady как можно раньше
  useEffect(() => {
    // Как только загрузка позиции завершена - можем показывать UI
    // Для пустых чатов (без сообщений) сразу показываем UI
    if (!isLoadingPosition && !isScrollReady) {
      // ⚡ Устанавливаем готовность МГНОВЕННО для быстрого показа UI
      setIsScrollReady(true);
    }
  }, [isLoadingPosition, isScrollReady]);

  // Устанавливаем initialScrolled после появления сообщений
  useEffect(() => {
    if (messages.length > 0 && !initialScrolled) {
      // Инициализируем счетчик предыдущих сообщений
      previousMessagesLength.current = messages.length;

      // Если есть сохраненная позиция - восстанавливаем её
      if (hasSavedPosition && savedScrollOffset.current !== null && !hasRestoredScroll.current) {
        // ⚠️ БЛОКИРУЕМ handleScroll и onScrollToIndexFailed во время восстановления!
        isRestoringPosition.current = true;

        // ⚠️ КРИТИЧЕСКИ ВАЖНО: Если восстанавливаем позицию - значит пользователь НЕ был внизу!
        // Это предотвратит автоскролл вниз при получении новых сообщений
        wasAtBottomBeforeNewMessage.current = false;
        setHasReachedBottom(false);

        // ⚡ Используем requestAnimationFrame для МГНОВЕННОГО восстановления позиции
        requestAnimationFrame(() => {
          if (listRef.current) {
            listRef.current.scrollToOffset({
              offset: savedScrollOffset.current!,
              animated: false, // Без анимации для мгновенного восстановления
            });

            // Помечаем что позиция восстановлена
            hasRestoredScroll.current = true;

            // Устанавливаем initialScrolled сразу же
            setInitialScrolled(true);

            // ⚠️ ВАЖНО: Разблокируем handleScroll только после стабилизации
            setTimeout(() => {
              isRestoringPosition.current = false; // Разблокируем handleScroll
              canTrackUserScroll.current = true;
            }, 300); // ⚡ УМЕНЬШИЛИ время для быстрой готовности
          }
        });
      } else {
        // Нет сохраненной позиции - обычная инициализация
        // ⚡ УБРАЛИ задержку для мгновенного показа
        setInitialScrolled(true);

        // Даем время на автоматический скролл к непрочитанным, после чего разрешаем отслеживание
        setTimeout(() => {
          canTrackUserScroll.current = true;
        }, 300); // ⚡ УМЕНЬШИЛИ время
      }
    }
  }, [messages.length, initialScrolled, hasSavedPosition]);

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
  const handleKeyboardAnimating = useCallback((currentHeight: number, targetHeight: number) => {
    // Не делаем ничего
  }, []);

  // Handle keyboard hide - for inverted list
  const handleKeyboardWillHide = useCallback(() => {
    // При скрытии клавиатуры также ничего не делаем
    // Паддинг уменьшится и сообщения вернутся на место
  }, []);

  // Обработчик скролла
  const handleScroll = useCallback((event: any) => {
    // ⚠️ КРИТИЧЕСКИ ВАЖНО: Игнорируем события скролла во время восстановления позиции!
    if (isRestoringPosition.current) {
      return;
    }

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

  // Сохраняем позицию скролла при выходе из чата
  useEffect(() => {
    return () => {
      // Сохраняем позицию ТОЛЬКО если пользователь НЕ внизу
      // Если пользователь внизу - удаляем сохраненную позицию (чтобы в следующий раз открылся снизу)
      if (hasReachedBottom) {
        AsyncStorage.removeItem(`chat_scroll_offset_${chatId}`)
          .catch(err => console.warn('Failed to remove scroll offset:', err));
      } else if (lastScrollOffset.current > 0) {
        AsyncStorage.setItem(
          `chat_scroll_offset_${chatId}`,
          lastScrollOffset.current.toString()
        ).catch(err => console.warn('Failed to save scroll offset:', err));
      }
    };
  }, [chatId, hasReachedBottom]);

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
    // Сбрасываем флаги восстановления позиции (они будут заново загружены для нового чата)
    savedScrollOffset.current = null;
    lastScrollOffset.current = 0;
    hasRestoredScroll.current = false; // ✅ Сбрасываем флаг восстановления
    setHasSavedPosition(false); // ✅ Сбрасываем флаг наличия сохраненной позиции
    setIsLoadingPosition(true); // ✅ Сбрасываем флаг загрузки (будет загружена заново для нового чата)
    isRestoringPosition.current = false; // ✅ Сбрасываем флаг процесса восстановления
    setIsScrollReady(false); // ⚡ Сбрасываем флаг готовности скролла
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
    isScrollReady, // ⚡ Возвращаем флаг готовности скролла
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
