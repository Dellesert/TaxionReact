import React from 'react';
import { View, StyleSheet, Animated, Platform, FlatList, ActivityIndicator } from 'react-native';
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
  firstNewMessageIndex: number;
  newMessagesCount: number;
  unreadCount: number;
  showUnreadBanner: boolean;
  initialUnreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  inputHeight: number;
  insetsBottom: number;
  keyboardHeightAnim: Animated.Value;
  keyboardHeight: number;
  hasReachedBottom: boolean;
  listRef: React.RefObject<any>;
  highlightedMessageId: number | null;
  initialScrollIndex?: number;
  scrollSessionKey: number;
  onContentSizeChange: (width: number, height: number) => void;
  onScroll: (event: any) => void;
  onViewableItemsChanged: any;
  viewabilityConfig: any;
  onLoadMore: () => void;
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
  isPositionReady?: boolean;
  searchQuery?: string;
}


// Мемоизированный компонент индикатора загрузки для пагинации
const LoadingFooter = React.memo(() => (
  <View style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}>
    <ActivityIndicator size="small" color="#8E8E93" />
  </View>
));

/**
 * Компонент списка сообщений в чате (версия с FlatList)
 *
 * ВАЖНО для inverted FlatList:
 * - Данные отображаются снизу вверх
 * - index 0 = самое новое сообщение (визуально внизу)
 * - scrollToOffset(0) = скролл к новым сообщениям (визуальный низ)
 * - scrollToEnd() = скролл к старым сообщениям (визуальный верх)
 */
