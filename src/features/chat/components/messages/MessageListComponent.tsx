import React from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MessageItem } from './MessageItem';
import { DateSeparator } from '../common/DateSeparator';
import { UnreadMessagesBanner } from './UnreadMessagesBanner';
import { MessageSkeleton } from './MessageSkeleton';
import { ChatEmptyMessages } from '../states/ChatEmptyMessages';
import { useTheme } from '@shared/hooks/useTheme';

type MessageListItem =
  | { type: 'message'; data: any }
  | { type: 'date'; data: string };

interface MessageListComponentProps {
  chatId: number;
  messageListItems: MessageListItem[];
  messagesKey: string;
  firstUnreadIndex: number;
  unreadCount: number;
  showUnreadBanner: boolean;
  initialUnreadCount: number; // Количество непрочитанных при входе в чат
  isLoading: boolean;
  isLoadingMore: boolean;
  inputHeight: number;
  insetsBottom: number;
  keyboardHeightAnim: Animated.Value; // Анимированная высота клавиатуры
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
  chatType?: 'private' | 'group' | 'channel';
  userRole?: 'owner' | 'admin' | 'member';
  onFlashListLoad?: () => void;
}

/**
 * Компонент списка сообщений в чате
 */
export const MessageListComponent: React.FC<MessageListComponentProps> = ({
  chatId,
  messageListItems,
  messagesKey,
  firstUnreadIndex,
  unreadCount,
  showUnreadBanner,
  initialUnreadCount,
  isLoading,
  isLoadingMore,
  inputHeight,
  insetsBottom,
  keyboardHeightAnim,
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
}) => {
  const { theme } = useTheme();

  // State to control list opacity - prevents showing partially rendered list
  const [listOpacity] = React.useState(new Animated.Value(0));
  const [hasRendered, setHasRendered] = React.useState(false);

  // Show list with fade-in after initial render is complete
  React.useEffect(() => {
    if (messageListItems.length > 0 && !hasRendered) {
      // Give FlashList time to render and position scroll (two frames + small delay)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Additional small delay to ensure initialScrollIndex is applied
          setTimeout(() => {
            setHasRendered(true);
            Animated.timing(listOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }).start();
          }, 50);
        });
      });
    }
  }, [messageListItems.length, hasRendered, listOpacity]);

  // Reset opacity when chat changes
  React.useEffect(() => {
    setHasRendered(false);
    listOpacity.setValue(0);
  }, [scrollSessionKey, listOpacity]);

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
  // В веб-версии добавляем дополнительный отступ из-за особенностей рендеринга инвертированного списка
  const baseBottomPadding = inputHeight + insetsBottom + (Platform.OS === 'web' ? 40 : 20);

  // Отслеживаем размеры контента и viewport
  const [contentHeight, setContentHeight] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);

  // Определяем нужно ли поднимать список: только если пользователь внизу И контента больше чем экран
  // Если размеры ещё не инициализированы - доверяем hasReachedBottom
  // Это важно для первого рендера когда onLayout ещё не вызван
  const isLayoutReady = viewportHeight > 0 && contentHeight > 0;
  const hasEnoughContent = !isLayoutReady || contentHeight > viewportHeight * 1.2;
  const shouldLiftList = hasReachedBottom && hasEnoughContent;


  // Анимируем translateY для поднятия списка вместе с клавиатурой
  // Теперь БЕЗ LayoutAnimation - вся анимация через Animated.Value
  // Логика:
  // - Если пользователь внизу (shouldLiftList=true): поднимаем список вверх на высоту клавиатуры
  // - Если пользователь НЕ внизу (shouldLiftList=false): не двигаем, сохраняем позицию
  const animatedTranslateY = keyboardHeightAnim.interpolate({
    inputRange: [0, 1000],
    outputRange: shouldLiftList ? [0, -1000] : [0, 0], // Поднимаем только если внизу
  });

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
    return <ChatEmptyMessages />;
  }

  // Обработчик изменения размера контента
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

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: listOpacity,
        // Теперь без LayoutAnimation - используем translateY для поднятия списка
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
        removeClippedSubviews={false}
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
          // firstUnreadIndex - это индекс самого СТАРОГО непрочитанного сообщения (где должен быть баннер)
          // ВАЖНО: Не показываем баннер если все непрочитанные - это только новые сообщения (initialUnreadCount === 0)
          // Это происходит когда пользователь был внизу чата и ему пришли новые сообщения с автоскроллом
          const shouldShowInlineBanner =
            index === firstUnreadIndex &&
            unreadCount >= 1 &&
            showUnreadBanner &&
            initialUnreadCount > 0; // Показываем только если при входе были непрочитанные

          return (
            <>
              {shouldShowInlineBanner && <UnreadMessagesBanner unreadCount={unreadCount} />}
              <MessageItem
                message={message}
                chatType={chatType}
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
              />
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
        removeClippedSubviews={false}
        // iOS-specific: предотвращает прыжки при загрузке старых сообщений
        maintainVisibleContentPosition={
          Platform.OS === 'ios'
            ? {
                minIndexForVisible: 0,
              }
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
          console.log('📍 ScrollToIndexFailed:', info.index, 'out of', messageListItems.length);

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
