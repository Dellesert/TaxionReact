import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { FlatList, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChatStore } from '@shared/store/chatStore';
import { getDateLabel } from '@shared/utils/dateHelpers';

// Флаг для отключения анимаций скролла на Android
// Android Go и бюджетные устройства плохо справляются с JS-анимациями scrollToIndex
// Можно переключить на true для тестирования или через настройки
let reduceScrollAnimations = Platform.OS === 'android';

// Экспортируем функцию для настройки (можно вызвать из настроек приложения)
export const setReduceScrollAnimations = (value: boolean) => {
  reduceScrollAnimations = value;
};

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
  const isLoadingNewerMessages = useRef<boolean>(false); // Флаг загрузки более новых сообщений (при скролле вниз в jump context)
  const lastNewestMessageId = useRef<number | null>(null); // ID последнего загруженного сообщения при incremental load
  const isAnimatingToPin = useRef<boolean>(false); // Флаг анимации к закрепленному сообщению
  const [isJumpingToPinned, setIsJumpingToPinned] = useState<boolean>(false); // State для UI индикатора загрузки
  const isScrollingToUnread = useRef<boolean>(false); // Флаг скролла к непрочитанным (по кнопке)
  const isInitialScrollComplete = useRef<boolean>(false); // Флаг что FlashList завершил начальный скролл
  const [isPositionReady, setIsPositionReady] = useState<boolean>(false); // Флаг что позиция скролла готова для показа списка
  const isJumpInProgress = useRef<boolean>(false); // Флаг что идёт jump к сообщению (замена массива)

  // ✅ Refs для двухфазной анимации скролла из jump context
  const isScrollToBottomAnimating = useRef<boolean>(false); // Флаг активной анимации скролла к низу
  const scrollToBottomStartTime = useRef<number>(0); // Время начала анимации
  const scrollAnimationPhase = useRef<'waiting' | 'animating' | 'done'>('done'); // Фаза анимации
  const scrollCooldownUntil = useRef<number>(0); // Время до которого игнорируем изменения messagesKey
  const scrollTargetIndex = useRef<number | null>(null); // Целевой индекс для скролла (null = scrollToOffset(0))
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
    // Для inverted FlatList: не передаём initialScrollIndex, чтобы показать начало
    // Начало inverted списка = визуально низ экрана (новые сообщения)
    // После рендера вызовем scrollToOffset(0) для гарантии позиционирования
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
      // Для inverted FlatList: offset 0 = визуальный низ (новые сообщения)
      if (listRef.current) {
        listRef.current.scrollToOffset({ offset: 0, animated: false });
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
        // Скроллим в самый низ (для inverted FlatList: offset 0 = новые сообщения)
        listRef.current?.scrollToOffset({ offset: 0, animated });
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

  // Keyboard handlers - упрощены, FlatList сам справляется с клавиатурой
  const handleKeyboardWillShow = useCallback((_keyboardHeight: number) => {
    isKeyboardAnimating.current = true;
    setTimeout(() => { isKeyboardAnimating.current = false; }, 400);
  }, []);

  const handleKeyboardWillHide = useCallback(() => {
    isKeyboardAnimating.current = true;
    setTimeout(() => { isKeyboardAnimating.current = false; }, 400);
  }, []);

  // Обработчик скролла
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    // Сохраняем текущую позицию скролла
    lastScrollOffset.current = contentOffset.y;

    // Для inverted FlatList:
    // - contentOffset.y = 0 → пользователь видит НОВЫЕ сообщения (визуальный низ)
    // - contentOffset.y = maxScroll → пользователь видит СТАРЫЕ сообщения (визуальный верх)
    const maxScroll = contentSize.height - layoutMeasurement.height;

    // distanceToOldMessages = сколько пикселей осталось до старых сообщений (визуальный верх)
    // Когда contentOffset.y близок к maxScroll, distanceToOldMessages мало
    const distanceToOldMessages = maxScroll - contentOffset.y;

    // distanceToNewMessages = сколько пикселей до новых сообщений (визуальный низ)
    // Когда contentOffset.y близок к 0, distanceToNewMessages мало
    const distanceToNewMessages = contentOffset.y;

    // isNearTop = пользователь близко к СТАРЫМ сообщениям (нужна пагинация)
    // Используем большой порог (1500px ≈ 15-20 сообщений) для упредительной загрузки
    // Это обеспечивает плавный бесконечный скролл без заметных пауз
    let isNearTop: boolean;
    if (maxScroll <= 0) {
      // Контента меньше чем viewport - не загружаем (всё уже видно)
      isNearTop = false;
    } else {
      // Когда до старых сообщений осталось <= 1500px - загружаем ещё
      // Это примерно 15-20 сообщений, что даёт время загрузить до того как пользователь доскроллит
      isNearTop = distanceToOldMessages <= 1500;
    }

    // Если пользователь близко к верху и есть еще сообщения - загружаем
    // ВАЖНО: Проверяем initialScrolled чтобы не загружать при первом рендере!
    // Также проверяем isInitialScrollComplete для дополнительной защиты
    if (isNearTop && !isLoadingMore && hasMoreMessages && messages.length > 0 && initialScrolled && isInitialScrollComplete.current) {
      // Для inverted FlatList с обратным массивом [новые → старые]:
      // messages[length - 1] = самое СТАРОЕ сообщение (визуально вверху)
      const oldestMessage = messages[messages.length - 1];

      if (oldestMessage && lastOldestMessageId.current !== oldestMessage.id) {
        // Запускаем загрузку немедленно (без задержки)
        handleLoadMoreRef.current?.();
      }
    }

    // Проверяем достигли ли низа списка
    const isAtBottom = distanceToNewMessages <= 500;

    // Не меняем hasReachedBottom во время анимации клавиатуры
    // т.к. scroll events при анимации не отражают реальное намерение пользователя
    if (isKeyboardAnimating.current) {
      return;
    }

    // Если пользователь скроллит вручную далеко от низа во время анимации к низу - отменяем анимацию
    // Это позволяет пользователю прервать автоскролл если он хочет остаться наверху
    if (isScrollToBottomAnimating.current && distanceToNewMessages > 800) {
      isScrollToBottomAnimating.current = false;
      scrollAnimationPhase.current = 'done';
    }

    // Проверяем близость к низу (порог ~5 сообщений ≈ 500px)
    // Используется для автоскролла при новых сообщениях
    const isCloseToBottom = distanceToNewMessages <= 500;
    isNearBottom.current = isCloseToBottom;

    if (isAtBottom) {
      // Если мы в контексте после jump и достигли низа загруженных сообщений - загружаем следующую партию
      // НО НЕ ЗАГРУЖАЕМ если идет анимация к закрепленному сообщению
      if (isInJumpContext.current && !isLoadingMore && !isLoadingNewerMessages.current && !isAnimatingToPin.current && messages.length > 0) {
        // Для inverted FlatList с обратным массивом [новые → старые]:
        // messages[0] = самое НОВОЕ сообщение (визуально внизу)
        const newestMessage = messages[0];

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
        const isReallyAtBottom = distanceToNewMessages <= 100;
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

    // Для inverted FlatList с обратным массивом [новые → старые]:
    // messages[length - 1] = самое СТАРОЕ сообщение (визуально вверху)
    const oldestMessage = messages[messages.length - 1];
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

    setIsLoadingMore(true);
    isLoadingOldMessages.current = true;

    try {
      const addedCount = await loadMoreMessages(chatId, oldestMessage.id);

      if (addedCount === 0) {
        setHasMoreMessages(false);
      } else {
        // После успешной загрузки сбрасываем ID чтобы разрешить следующую загрузку
        // Это нужно для непрерывной пагинации при быстром скролле
        lastOldestMessageId.current = null;
      }
    } catch (error) {
      lastOldestMessageId.current = null;
    } finally {
      setIsLoadingMore(false);
      isLoadingOldMessages.current = false;
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
  // ВАЖНО: Массив messages в обратном порядке [новые → старые]
  // messages[0] = самое новое, messages[length-1] = самое старое
  useEffect(() => {

    // Пропускаем при первой инициализации или если нет сообщений
    if (!initialScrolled || messages.length === 0) {
      previousMessagesLength.current = messages.length;
      // Сохраняем ID ПЕРВОГО (самого нового) сообщения
      if (messages.length > 0) {
        previousLastMessageId.current = messages[0].id;
      }
      return;
    }

    // Проверяем, появились ли новые сообщения
    const newMessagesAdded = messages.length - previousMessagesLength.current;

    // ВАЖНО: обрабатываем только если длина массива УВЕЛИЧИЛАСЬ (реально добавились новые сообщения)
    // Если длина осталась прежней - это просто обновление существующего сообщения (например, pin/unpin)
    if (newMessagesAdded > 0 && currentUserId) {
      // В обратном массиве [новые → старые]:
      // - Новые сообщения добавляются в НАЧАЛО (index 0)
      // - Старые сообщения добавляются в КОНЕЦ

      // ПРОСТАЯ И НАДЕЖНАЯ ПРОВЕРКА:
      // Сравниваем ID первого (самого нового) сообщения с сохраненным
      const currentFirstMessage = messages[0];
      const currentFirstId = currentFirstMessage.id;

      // Если ID первого сообщения НЕ изменился - значит добавились старые в конец
      if (previousLastMessageId.current !== null && currentFirstId === previousLastMessageId.current) {
        previousMessagesLength.current = messages.length;
        previousLastMessageId.current = currentFirstId;
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
          previousLastMessageId.current = currentFirstId;
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
        const isIncrementalLoad = currentFirstId <= lastNewestMessageId.current ||
          (currentFirstId - lastNewestMessageId.current) < 100; // Небольшой буфер для batch загрузки

        if (isIncrementalLoad) {
          previousMessagesLength.current = messages.length;
          previousLastMessageId.current = currentFirstId;
          return;
        }
      }

      // Это новые сообщения в начале массива (новые добавляются в начало в обратном порядке)
      // Берём первые newMessagesAdded элементов
      const newMessages = messages.slice(0, newMessagesAdded);
      const newFromOthers = newMessages.filter(msg => msg.sender_id !== currentUserId).length;

      if (newFromOthers > 0) {
        // УПРОЩЕННАЯ ЛОГИКА: Автоскролл если пользователь близко к низу (~5 сообщений)
        // isNearBottom.current обновляется в handleScroll и проверяет distanceToNewMessages <= 500
        //
        // Если пользователь внизу или близко к низу - автоматически прокручиваем к новому сообщению
        // Если пользователь далеко от низа (скроллил вверх) - показываем счетчик новых сообщений
        // В jump context пользователь всегда далеко от реального низа, поэтому не автоскроллим
        const shouldAutoScroll = isNearBottom.current && !isInJumpContext.current;

        if (shouldAutoScroll) {
          // Небольшая задержка для корректного рендера нового сообщения
          setTimeout(() => {
            if (listRef.current) {
              // Для inverted FlatList: offset 0 = новые сообщения (визуальный низ)
              listRef.current.scrollToOffset({
                offset: 0,
                animated: true,
              });
            }
          }, 100);
        } else {
          // Если это первое новое сообщение - запоминаем его индекс
          // В обратном массиве новые сообщения в начале, ищем среди первых newMessagesAdded
          if (firstNewMessageIndex === -1) {
            const firstNewMsgIndex = messages.findIndex((msg, idx) =>
              idx < newMessagesAdded && msg.sender_id !== currentUserId
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

      // Обновляем сохраненный ID первого (самого нового) сообщения
      previousLastMessageId.current = currentFirstId;
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
      // Сбрасываем флаги jump context
      isInJumpContext.current = false;
      lastNewestMessageId.current = null;

      // Загружаем последние сообщения
      await loadMessages(chatId);

      // Синхронизируем refs с новым массивом для предотвращения ложных "новых" сообщений
      // ВАЖНО: freshMessages в store в порядке [старые → новые], но наш messages reversed [новые → старые]
      // previousLastMessageId хранит ID самого НОВОГО сообщения (первого в reversed массиве)
      const freshMessages = useChatStore.getState().messages[chatId] || [];
      previousMessagesLength.current = freshMessages.length;
      if (freshMessages.length > 0) {
        // Самое новое сообщение в оригинальном массиве - последнее
        previousLastMessageId.current = freshMessages[freshMessages.length - 1].id;
      }

      // Сбрасываем флаги чтобы можно было снова подгружать старые сообщения
      lastOldestMessageId.current = null;
      setHasMoreMessages(true);

      // ВАЖНО: Сбрасываем счётчики новых сообщений - они содержат устаревшие индексы из jump context
      // После loadMessages нужно использовать ТОЛЬКО пересчитанный actualFirstUnreadIndex
      setNewMessagesCount(0);
      setFirstNewMessageIndex(-1);

      // Устанавливаем защиту плашки - handleScroll не будет скрывать её некоторое время
      isExitingJumpContext.current = true;
      setTimeout(() => {
        isExitingJumpContext.current = false;
      }, JUMP_CONTEXT_EXIT_PROTECTION_DURATION);

      // Ждём пока React обновит FlatList с новыми данными из store
      // Два RAF + небольшая задержка гарантируют что layout завершён
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 50);
          });
        });
      });

      // ПРОВЕРЯЕМ: Есть ли непрочитанные сообщения в загруженных данных?
      // Пересчитываем firstUnreadIndex из свежих данных store
      // currentUserId передаётся как параметр хука
      const reversedMessages = [...freshMessages].reverse(); // [новые → старые] как в FlatList

      let actualFirstUnreadIndex = -1;
      let actualUnreadCount = 0;

      if (currentUserId) {
        for (let i = 0; i < reversedMessages.length; i++) {
          const message = reversedMessages[i];
          const readReceipts = message.read_receipts || [];
          const hasReadReceipt = readReceipts.some((receipt: any) => receipt.user_id === currentUserId);
          const isUnread = message.sender_id !== currentUserId && !hasReadReceipt;

          if (isUnread) {
            actualFirstUnreadIndex = i;
            actualUnreadCount++;
          }
        }
      }

      console.log('[ScrollToBottom] After loadMessages - actualFirstUnreadIndex:', actualFirstUnreadIndex, 'actualUnreadCount:', actualUnreadCount);

      // Если есть непрочитанные - скроллим к плашке непрочитанных
      if (actualFirstUnreadIndex !== -1 && actualUnreadCount >= 1) {
        console.log('[ScrollToBottom] Scrolling to unread banner at index:', actualFirstUnreadIndex);

        isScrollingToUnread.current = true;

        listRef.current?.scrollToIndex({
          index: actualFirstUnreadIndex,
          animated: true,
          viewPosition: 0.5,
          viewOffset: -30,
        });

        // Финализация после анимации
        setTimeout(() => {
          isScrollingToUnread.current = false;
          // Не сбрасываем showScrollToBottom - кнопка остаётся видимой
          console.log('[ScrollToBottom] Animation to unread complete');
        }, 500);
      } else {
        // Нет непрочитанных - скроллим в самый низ
        console.log('[ScrollToBottom] No unread, scrolling to offset 0 (bottom)');

        listRef.current?.scrollToOffset({ offset: 0, animated: true });

        // Финализация после анимации
        setTimeout(() => {
          listRef.current?.scrollToOffset({ offset: 0, animated: false });
          scrollCooldownUntil.current = Date.now() + SCROLL_COOLDOWN_DURATION;
          setHasReachedBottom(true);
          setUserScrolledToBottom(true);
          setNewMessagesCount(0);
          setFirstNewMessageIndex(-1);
          setShowScrollToBottom(false);
          console.log('[ScrollToBottom] Animation complete, finalized at bottom');
        }, 400);
      }

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
      // Просто скроллим в самый низ (для inverted FlatList: offset 0 = новые сообщения)
      listRef.current?.scrollToOffset({
        offset: 0,
        animated: true,
      });
      setHasReachedBottom(true);
      setUserScrolledToBottom(true);
      setNewMessagesCount(0);
      setFirstNewMessageIndex(-1);
      setShowScrollToBottom(false);
    }
  }, [messages.length, newMessagesCount, firstNewMessageIndex, firstUnreadIndex, unreadCount, chatId]);

  // Скролл к конкретному сообщению (закреплённому или ответу)
  const handleReplyPress = useCallback(async (messageId: number, setHighlightedMessageId: (id: number | null) => void) => {
    // Прерываем предыдущую анимацию если она активна
    if (isAnimatingToPin.current) {
      isAnimatingToPin.current = false;
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    const messageIndex = messages.findIndex(m => m.id === messageId);

    // Хелпер для скролла и подсветки
    const scrollAndHighlight = (index: number, animated: boolean) => {
      listRef.current?.scrollToIndex({
        index,
        animated,
        viewPosition: 0.5,
      });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    };

    // СЛУЧАЙ 1: Сообщение уже в текущем массиве
    if (messageIndex !== -1) {
      // На Android - без анимации для производительности
      scrollAndHighlight(messageIndex, !reduceScrollAnimations);
      return;
    }

    // СЛУЧАЙ 2: Сообщение не в массиве - нужен jump context
    isJumpInProgress.current = true;
    setIsJumpingToPinned(true);
    isAnimatingToPin.current = true;

    try {
      // Загружаем контекст сообщения
      const jumpToMessage = useChatStore.getState().jumpToMessage;
      await jumpToMessage(chatId, messageId);

      // Синхронизируем refs с новым массивом
      const freshMessages = useChatStore.getState().messages[chatId] || [];
      previousMessagesLength.current = freshMessages.length;
      if (freshMessages.length > 0) {
        previousLastMessageId.current = freshMessages[freshMessages.length - 1].id;
      }
      isJumpInProgress.current = false;

      // Проверяем прерывание
      if (!isAnimatingToPin.current) return;

      // Устанавливаем флаги jump контекста
      isInJumpContext.current = true;
      setShowScrollToBottom(true);
      setHasReachedBottom(false);
      setNewMessagesCount(0);
      setFirstNewMessageIndex(-1);

      // Ждём рендер нового контента
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      if (!isAnimatingToPin.current) return;

      // Находим индекс в обновлённом массиве
      // ⚠️ ВАЖНО: Store хранит сообщения в порядке [старые → новые],
      // но FlatList использует reversed массив [новые → старые]!
      // Поэтому нужно реверснуть массив перед поиском индекса.
      const storeMessages = useChatStore.getState().messages[chatId] || [];
      const updatedMessages = [...storeMessages].reverse(); // Тот же порядок что и в FlatList
      const targetIndex = updatedMessages.findIndex(m => m.id === messageId);
      previousMessagesLength.current = storeMessages.length;

      if (targetIndex !== -1) {
        // Небольшая задержка для стабилизации FlatList после замены массива
        const stabilizationDelay = Platform.OS === 'ios' ? 100 : (reduceScrollAnimations ? 30 : 80);
        await new Promise<void>(resolve => setTimeout(resolve, stabilizationDelay));

        if (!isAnimatingToPin.current) return;

        // Скроллим к цели с подсветкой
        scrollAndHighlight(targetIndex, !reduceScrollAnimations);
      } else {
        console.error('[handleReplyPress] Target not found after jump');
      }
    } catch (error) {
      console.error('[handleReplyPress] Error:', error);
      isJumpInProgress.current = false;
    } finally {
      isAnimatingToPin.current = false;
      setIsJumpingToPinned(false);
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
    setIsJumpingToPinned(false); // ✅ Сбрасываем состояние индикатора загрузки
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
    isJumpingToPinned, // Флаг загрузки при прыжке к закрепленному сообщению
    handleScroll,
    handleLoadMore,
    handleContentSizeChange,
    handleScrollToBottom,
    handleReplyPress,
    handleKeyboardWillShow,
    handleKeyboardWillHide,
    onViewableItemsChanged,
    viewabilityConfig,
    resetScroll,
    handleFlashListLoad,
  };
};
