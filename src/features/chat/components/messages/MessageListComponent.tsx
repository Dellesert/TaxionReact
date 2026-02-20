import React from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MessageItem } from './MessageItem';
import { DateSeparator } from '../common/DateSeparator';
import { UnreadMessagesBanner } from './UnreadMessagesBanner';
import { MessageSkeleton } from './MessageSkeleton';
import { ChatEmptyMessages } from '../states/ChatEmptyMessages';
import { useTheme } from '@shared/hooks/useTheme';
import { useCustomScrollbarStyle } from '@shared/hooks/useCustomScrollbarStyle';

type MessageListItem =
  | { type: 'message'; data: any }
  | { type: 'date'; data: string };

interface MessageListComponentProps {
  chatId: number;
  messageListItems: MessageListItem[];
  messagesKey: string;
  firstUnreadIndex: number;
  firstNewMessageIndex: number; // Индекс первого нового сообщения (пришедшего во время скролла вверх)
  newMessagesCount: number; // Количество новых сообщений (пришедших во время скролла вверх)
  unreadCount: number;
  showUnreadBanner: boolean;
  initialUnreadCount: number; // Количество непрочитанных при входе в чат
  isLoading: boolean;
  isLoadingMore: boolean;
  inputHeight: number;
  insetsBottom: number;
  keyboardHeightAnim: Animated.Value; // Анимированная высота клавиатуры
  keyboardHeight: number; // Текущая высота клавиатуры (для расчёта shouldLift)
  hasReachedBottom: boolean; // Флаг что пользователь внизу списка
  listRef: React.RefObject<any>;
  highlightedMessageId: number | null;
  initialScrollIndex?: number;
  scrollSessionKey: number;
  onContentSizeChange: (width: number, height: number) => void;
  onScroll: (event: any) => void;
  onViewableItemsChanged: any;
  viewabilityConfig: any;
  onLoadMore: () => void; // Добавлено для загрузки старых сообщений
  onReply: (message: any) => void;
  onEdit: (message: any) => void;
  onDelete: (messageId: number, deleteFor: 'everyone' | 'me') => void;
  onRestore: (messageId: number) => void;
  onDeletePermanent: (messageId: number) => void;
  onPin: (messageId: number) => void;
  onUnpin: (messageId: number) => void;
  onForward: (message: any) => void;
  onReplyPress: (messageId: number) => void;
  onPollPress: (pollId: number) => void;
  onTaskPress?: (taskId: number) => void;
  selectionMode?: boolean;
  selectedMessages?: Set<number>;
  onEnterSelectionMode?: (messageId: number) => void;
  onToggleMessageSelection?: (messageId: number) => void;
  chatType?: 'private' | 'group' | 'channel' | 'saved';
  userRole?: 'owner' | 'admin' | 'member';
  onFlashListLoad?: () => void;
  isPositionReady?: boolean; // Флаг готовности позиции скролла для показа списка
  searchQuery?: string; // Поисковый запрос для подсветки текста в сообщениях
  onMediaViewerOpen?: (attachmentId: number) => void;
  onCancelUpload?: (messageId: number, attachmentIndex: number) => void;
}

/**
 * Компонент списка сообщений в чате
 */