export const MessageListComponentFlatList: React.FC<MessageListComponentProps> = ({
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
  isPositionReady = true,
  searchQuery,
}) => {
  useTheme(); // Хук используется для ре-рендера при смене темы
  const { scrollbarRef } = useCustomScrollbarStyle();

  // State to control list opacity - prevents showing partially rendered list
  const [listOpacity] = React.useState(new Animated.Value(0));
  const [hasRendered, setHasRendered] = React.useState(false);

  // Show list with fade-in after initial render is complete AND position is ready
  React.useEffect(() => {
    if (messageListItems.length > 0 && !hasRendered && isPositionReady) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setHasRendered(true);
          Animated.timing(listOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start();
        });
      });
    }
  }, [messageListItems.length, hasRendered, listOpacity, isPositionReady]);

  // Reset opacity when chat changes
  React.useEffect(() => {
    setHasRendered(false);
    listOpacity.setValue(0);
  }, [scrollSessionKey, listOpacity]);

  // Отслеживаем видимые элементы для ленивой загрузки изображений
  const [viewableIndices, setViewableIndices] = React.useState<Set<number>>(() => {
    const initial = new Set<number>();
    for (let i = 0; i < Math.min(10, messageListItems.length); i++) {
      initial.add(i);
    }
    return initial;
  });

  // Refs для callback'ов чтобы избежать пересоздания viewabilityConfigCallbackPairs
  const onViewableItemsChangedRef = React.useRef(onViewableItemsChanged);
  const setViewableIndicesRef = React.useRef(setViewableIndices);

  // Обновляем refs при изменении
  React.useEffect(() => {
    onViewableItemsChangedRef.current = onViewableItemsChanged;
  }, [onViewableItemsChanged]);

  React.useEffect(() => {
    setViewableIndicesRef.current = setViewableIndices;
  }, []);

  // viewabilityConfigCallbackPairs для FlatList - должен быть стабильным!
  // FlatList не поддерживает изменение этого пропа на лету
  const viewabilityConfigCallbackPairs = React.useRef([
    {
      viewabilityConfig: { viewAreaCoveragePercentThreshold: 50 },
      onViewableItemsChanged: (info: any) => {
        // Вызываем внешний callback через ref
        onViewableItemsChangedRef.current?.(info);

        // Обновляем локальный state через ref
        const newViewableIndices = new Set<number>();
        info.viewableItems.forEach((item: any) => {
          if (item.index !== null && item.index !== undefined) {
            const idx = item.index;
            for (let offset = -3; offset <= 3; offset++) {
              newViewableIndices.add(idx + offset);
            }
          }
        });
        setViewableIndicesRef.current(newViewableIndices);
      },
    },
  ]).current;

  const showSkeletons = isLoading && messageListItems.length === 0;
  const showEmptyState = !isLoading && messageListItems.length === 0;

  // Для inverted FlatList padding работает наоборот:
  // - paddingTop в contentContainerStyle = отступ снизу (от инпута)
  // - paddingBottom в contentContainerStyle = отступ сверху (от старых сообщений)
  const bottomPaddingForInput = Platform.OS === 'web'
    ? 20
    : inputHeight + insetsBottom + 20;

  // Состояние для расчёта подъёма на Android
  const [contentHeight, setContentHeight] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);

  const handleContentSizeChangeInternal = React.useCallback((width: number, height: number) => {
    setContentHeight(height);
    onContentSizeChange(width, height);
  }, [onContentSizeChange]);

  const handleLayout = React.useCallback((event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setViewportHeight(height);
    }
  }, []);

  const isLayoutReady = viewportHeight > 0 && contentHeight > 0;

  // Логика подъёма списка при появлении клавиатуры
  // На iOS не используем translateY - используем contentInset
  const animatedTranslateY = React.useMemo(() => {
    if (Platform.OS === 'ios') {
      return 0;
    }

    // На Android: используем логику с учётом размера контента
    // Поднимаем только если контент больше viewport и пользователь внизу
    if (!isLayoutReady) {
      return keyboardHeightAnim.interpolate({
        inputRange: [0, 1000],
        outputRange: hasReachedBottom ? [0, -1000] : [0, 0],
      });
    }

    if (contentHeight >= viewportHeight) {
      return keyboardHeightAnim.interpolate({
        inputRange: [0, 1000],
        outputRange: hasReachedBottom ? [0, -1000] : [0, 0],
      });
    }

    // Контента меньше чем viewport - рассчитываем частичный подъём
    const freeSpaceAboveMessages = viewportHeight - contentHeight;

    if (keyboardHeight <= freeSpaceAboveMessages) {
      return keyboardHeightAnim.interpolate({
        inputRange: [0, 1000],
        outputRange: [0, 0],
      });
    }

    const overlap = keyboardHeight - freeSpaceAboveMessages;
    const liftRatio = overlap / keyboardHeight;

    return keyboardHeightAnim.interpolate({
      inputRange: [0, 1000],
      outputRange: [0, -1000 * liftRatio],
    });
  }, [keyboardHeightAnim, isLayoutReady, contentHeight, viewportHeight, keyboardHeight, hasReachedBottom]);

  // Рендер элемента списка
  const renderItem = React.useCallback(({ item, index }: { item: MessageListItem; index: number }) => {
    if (item.type === 'date') {
      return <DateSeparator date={item.data} />;
    }

    const message = item.data;

    const shouldShowUnreadBanner =
      index === firstUnreadIndex &&
      unreadCount >= 1 &&
      showUnreadBanner;

    const shouldShowNewMessageBanner =
      index === firstNewMessageIndex &&
      firstNewMessageIndex !== -1 &&
      firstNewMessageIndex !== firstUnreadIndex &&
      newMessagesCount > 0;

    // В inverted FlatList порядок рендера в JSX обратный визуальному:
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
        />
        {shouldShowNewMessageBanner && <UnreadMessagesBanner unreadCount={newMessagesCount} />}
        {shouldShowUnreadBanner && <UnreadMessagesBanner unreadCount={unreadCount} />}
      </>
    );
  }, [
    firstUnreadIndex,
    firstNewMessageIndex,
    newMessagesCount,
    unreadCount,
    showUnreadBanner,
    chatType,
    highlightedMessageId,
    userRole,
    selectionMode,
    selectedMessages,
    viewableIndices,
    searchQuery,
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
    onEnterSelectionMode,
    onToggleMessageSelection,
  ]);

  const keyExtractor = React.useCallback((item: MessageListItem, index: number) =>
    item.type === 'date' ? `date-${index}` : `message-${item.data.id}`,
  []);

  // ВАЖНО: getItemLayout УБРАН намеренно!
  // С getItemLayout scrollToIndex использует приблизительные размеры (80px),
  // что приводит к неточному позиционированию при скролле к закреплённым сообщениям.
  // Без getItemLayout FlatList использует реальные измеренные размеры элементов,
  // что даёт точное позиционирование. Минус - scrollToIndex работает только
  // для уже отрендеренных элементов, но onScrollToIndexFailed обрабатывает это.

  // Флаг готовности списка - защита от преждевременного onEndReached
  const isListReady = React.useRef(false);
  const lastLoadMoreTime = React.useRef(0);

  // Вызываем onFlashListLoad при монтировании для совместимости с useChatScroll
  React.useEffect(() => {
    // Небольшая задержка для завершения первичного layout
    const timer = setTimeout(() => {
      isListReady.current = true;
      onFlashListLoad?.();
    }, 150);
    return () => clearTimeout(timer);
  }, [onFlashListLoad]);

  // Сбрасываем флаг при смене чата
  React.useEffect(() => {
    isListReady.current = false;
    lastLoadMoreTime.current = 0;
  }, [scrollSessionKey]);

  // Защищённый onLoadMore с минимальным debounce для плавной пагинации
  const handleLoadMoreSafe = React.useCallback(() => {
    const now = Date.now();

    // Игнорируем вызовы до готовности списка
    if (!isListReady.current) {
      return;
    }

    // Debounce: минимум 300ms между вызовами (достаточно для предотвращения дублей,
    // но не мешает плавной пагинации)
    if (now - lastLoadMoreTime.current < 300) {
      return;
    }

    lastLoadMoreTime.current = now;
    onLoadMore();
  }, [onLoadMore]);

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
    <View ref={scrollbarRef} style={{ flex: 1, overflow: 'hidden' }}>
      <Animated.View
        style={{
          flex: 1,
          opacity: listOpacity,
          transform: [{ translateY: animatedTranslateY }],
        }}
        onLayout={handleLayout}
      >
        <FlatList
          key={`chat-${chatId}-session-${scrollSessionKey}`}
          ref={listRef}
          data={messageListItems}
          extraData={messagesKey}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          inverted={true}
          // Оптимизация рендеринга
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={15}
          updateCellsBatchingPeriod={50}
          windowSize={21}
          initialNumToRender={20}
          // getItemLayout УБРАН - см. комментарий выше
          // Стили контейнера
          // Для inverted FlatList: paddingTop = визуальный низ (отступ от инпута)
          contentContainerStyle={[
            styles.messagesList,
            { paddingTop: bottomPaddingForInput },
          ]}
          // На iOS используем contentInset для обработки клавиатуры
          // Для inverted FlatList: top = визуальный низ
          {...(Platform.OS === 'ios' && {
            contentInset: { top: keyboardHeight },
            contentOffset: { x: 0, y: -keyboardHeight },
          })}
          // Поведение клавиатуры
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // maintainVisibleContentPosition предотвращает прыжки при загрузке старых сообщений
          // Работает на iOS и Android (React Native 0.72+)
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          // Callbacks
          onContentSizeChange={handleContentSizeChangeInternal}
          onScroll={onScroll}
          scrollEventThrottle={16}
          // viewabilityConfigCallbackPairs вместо отдельных пропсов
          // (избегаем warning о изменении onViewableItemsChanged на лету)
          viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs}
          // Пагинация: onEndReached срабатывает при достижении конца данных
          // Для inverted FlatList "конец" = визуальный верх (старые сообщения)
          // Используем высокий threshold (0.5) для упредительной загрузки
          onEndReached={handleLoadMoreSafe}
          onEndReachedThreshold={0.5}
          // Обработка ошибок scrollToIndex
          onScrollToIndexFailed={(info) => {
            // Fallback: скроллим к ближайшему измеренному элементу, затем повторяем
            const wait = new Promise((resolve) => setTimeout(resolve, 100));
            wait.then(() => {
              if (listRef.current && info.index < messageListItems.length) {
                // Сначала скроллим к измеренному элементу без анимации
                if (info.highestMeasuredFrameIndex > 0) {
                  listRef.current.scrollToIndex({
                    index: Math.min(info.index, info.highestMeasuredFrameIndex),
                    animated: false,
                  });
                }

                // Затем пробуем снова скроллить к целевому элементу
                setTimeout(() => {
                  listRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.5,
                  });
                }, 100);
              }
            });
          }}
          // Footer показывает индикатор загрузки при пагинации
          // Для inverted FlatList Footer отображается вверху (перед старыми сообщениями)
          ListFooterComponent={isLoadingMore ? LoadingFooter : null}
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
    // Для inverted FlatList: paddingBottom = визуальный верх (отступ перед старыми сообщениями)
    paddingBottom: 20,
  },
});
