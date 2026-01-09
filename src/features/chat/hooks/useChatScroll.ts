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
export const useChatScroll = (chatId: number, messages: any[], firstUnreadIndex: number, unreadCount: number, currentUserId?: number, messagesKey?: string) => {
  const listRef = useRef<FlatList<any>>(null);
  const [initialScrolled, setInitialScrolled] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [currentDateLabel, setCurrentDateLabel] = useState<string | null>(null);
  const [showDateHeader, setShowDateHeader] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [userScrolledToBottom, setUserScrolledToBottom] = useState(false); // Флаг намеренного скролла
  const isKeyboardAnimating = useRef(false); // Флаг анимации клавиатуры - игнорируем scroll events
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
  const isNearBottom = useRef<boolean>(true); // Пользователь находится близко к низу (в пределах ~5 сообщений)
  const hasCalculatedInitialIndex = useRef<boolean>(false); // Флаг, что индекс уже вычислен
  const [scrollSessionKey, setScrollSessionKey] = useState(0);
  const lastScrollOffset = useRef<number>(0);
  const currentContentHeight = useRef<number>(0); // Текущая высота контента (обновляется при каждом вызове handleContentSizeChange)
  const isLoadingOldMessages = useRef<boolean>(false); // Флаг загрузки старых сообщений
  const contentHeightBeforeLoad = useRef<number>(0); // Высота контента перед загрузкой старых сообщений
  const scrollOffsetBeforeLoad = useRef<number>(0); // Позиция скролла перед загрузкой
  const isLoadingNewerMessages = useRef<boolean>(false); // Флаг загрузки более новых сообщений (при скролле вниз в jump context)
  const lastNewestMessageId = useRef<number | null>(null); // ID последнего загруженного сообщения при incremental load
  const isAnimatingToPin = useRef<boolean>(false); // Флаг анимации к закрепленному сообщению
  const isScrollingToUnread = useRef<boolean>(false); // Флаг скролла к непрочитанным (по кнопке)
  const isInitialScrollComplete = useRef<boolean>(false); // Флаг что FlashList завершил начальный скролл
  const [isPositionReady, setIsPositionReady] = useState<boolean>(false); // Флаг что позиция скролла готова для показа списка
  const isJumpInProgress = useRef<boolean>(false); // Флаг что идёт jump к сообщению (замена массива)

  // ✅ Refs для двухфазной анимации скролла из jump context
  const isScrollToBottomAnimating = useRef<boolean>(false); // Флаг активной анимации скролла к низу
  const scrollToBottomStartTime = useRef<number>(0); // Время начала анимации
  const scrollAnimationPhase = useRef<'waiting' | 'animating' | 'done'>('done'); // Фаза анимации
  const scrollCooldownUntil = useRef<number>(0); // Время до которого игнорируем изменения messagesKey
  const scrollTargetIndex = useRef<number | null>(null); // Целевой индекс для скролла (null = scrollToEnd)
  const isExitingJumpContext = useRef<boolean>(false); // Флаг выхода из jump context - не скрывать плашку
  const SCROLL_STABILIZATION_DELAY = 200; // ms ждём стабилизации messagesKey
  const SCROLL_ANIMATION_MAX_DURATION = 2000; // максимум 2 секунды на всё
  const SCROLL_COOLDOWN_DURATION = 1500; // ms период охлаждения после завершения анимации (увеличено для надёжности)
  const JUMP_CONTEXT_EXIT_PROTECTION_DURATION = 2000; // ms защита плашки после выхода из jump context

  // ✅ Вычисляем initialScrollIndex В USEMEMO, до первого рендера!
  const initialScrollIndex = useMemo(() => {
    // Если нет сообщений - возвращаем undefined (не помечаем как вычисленное!)
    if (messages.length === 0) {
      return undefined;
    }

    // ⚠️ КРИТИЧЕСКИ ВАЖНО: Вычисляем ТОЛЬКО ОДИН РАЗ когда сообщения загружены!
    // Если уже вычисляли - возвращаем undefined (блокируем повторное вычисление)
    if (hasCalculatedInitialIndex.current) {
      return undefined;
    }

    // Помечаем что индекс вычислен (ТОЛЬКО когда есть сообщения!)
    hasCalculatedInitialIndex.current = true;

    // ПРИОРИТЕТ 1: Если есть непрочитанные И их >= 5 - скроллим к первому непрочитанному
    // Если < 5 непрочитанных - открываем чат внизу (последние сообщения)
    if (firstUnreadIndex !== -1 && unreadCount >= 5) {
      setHasReachedBottom(false);

      // ✅ ОПТИМИЗАЦИЯ: Если много непрочитанных (>10), включаем jump context режим
      // Это позволит пользователю подгружать новые сообщения постепенно при скролле вниз
      if (unreadCount > 10) {
        isInJumpContext.current = true;
        setShowScrollToBottom(true);
      }

      return firstUnreadIndex;
    }

    // ПРИОРИТЕТ 2: Скроллим к последнему сообщению (вниз)
    // Для inverted FlashList: не передаём initialScrollIndex, чтобы показать начало
    // Начало inverted списка = визуально низ экрана (новые сообщения)
    // После рендера дополнительно вызовем scrollToEnd для гарантии
    setHasReachedBottom(true);
    return undefined; // undefined = FlashList начинает с начала = низ для inverted
  }, [messages.length, firstUnreadIndex, unreadCount]);

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

  // ✅ Позиционирование скролла теперь происходит в handleFlashListLoad,
  // когда listRef гарантированно готов

  // Ref для handleLoadMore чтобы избежать циклической зависимости
  const handleLoadMoreRef = useRef<(() => Promise<void>) | null>(null);

  // Ref для хранения актуальных значений для handleFlashListLoad
  const scrollPositionDataRef = useRef({
    isPositionReady: false,
    messagesLength: 0,
    firstUnreadIndex: -1,
    unreadCount: 0,
  });

  // Обновляем ref при изменении значений
  scrollPositionDataRef.current = {
    isPositionReady,
    messagesLength: messages.length,
    firstUnreadIndex,
    unreadCount,
  };

  // Callback когда FlashList завершает загрузку и начальное позиционирование
  // ВСЯ логика позиционирования теперь здесь, потому что listRef гарантированно готов
  // Используем ref чтобы иметь актуальные значения без пересоздания callback
  const handleFlashListLoad = useCallback(() => {
    // onLoad может вызываться слишком рано, поэтому используем задержку
    setTimeout(() => {
      isInitialScrollComplete.current = true;

      // Перечитываем актуальные данные после timeout
      const currentData = scrollPositionDataRef.current;

      // Пропускаем если позиция уже готова
      if (currentData.isPositionReady) {
        return;
      }

      if (currentData.messagesLength === 0) {
        setIsPositionReady(true);
        return;
      }

      // СЛУЧАЙ 1: >= 5 непрочитанных - центрируем плашку
      if (currentData.firstUnreadIndex !== -1 && currentData.unreadCount >= 5) {
        if (listRef.current) {
          // Для inverted списка: viewPosition: 0.5 = центр
          // viewOffset отрицательный сдвигает вверх к баннеру
          listRef.current.scrollToIndex({
            index: currentData.firstUnreadIndex,
            animated: false,
            viewPosition: 0.5,
            viewOffset: -30,
          });
        }
        setIsPositionReady(true);
        return;
      }

      // СЛУЧАЙ 2: < 5 непрочитанных - скроллим к низу (последние сообщения)
      // Используем scrollToEnd - он используется в handleScrollToBottom и работает для показа низа
      if (listRef.current) {
        listRef.current.scrollToEnd({ animated: false });
      }
      setIsPositionReady(true);
    }, 100);
  }, []); // Пустые зависимости - используем ref для актуальных данных

  // Дополнительно: устанавливаем isInitialScrollComplete когда initialScrolled становится true
  // Это страховка на случай если onLoad не вызвался
  useEffect(() => {
    if (initialScrolled && !isInitialScrollComplete.current) {
      setTimeout(() => {
        isInitialScrollComplete.current = true;
      }, 200);
    }
  }, [initialScrolled]);

  // ✅ useEffect для отслеживания стабилизации messagesKey и запуска плавной анимации
  // Этот эффект срабатывает каждый раз когда messagesKey меняется
  // Если мы в режиме анимации скролла к низу - ждём стабилизации перед анимацией
  useEffect(() => {
    const now = Date.now();

    // Хелпер для скролла к целевой позиции
    const scrollToTarget = (animated: boolean) => {
      if (scrollTargetIndex.current !== null) {
        // Скроллим к конкретному индексу (непрочитанные сообщения)
        listRef.current?.scrollToIndex({
          index: scrollTargetIndex.current,
          animated,
          viewPosition: 0.5,
          viewOffset: -30,
        });
      } else {
        // Скроллим в самый низ
        listRef.current?.scrollToEnd({ animated });
      }
    };

    // Период охлаждения - после завершения анимации игнорируем изменения некоторое время
    // Но при этом принудительно возвращаем к целевой позиции если она сбилась
    if (scrollCooldownUntil.current > now) {
      console.log('[ScrollToBottom] Cooldown active, forcing scroll to target');
      scrollToTarget(false);
      return;
    }

    // Пропускаем если не в режиме анимации или анимация уже завершена
    if (!isScrollToBottomAnimating.current) return;
    if (scrollAnimationPhase.current === 'done') return;

    const elapsed = now - scrollToBottomStartTime.current;
    console.log('[ScrollToBottom] messagesKey changed, phase:', scrollAnimationPhase.current, 'elapsed:', elapsed, 'targetIndex:', scrollTargetIndex.current);

    // Таймаут - форсируем финальный скролл без анимации
    if (elapsed > SCROLL_ANIMATION_MAX_DURATION) {
      console.log('[ScrollToBottom] Timeout reached, forcing final scroll');
      const wasScrollingToUnread = scrollTargetIndex.current !== null;
      scrollToTarget(false);
      isScrollToBottomAnimating.current = false;
      scrollAnimationPhase.current = 'done';
      // Сбрасываем состояния только если скроллили в низ (не к непрочитанным)
      if (!wasScrollingToUnread) {
        // Устанавливаем период охлаждения ТОЛЬКО для скролла к низу
        scrollCooldownUntil.current = now + SCROLL_COOLDOWN_DURATION;
        setHasReachedBottom(true);
        setUserScrolledToBottom(true);
        setNewMessagesCount(0);
        setFirstNewMessageIndex(-1);
        setShowScrollToBottom(false);
      } else {
        // Для скролла к непрочитанным - не устанавливаем cooldown
        // Устанавливаем флаг чтобы handleScroll не скрывал плашку
        isScrollingToUnread.current = true;
        setTimeout(() => {
          isScrollingToUnread.current = false;
        }, 1000);
      }
      scrollTargetIndex.current = null;
      return;
    }

    // Ждём стабилизации messagesKey перед запуском анимации
    const stabilizationTimer = setTimeout(() => {
      if (!isScrollToBottomAnimating.current) return;

      if (scrollAnimationPhase.current === 'waiting') {
        console.log('[ScrollToBottom] Stabilized! Starting animated scroll, targetIndex:', scrollTargetIndex.current);
        // messagesKey стабилен 200мс - запускаем плавную анимацию
        scrollAnimationPhase.current = 'animating';

        // Если скроллим к непрочитанным - устанавливаем флаг
        if (scrollTargetIndex.current !== null) {
          isScrollingToUnread.current = true;
        }

        scrollToTarget(true);

        // Через 400мс (время анимации iOS) - финализируем
        setTimeout(() => {
          console.log('[ScrollToBottom] Animation complete, finalizing');
          const wasScrollingToUnread = scrollTargetIndex.current !== null;
          // Гарантируем финальную позицию (на случай прерывания анимации re-render'ом)
          scrollToTarget(false);
          isScrollToBottomAnimating.current = false;
          scrollAnimationPhase.current = 'done';
          // Сбрасываем состояния только если скроллили в низ (не к непрочитанным)
          if (!wasScrollingToUnread) {
            // Устанавливаем период охлаждения ТОЛЬКО для скролла к низу
            // Для скролла к непрочитанным cooldown не нужен - пользователь останется на месте
            scrollCooldownUntil.current = Date.now() + SCROLL_COOLDOWN_DURATION;
            setHasReachedBottom(true);
            setUserScrolledToBottom(true);
            setNewMessagesCount(0);
            setFirstNewMessageIndex(-1);
            setShowScrollToBottom(false);
          } else {
            // Для скролла к непрочитанным - не устанавливаем cooldown
            // Сбрасываем флаг после завершения - увеличенный таймаут для надёжности
            setTimeout(() => {
              isScrollingToUnread.current = false;
            }, 1000);
          }
          scrollTargetIndex.current = null;
        }, 400);
      }
    }, SCROLL_STABILIZATION_DELAY);

    return () => clearTimeout(stabilizationTimer);
  }, [messagesKey]);

  // Handle keyboard show - for inverted list
  const handleKeyboardWillShow = useCallback((_keyboardHeight: number) => {
    // Устанавливаем флаг что клавиатура анимируется - игнорируем scroll events
    isKeyboardAnimating.current = true;

    // iOS: НЕ вызываем scrollToOffset - полагаемся только на translateY анимацию
    // Это предотвращает race condition с initialScrollIndex на инвертированном списке
    // translateY анимация (в MessageListComponent) уже поднимает список на нужную высоту

    // Сбрасываем флаг после завершения анимации клавиатуры
    // iOS анимация ~300ms, но scroll events могут приходить с задержкой
    // Используем 500ms чтобы гарантированно игнорировать все scroll events от анимации
    setTimeout(() => {
      isKeyboardAnimating.current = false;
    }, 500);
  }, []);

  // Handle keyboard animation progress - не используется
  const handleKeyboardAnimating = useCallback((_currentHeight: number, _targetHeight: number) => {
    // Не делаем ничего
  }, []);

  // Handle keyboard hide - for inverted list
  const handleKeyboardWillHide = useCallback(() => {
    // Устанавливаем флаг что клавиатура анимируется - игнорируем scroll events
    isKeyboardAnimating.current = true;

    // Сбрасываем флаг после завершения анимации клавиатуры
    // iOS анимация ~300ms, но scroll events могут приходить с задержкой
    setTimeout(() => {
      isKeyboardAnimating.current = false;
    }, 500);
  }, []);

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

    // Не меняем hasReachedBottom во время анимации клавиатуры
    // т.к. scroll events при анимации не отражают реальное намерение пользователя
    if (isKeyboardAnimating.current) {
      return;
    }

    // Если пользователь скроллит вручную далеко от низа во время анимации к низу - отменяем анимацию
    // Это позволяет пользователю прервать автоскролл если он хочет остаться наверху
    if (isScrollToBottomAnimating.current && distanceFromBottom > 800) {
      isScrollToBottomAnimating.current = false;
      scrollAnimationPhase.current = 'done';
    }

    // Проверяем близость к низу (порог ~5 сообщений ≈ 500px)
    // Используется для автоскролла при новых сообщениях
    const isCloseToBottom = distanceFromBottom <= 500;
    isNearBottom.current = isCloseToBottom;

    if (isAtBottom) {
      // Если мы в контексте после jump и достигли низа загруженных сообщений - загружаем следующую партию
      // НО НЕ ЗАГРУЖАЕМ если идет анимация к закрепленному сообщению
      if (isInJumpContext.current && !isLoadingMore && !isLoadingNewerMessages.current && !isAnimatingToPin.current && messages.length > 0) {
        const newestMessage = messages[messages.length - 1];

        // Проверяем что мы еще не загружали от этого сообщения
        if (newestMessage && lastNewestMessageId.current !== newestMessage.id) {
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
      // 3. НЕ идет программный скролл к непрочитанным (isScrollingToUnread) - чтобы не скрывать баннер сразу
      // 4. НЕ выходим из jump context (isExitingJumpContext) - даём время плашке отрисоваться
      if (initialScrolled && canTrackUserScroll.current && hasScrolledAwayFromBottom.current && !isScrollingToUnread.current && !isExitingJumpContext.current) {
        setUserScrolledToBottom(true);
      }

      // НЕ сбрасываем состояния если:
      // 1. Идёт программный скролл к непрочитанным (isScrollingToUnread)
      // 2. Только что вышли из jump context (isExitingJumpContext) - даём время плашке отрисоваться
      if (!isScrollingToUnread.current && !isExitingJumpContext.current) {
        setShowScrollToBottom(false);
        setShowDateHeader(false);

        // Сбрасываем счетчик и индекс новых сообщений только когда пользователь
        // РЕАЛЬНО достиг самого низа (< 100px), а не просто близко к низу (< 500px)
        // Это нужно чтобы плашка "Новые сообщения" оставалась видимой пока пользователь
        // не доскроллит до самого конца
        const isReallyAtBottom = distanceFromBottom <= 100;
        if (isReallyAtBottom) {
          setNewMessagesCount(0);
          setFirstNewMessageIndex(-1);
        }
      }
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

    // Не пытаемся загружать старые сообщения если в чате только 1 сообщение
    // или если ID сообщения выглядит как временный (слишком большой - от Date.now())
    // Это предотвращает ошибку "Invalid message ID" при отправке первого сообщения
    if (messages.length === 1 || oldestMessage.id > 1700000000000) {
      setHasMoreMessages(false);
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
  }, [initialScrolled, firstUnreadIndex, unreadCount, chatId]);

  // Отслеживаем новые сообщения от других пользователей
  useEffect(() => {

    // Пропускаем при первой инициализации или если нет сообщений
    if (!initialScrolled || messages.length === 0) {
      previousMessagesLength.current = messages.length;
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

      // Проверяем что это не замена массива (jump context)
      // Если previousLastMessageId существует, но его нет в текущем массиве -
      // значит массив был полностью заменён (jump), а не дополнен
      if (previousLastMessageId.current !== null) {
        const prevMsgExists = messages.some(m => m.id === previousLastMessageId.current);
        if (!prevMsgExists) {
          // Массив был заменён - синхронизируем состояние и выходим
          previousMessagesLength.current = messages.length;
          previousLastMessageId.current = currentLastId;
          setNewMessagesCount(0);
          setFirstNewMessageIndex(-1);
          return;
        }
      }

      // В jump context нужно различать:
      // 1. Инкрементальная загрузка (loadMoreMessagesAfter) - ID <= lastNewestMessageId
      // 2. Реальные новые сообщения от WebSocket - ID > lastNewestMessageId
      //
      // Если мы в jump context И lastNewestMessageId установлен И новое сообщение <= этого ID,
      // значит это инкрементальная загрузка, пропускаем
      if (isInJumpContext.current && lastNewestMessageId.current !== null) {
        // Проверяем, это инкрементальная загрузка или реальные новые сообщения
        // Инкрементальная загрузка добавляет сообщения с ID близкими к lastNewestMessageId
        // Реальные новые сообщения будут иметь ID значительно больше
        const isIncrementalLoad = currentLastId <= lastNewestMessageId.current ||
          (currentLastId - lastNewestMessageId.current) < 100; // Небольшой буфер для batch загрузки

        if (isIncrementalLoad) {
          previousMessagesLength.current = messages.length;
          previousLastMessageId.current = currentLastId;
          return;
        }
      }

      // Это новые сообщения в конце массива
      const newMessages = messages.slice(previousMessagesLength.current);
      const newFromOthers = newMessages.filter(msg => msg.sender_id !== currentUserId).length;

      if (newFromOthers > 0) {
        // УПРОЩЕННАЯ ЛОГИКА: Автоскролл если пользователь близко к низу (~5 сообщений)
        // isNearBottom.current обновляется в handleScroll и проверяет distanceFromBottom <= 500
        //
        // Если пользователь внизу или близко к низу - автоматически прокручиваем к новому сообщению
        // Если пользователь далеко от низа (скроллил вверх) - показываем счетчик новых сообщений
        // В jump context пользователь всегда далеко от реального низа, поэтому не автоскроллим
        const shouldAutoScroll = isNearBottom.current && !isInJumpContext.current;

        if (shouldAutoScroll) {
          // Небольшая задержка для корректного рендера нового сообщения
          setTimeout(() => {
            if (listRef.current) {
              listRef.current.scrollToEnd({
                animated: true,
              });
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
  }, [messages.length, initialScrolled, hasReachedBottom, currentUserId, chatId, firstNewMessageIndex]);

  // Скролл к низу по кнопке
  const handleScrollToBottom = useCallback(async () => {
    const loadMessages = useChatStore.getState().loadMessages;

    // Сбрасываем предыдущую анимацию если она была активна (быстрые повторные нажатия)
    if (isScrollToBottomAnimating.current) {
      isScrollToBottomAnimating.current = false;
      scrollAnimationPhase.current = 'done';
    }

    // ПРИОРИТЕТ 1: Если мы в контексте после jump - СНАЧАЛА перезагружаем последние сообщения
    // Это важно потому что в jump context загружен только частичный массив,
    // и новые сообщения от WebSocket могут не отображаться корректно
    const wasInJumpContext = isInJumpContext.current;
    console.log('[ScrollToBottom] handleScrollToBottom called, wasInJumpContext:', wasInJumpContext);
    if (wasInJumpContext) {
      // ✅ ДВУХФАЗНАЯ АНИМАЦИЯ СКРОЛЛА К НИЗУ
      // Проблема: После loadMessages приходят async обновления read_receipts,
      // которые меняют messagesKey и вызывают re-render FlashList,
      // что сбрасывает/прерывает анимацию скролла.
      //
      // Решение:
      // 1. Фаза 1: Тихий прыжок близко к низу (без анимации)
      // 2. Фаза 2: Ждём стабилизации messagesKey (200мс без изменений)
      // 3. Фаза 3: Плавный scrollToOffset(0) - короткая надёжная анимация
      // 4. Fallback: scrollToOffset(0, animated: false) гарантирует результат

      // Сбрасываем флаги
      isInJumpContext.current = false;
      lastNewestMessageId.current = null;

      // Отмечаем начало процесса анимации
      isScrollToBottomAnimating.current = true;
      scrollToBottomStartTime.current = Date.now();
      scrollAnimationPhase.current = 'waiting';

      // Загружаем последние сообщения
      await loadMessages(chatId);

      // Синхронизируем refs с новым массивом для предотвращения ложных "новых" сообщений
      const freshMessages = useChatStore.getState().messages[chatId] || [];
      previousMessagesLength.current = freshMessages.length;
      if (freshMessages.length > 0) {
        previousLastMessageId.current = freshMessages[freshMessages.length - 1].id;
      }

      // Сбрасываем флаги чтобы можно было снова подгружать старые сообщения
      lastOldestMessageId.current = null;
      setHasMoreMessages(true);

      // ВАЖНО: Сбрасываем счётчики новых сообщений - они содержат устаревшие индексы из jump context
      // После loadMessages нужно использовать ТОЛЬКО пересчитанный actualFirstUnreadIndex
      setNewMessagesCount(0);
      setFirstNewMessageIndex(-1);

      // Ждём стабилизации layout через requestAnimationFrame
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });

      // При выходе из jump context ВСЕГДА скроллим в низ:
      // - loadMessages загружает только последние 10-20 сообщений
      // - Если непрочитанные есть, они все будут видны внизу экрана
      // - Плашка появится автоматически когда React обновит firstUnreadIndex
      // - Это избегает проблемы с мерцанием плашки в неправильном месте
      console.log('[ScrollToBottom] Will scroll to bottom (jump context exit)');
      scrollTargetIndex.current = null; // null означает scrollToEnd

      // Устанавливаем защиту плашки - handleScroll не будет скрывать её некоторое время
      isExitingJumpContext.current = true;
      setTimeout(() => {
        isExitingJumpContext.current = false;
      }, JUMP_CONTEXT_EXIT_PROTECTION_DURATION);

      // Фаза 1: Тихий прыжок близко к целевой позиции
      const totalMessages = freshMessages.length;
      const targetIdx = scrollTargetIndex.current ?? 0; // 0 = самый низ для inverted
      console.log('[ScrollToBottom] Phase 1: Jump near target, totalMessages:', totalMessages, 'targetIndex:', targetIdx);

      if (listRef.current && totalMessages > 0) {
        // Прыгаем к позиции немного выше целевой (чтобы финальная анимация была короткой)
        const jumpIndex = Math.min(targetIdx + 15, totalMessages - 1);
        console.log('[ScrollToBottom] Jumping to index:', jumpIndex);
        listRef.current.scrollToIndex({
          index: jumpIndex,
          animated: false,
          viewPosition: 0.5,
        });
      }

      // Фаза 2 и 3 будут выполнены useEffect после стабилизации messagesKey
      // (см. useEffect с зависимостью [messagesKey] выше)
      console.log('[ScrollToBottom] Phase 1 complete, waiting for messagesKey stabilization...');
      return;
    }

    // ПРИОРИТЕТ 2: Проверяем, есть ли новые сообщения пришедшие во время просмотра
    // (когда НЕ в jump context - в jump context мы уже перезагрузили сообщения выше)
    if (newMessagesCount > 0 && firstNewMessageIndex !== -1) {
      // Устанавливаем флаг чтобы handleScroll не скрывал баннер автоматически
      isScrollingToUnread.current = true;

      // Скроллим к первому новому сообщению
      // viewPosition: 0.5 показывает элемент в центре экрана
      // viewOffset: -30 сдвигает чуть выше чтобы плашка "Новые сообщения" была видна
      listRef.current?.scrollToIndex({
        index: firstNewMessageIndex,
        animated: true,
        viewPosition: 0.5,
        viewOffset: -30,
      });

      // Сбрасываем флаг после завершения анимации скролла (~500ms)
      setTimeout(() => {
        isScrollingToUnread.current = false;
      }, 500);

      // НЕ обнуляем счетчик - он сбросится когда пользователь сам доскроллит до низа
      return;
    }

    // ПРИОРИТЕТ 3: Если есть непрочитанные с момента открытия чата
    if (firstUnreadIndex !== -1 && unreadCount >= 1) {
      isScrollingToUnread.current = true;

      listRef.current?.scrollToIndex({
        index: firstUnreadIndex,
        animated: true,
        viewPosition: 0.5,
        viewOffset: -30,
      });

      setTimeout(() => {
        isScrollingToUnread.current = false;
      }, 500);
    } else {
      // Просто скроллим в самый низ
      listRef.current?.scrollToEnd({
        animated: true,
      });
      setHasReachedBottom(true);
      setUserScrolledToBottom(true);
      setNewMessagesCount(0);
      setFirstNewMessageIndex(-1);
      setShowScrollToBottom(false);
    }
  }, [messages.length, newMessagesCount, firstNewMessageIndex, firstUnreadIndex, unreadCount, chatId]);

  // Скролл к конкретному сообщению
  const handleReplyPress = useCallback(async (messageId: number, setHighlightedMessageId: (id: number | null) => void) => {
    console.log('[handleReplyPress] Called with messageId:', messageId, 'messages.length:', messages.length);

    // Если уже идёт анимация к другому сообщению - прерываем её
    // Это важно для последовательных нажатий на закреплённые сообщения
    if (isAnimatingToPin.current) {
      isAnimatingToPin.current = false;
      // Небольшая пауза чтобы предыдущая анимация успела прерваться
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const messageIndex = messages.findIndex(m => m.id === messageId);
    console.log('[handleReplyPress] messageIndex:', messageIndex, 'isInJumpContext:', isInJumpContext.current);

    if (messageIndex !== -1) {
      // ✅ ФИНАЛЬНАЯ СТРАТЕГИЯ: Как в Telegram - мгновенный прыжок + короткая доводка

      const currentVisibleIndex = lastVisibleMessageIndex.current;
      const distance = Math.abs(messageIndex - currentVisibleIndex);

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

      const performSeamlessScroll = async () => {
        // Сохраняем ID целевого сообщения для проверки актуальности
        const targetMessageId = messageId;
        console.log('[performSeamlessScroll] Starting for messageId:', targetMessageId);

        // Устанавливаем флаг что идёт jump операция - это предотвратит ложное обновление счётчика
        isJumpInProgress.current = true;

        try {
          isAnimatingToPin.current = true;

          // ШАГ 1: Загружаем контекст сообщения
          const jumpToMessage = useChatStore.getState().jumpToMessage;
          console.log('[performSeamlessScroll] Calling jumpToMessage...');
          await jumpToMessage(chatId, messageId);
          console.log('[performSeamlessScroll] jumpToMessage completed');

          // Синхронизируем refs с новым массивом сразу после загрузки
          // Это предотвращает ложное определение "новых" сообщений в useEffect
          const freshMessages = useChatStore.getState().messages[chatId] || [];
          previousMessagesLength.current = freshMessages.length;
          if (freshMessages.length > 0) {
            previousLastMessageId.current = freshMessages[freshMessages.length - 1].id;
          }

          // Сбрасываем флаг jump сразу после синхронизации refs
          // Теперь новые сообщения от WebSocket будут корректно обрабатываться
          isJumpInProgress.current = false;

          // Проверяем, не была ли анимация прервана (пользователь нажал на другое сообщение)
          if (!isAnimatingToPin.current) {
            console.log('[performSeamlessScroll] Animation was interrupted after jumpToMessage');
            return;
          }

          // Устанавливаем флаги jump контекста
          isInJumpContext.current = true;
          setShowScrollToBottom(true);
          setHasReachedBottom(false);
          setNewMessagesCount(0);
          setFirstNewMessageIndex(-1);

          // ШАГ 2: Ждём стабилизации layout через requestAnimationFrame
          // Два кадра гарантируют, что FlashList отрисовал новые данные
          await new Promise<void>(resolve => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve();
              });
            });
          });

          // Повторная проверка после ожидания
          if (!isAnimatingToPin.current) {
            console.log('[performSeamlessScroll] Animation was interrupted after RAF');
            return;
          }

          const updatedMessages = useChatStore.getState().messages[chatId] || [];
          const targetIndex = updatedMessages.findIndex(m => m.id === targetMessageId);
          console.log('[performSeamlessScroll] After jump - updatedMessages.length:', updatedMessages.length, 'targetIndex:', targetIndex);

          previousMessagesLength.current = updatedMessages.length;

          if (targetIndex !== -1) {
            // ШАГ 3: Ждём пока React обновит FlashList с новыми данными
            // Используем setTimeout чтобы дать React время на ре-рендер
            await new Promise<void>(resolve => setTimeout(resolve, 100));

            // Проверка прерывания после ожидания
            if (!isAnimatingToPin.current) {
              console.log('[performSeamlessScroll] Animation interrupted after waiting for render');
              return;
            }

            const OFFSET_ITEMS = 15; // Сколько элементов от цели начинаем

            const isInverted = updatedMessages.length >= 2 &&
              new Date(updatedMessages[0].created_at) > new Date(updatedMessages[updatedMessages.length - 1].created_at);

            let startIndex: number;
            if (isInverted) {
              // Для inverted списка: цель имеет больший индекс (старые сверху)
              startIndex = Math.max(0, targetIndex - OFFSET_ITEMS);
            } else {
              startIndex = Math.min(updatedMessages.length - 1, targetIndex + OFFSET_ITEMS);
            }

            console.log('[performSeamlessScroll] Scrolling - isInverted:', isInverted, 'startIndex:', startIndex, 'targetIndex:', targetIndex);

            // Тихо прыгаем к стартовой позиции
            listRef.current?.scrollToIndex({
              index: startIndex,
              animated: false,
              viewPosition: 0.5,
            });

            // ШАГ 4: Даём время на позиционирование, затем плавно скроллим к цели
            await new Promise<void>(resolve => setTimeout(resolve, 50));

            // Финальная проверка перед анимацией
            if (!isAnimatingToPin.current) {
              console.log('[performSeamlessScroll] Animation interrupted before final scroll');
              return;
            }

            console.log('[performSeamlessScroll] Final scroll to targetIndex:', targetIndex);
            listRef.current?.scrollToIndex({
              index: targetIndex,
              animated: true,
              viewPosition: 0.5,
            });

            // Снимаем флаг анимации после завершения
            setTimeout(() => {
              isAnimatingToPin.current = false;
            }, 600);

            // Подсветка сообщения
            setTimeout(() => {
              setHighlightedMessageId(targetMessageId);
              setTimeout(() => {
                setHighlightedMessageId(null);
              }, 2000);
            }, 400);
          } else {
            console.error('📍 ERROR: Target not found after context load');
            isAnimatingToPin.current = false;
          }
        } catch (error) {
          console.error('📍 ERROR:', error);
          isAnimatingToPin.current = false;
          isJumpInProgress.current = false; // На случай если ошибка до синхронизации refs
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
    isNearBottom.current = true; // По умолчанию считаем что пользователь близко к низу
    lastOldestMessageId.current = null;
    lastVisibleMessageIndex.current = -1;
    previousMessagesLength.current = 0; // Сбрасываем счетчик предыдущих сообщений
    previousLastMessageId.current = null; // Сбрасываем сохраненный ID последнего сообщения
    hasCalculatedInitialIndex.current = false; // ✅ Сбрасываем флаг вычисления индекса
    setShowScrollToBottom(false);
    setShowDateHeader(false);
    setScrollSessionKey(prev => prev + 1); // Увеличиваем ключ для форсирования ремонтирования FlashList
    lastScrollOffset.current = 0;
    currentContentHeight.current = 0; // ✅ Сбрасываем текущую высоту контента
    isLoadingNewerMessages.current = false; // ✅ Сбрасываем флаг загрузки новых сообщений
    lastNewestMessageId.current = null; // ✅ Сбрасываем ID последнего загруженного сообщения
    isAnimatingToPin.current = false; // ✅ Сбрасываем флаг анимации
    isScrollingToUnread.current = false; // ✅ Сбрасываем флаг скролла к непрочитанным
    isKeyboardAnimating.current = false; // ✅ Сбрасываем флаг анимации клавиатуры
    isInitialScrollComplete.current = false; // ✅ Сбрасываем флаг завершения начального скролла
    setIsPositionReady(false); // ✅ Сбрасываем флаг готовности позиции
    isJumpInProgress.current = false; // ✅ Сбрасываем флаг jump операции
    isScrollToBottomAnimating.current = false; // ✅ Сбрасываем флаг анимации скролла к низу
    scrollAnimationPhase.current = 'done'; // ✅ Сбрасываем фазу анимации
    scrollCooldownUntil.current = 0; // ✅ Сбрасываем период охлаждения
    scrollTargetIndex.current = null; // ✅ Сбрасываем целевой индекс скролла
    isExitingJumpContext.current = false; // ✅ Сбрасываем флаг выхода из jump context
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
    firstNewMessageIndex, // Индекс первого нового сообщения (для плашки при скролле вверх)
    initialScrollIndex,
    scrollSessionKey, // Возвращаем ключ сеанса для FlashList
    isPositionReady, // Флаг готовности позиции для показа списка
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
    handleFlashListLoad,
  };
};