export const MessageListComponent: React.FC<MessageListComponentProps> = ({
  chatId,
  messageListItems,
  messagesKey,
  firstUnreadIndex,
  firstNewMessageIndex,
  newMessagesCount,
  unreadCount,
  showUnreadBanner,
  initialUnreadCount,
  isLoading,
  isLoadingMore,
  inputHeight,
  insetsBottom,
  keyboardHeightAnim,
  keyboardHeight,
  hasReachedBottom,
  listRef,
  highlightedMessageId,
  initialScrollIndex,
  scrollSessionKey,
  onContentSizeChange,
  onScroll,
  onViewableItemsChanged,
  viewabilityConfig,
  onLoadMore,
  onReply,
  onEdit,
  onDelete,
  onRestore,
  onDeletePermanent,
  onPin,
  onUnpin,
  onForward,
  onReplyPress,
  onPollPress,
  onTaskPress,
  selectionMode = false,
  selectedMessages = new Set(),
  onEnterSelectionMode,
  onToggleMessageSelection,
  chatType,
  userRole,
  onFlashListLoad,
  isPositionReady = true, // По умолчанию true для обратной совместимости
  searchQuery,
  onMediaViewerOpen,
  onCancelUpload,
}) => {
  const { theme } = useTheme();
  const { scrollbarRef } = useCustomScrollbarStyle();

  // Список показывается мгновенно — initialScrollIndex уже позиционирует правильно

  // Функция для определения типа элемента (помогает FlashList оптимизировать рендеринг)
  const getItemType = React.useCallback((item: MessageListItem) => {
    return item.type; // 'message' или 'date'
  }, []);

  // Отслеживаем видимые элементы для ленивой загрузки изображений
  // Инициализируем с первыми 10 элементами для начальной загрузки
  const [viewableIndices, setViewableIndices] = React.useState<Set<number>>(() => {
    const initial = new Set<number>();
    for (let i = 0; i < Math.min(10, messageListItems.length); i++) {
      initial.add(i);
    }
    return initial;
  });

  // Обновляем видимые индексы при изменении viewableItems
  const handleViewableItemsChanged = React.useCallback((info: any) => {
    // Вызываем оригинальный обработчик
    if (onViewableItemsChanged) {
      onViewableItemsChanged(info);
    }

    // Обновляем наш локальный стейт с буфером (+/- 2 элемента для предзагрузки)
    const newViewableIndices = new Set<number>();
    info.viewableItems.forEach((item: any) => {
      if (item.index !== null && item.index !== undefined) {
        const idx = item.index;
        // Добавляем текущий элемент и соседние для плавной загрузки (буфер ±3)
        for (let offset = -3; offset <= 3; offset++) {
          newViewableIndices.add(idx + offset);
        }
      }
    });
    setViewableIndices(newViewableIndices);
  }, [onViewableItemsChanged]);

  // Показываем skeleton'ы если сообщения еще не загружены
  const showSkeletons = isLoading && messageListItems.length === 0;

  // Показываем пустое состояние если нет сообщений и загрузка завершена
  const showEmptyState = !isLoading && messageListItems.length === 0;

  // Базовый отступ внизу списка = высота инпута (статический)
  // На web контейнер уже имеет marginBottom равный высоте инпута,
  // поэтому не нужно дублировать отступ в contentContainerStyle
  const baseBottomPadding = Platform.OS === 'web'
    ? 20
    : inputHeight + insetsBottom + 20;

  // Отслеживаем размеры контента и viewport
  const [contentHeight, setContentHeight] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);

  // Обработчик изменения размера контента
  // ВАЖНО: все хуки должны вызываться до условных return!
  const handleContentSizeChangeInternal = React.useCallback((width: number, height: number) => {
    setContentHeight(height);
    onContentSizeChange(width, height);
  }, [onContentSizeChange]);

  // Обработчик layout для получения размера viewport
  const handleLayout = React.useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setViewportHeight(height);
    }
  }, []);

  // Определяем нужно ли поднимать список: только если клавиатура перекрывает последнее сообщение
  // Для inverted списка: сообщения отображаются снизу, последнее сообщение внизу экрана
  const isLayoutReady = viewportHeight > 0 && contentHeight > 0;

  // Логика для inverted списка:
  // - contentHeight = общая высота контента (сообщения + paddings)
  // - viewportHeight = видимая область
  // - Если contentHeight < viewportHeight, сообщения занимают только часть экрана
  // - Сообщения начинаются от inputHeight и идут вверх
  // - Нужно проверить: достигают ли сообщения зоны клавиатуры
  //
  // Пространство над сообщениями = viewportHeight - contentHeight (когда мало сообщений)
  // Если это пространство >= keyboardHeight, клавиатура не закрывает сообщения

  // Вычисляем параметры для поднятия списка
  const liftParams = React.useMemo(() => {
    // Если layout не готов - по умолчанию поднимаем полностью (безопасный вариант)
    if (!isLayoutReady) {
      return { shouldLift: hasReachedBottom, liftRatio: 1 };
    }

    // Если контента больше чем viewport - поднимаем полностью (как раньше)
    if (contentHeight >= viewportHeight) {
      return { shouldLift: hasReachedBottom, liftRatio: 1 };
    }

    // Мало контента: проверяем перекрывает ли клавиатура сообщения
    // Свободное пространство над сообщениями (для inverted списка это пространство сверху)
    const freeSpaceAboveMessages = viewportHeight - contentHeight;

    // Клавиатура перекрывает сообщения если она выше чем свободное пространство
    if (keyboardHeight <= freeSpaceAboveMessages) {
      return { shouldLift: false, liftRatio: 0 };
    }

    // Вычисляем на сколько нужно поднять: только на величину перекрытия
    // Перекрытие = keyboardHeight - freeSpaceAboveMessages
    const overlap = keyboardHeight - freeSpaceAboveMessages;
    // liftRatio = какую долю от высоты клавиатуры нужно поднять (от 0 до 1)
    const liftRatio = overlap / keyboardHeight;

    return { shouldLift: true, liftRatio };
  }, [isLayoutReady, contentHeight, viewportHeight, keyboardHeight, hasReachedBottom]);


  // Анимируем translateY для поднятия списка вместе с клавиатурой
  // Теперь БЕЗ LayoutAnimation - вся анимация через Animated.Value
  // Логика:
  // - Если shouldLift=true: поднимаем список на величину перекрытия
  // - Если shouldLift=false: не двигаем
  //
  // ВАЖНО: useMemo гарантирует что interpolate пересоздаётся при изменении параметров
  const animatedTranslateY = React.useMemo(() => {
    return keyboardHeightAnim.interpolate({
      inputRange: [0, 1000],
      // Поднимаем только на liftRatio от высоты клавиатуры
      outputRange: liftParams.shouldLift ? [0, -1000 * liftParams.liftRatio] : [0, 0],
    });
  }, [keyboardHeightAnim, liftParams]);

  if (showSkeletons) {
    return (
      <View style={styles.skeletonsContainer}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <MessageSkeleton key={i} isOwn={i % 3 === 0} />
        ))}
      </View>
    );
  }

  if (showEmptyState) {
    return <ChatEmptyMessages chatType={chatType} />;
  }

  return (
    <View ref={scrollbarRef} style={{ flex: 1 }}>
    <Animated.View
      style={{
        flex: 1,
        transform: [{ translateY: animatedTranslateY }],
      }}
      onLayout={handleLayout}
    >
      {/* @ts-ignore - FlashList типы могут быть устаревшими */}
      <FlashList
        key={`chat-${chatId}-session-${scrollSessionKey}`}
        ref={listRef}
        data={messageListItems}
        extraData={messagesKey}
        drawDistance={Platform.OS === 'ios' ? 5000 : 5000}
        estimatedItemSize={200}
        estimatedListSize={{ height: 800, width: 400 }}
        initialScrollIndex={initialScrollIndex}
        removeClippedSubviews={Platform.OS === 'android'}
        overrideItemLayout={(layout, item) => {
          // Оптимизация: предоставляем более точные размеры для разных типов элементов
          if (item.type === 'date') {
            layout.size = 40; // Разделитель даты - фиксированная высота
          } else {
            // Динамически вычисляем размер на основе контента сообщения
            const message = item.data;
            let estimatedSize = 80; // Базовый размер для текста

            // Учитываем изображения
            if (message.images && message.images.length > 0) {
              if (message.images.length === 1) {
                estimatedSize += 180; // Одно изображение 180x180
              } else if (message.images.length <= 4) {
                estimatedSize += 200; // Сетка 2x2 изображений
              } else {
                estimatedSize += 240; // Более 4 изображений
              }
            }

            // Учитываем файлы
            if (message.files && message.files.length > 0) {
              estimatedSize += message.files.length * 60; // ~60px на файл
            }

            // Учитываем длинный текст (грубая оценка)
            if (message.text && message.text.length > 200) {
              estimatedSize += Math.min(100, Math.floor(message.text.length / 200) * 30);
            }

            // Учитываем reply-to сообщение
            if (message.reply_to) {
              estimatedSize += 50;
            }

            layout.size = estimatedSize;
          }
        }}
        getItemType={getItemType}
        overrideProps={{
          // ✅ Отключаем recycling во время быстрого скролла для плавности
          disableAutoLayout: false,
        }}
        renderItem={({ item, index }) => {
          // Рендер разделителя даты
          if (item.type === 'date') {
            return <DateSeparator date={item.data} />;
          }

          // Рендер сообщения
          const message = item.data;

          // Показываем встроенный баннер при наличии непрочитанных
          // Есть два случая:
          // 1. firstUnreadIndex - индекс непрочитанных при открытии чата (показываем showUnreadBanner)
          // 2. firstNewMessageIndex - индекс новых сообщений пришедших во время скролла вверх
          const shouldShowUnreadBanner =
            index === firstUnreadIndex &&
            unreadCount >= 1 &&
            showUnreadBanner;

          // Показываем баннер для новых сообщений (пришедших во время просмотра чата)
          // НО только если это НЕ тот же индекс что и firstUnreadIndex (чтобы не дублировать)
          const shouldShowNewMessageBanner =
            index === firstNewMessageIndex &&
            firstNewMessageIndex !== -1 &&
            firstNewMessageIndex !== firstUnreadIndex &&
            newMessagesCount > 0;

          // В inverted FlashList порядок рендера в JSX обратный визуальному:
          // - Элементы в начале JSX (<>) появляются ВИЗУАЛЬНО НИЖЕ
          // - Элементы в конце JSX (</>) появляются ВИЗУАЛЬНО ВЫШЕ
          // Поэтому баннер должен быть ПОСЛЕ MessageItem в JSX, чтобы быть ВИЗУАЛЬНО НАД ним
          return (
            <>
              <MessageItem
                message={message}
                chatType={chatType === 'saved' ? 'private' : chatType}
                isSavedChat={chatType === 'saved'}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onRestore={onRestore}
                onDeletePermanent={onDeletePermanent}
                onPin={onPin}
                onUnpin={onUnpin}
                onForward={onForward}
                onReplyPress={onReplyPress}
                onPollPress={onPollPress}
                onTaskPress={onTaskPress}
                isHighlighted={message.id === highlightedMessageId}
                userRole={userRole}
                selectionMode={selectionMode}
                isSelected={selectedMessages.has(message.id)}
                onEnterSelectionMode={onEnterSelectionMode}
                onToggleSelection={onToggleMessageSelection}
                isVisible={viewableIndices.has(index)}
                searchQuery={searchQuery}
                onMediaViewerOpen={onMediaViewerOpen}
                onCancelUpload={onCancelUpload}
              />
              {shouldShowNewMessageBanner && <UnreadMessagesBanner unreadCount={newMessagesCount} />}
              {shouldShowUnreadBanner && <UnreadMessagesBanner unreadCount={unreadCount} />}
            </>
          );
        }}
        keyExtractor={(item, index) =>
          item.type === 'date' ? `date-${index}` : `message-${item.data.id}`
        }
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: baseBottomPadding }, // Статический padding
        ]}
        // @ts-ignore - FlashList 2.x uses different approach
        inverted={true}
        keyboardShouldPersistTaps="handled"
        // iOS: нативный maintainVisibleContentPosition предотвращает прыжки при загрузке старых сообщений
        // Android: FlashList v2 включает maintainVisibleContentPosition по умолчанию,
        // но он конфликтует с inverted на Android — offset correction идёт в неправильном направлении,
        // что вызывает прыжки скролла наверх. Отключаем явно через { disabled: true }.
        maintainVisibleContentPosition={
          Platform.OS === 'ios'
            ? {
                minIndexForVisible: 0,
              }
            : Platform.OS === 'android'
              ? { disabled: true } as any
              : undefined
        }
        onContentSizeChange={handleContentSizeChangeInternal}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onLoad={() => {
          onFlashListLoad?.();
        }}
        onScrollToIndexFailed={(info: any) => {
          // ✅ ОПТИМИЗАЦИЯ: Минимальный fallback - просто логируем для отладки
          // Основную логику плавного скролла обрабатывает handleReplyPress
          // Простой fallback: скроллим к приблизительной позиции
          const wait = new Promise((resolve) => setTimeout(resolve, 50));
          wait.then(() => {
            if (info.index < messageListItems.length) {
              const estimatedOffset = Math.max(0, info.index * 120);
              listRef.current?.scrollToOffset({
                offset: estimatedOffset,
                animated: false, // Без анимации - основная анимация идёт из handleReplyPress
              });
            }
          });
        }}
        ListFooterComponent={null}
      />
    </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonsContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  messagesList: {
    paddingTop: 20,
    // paddingBottom задается динамически через animated style
  },
});
