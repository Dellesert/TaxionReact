import React from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MessageItem } from './MessageItem';
import { DateSeparator } from './DateSeparator';
import { UnreadMessagesBanner } from './UnreadMessagesBanner';
import { MessageSkeleton } from './MessageSkeleton';
import { ChatEmptyMessages } from './ChatEmptyMessages';
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
}) => {
  const { theme } = useTheme();

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

  // Вместо анимации padding - анимируем translateY всего списка
  const animatedTranslateY = keyboardHeightAnim.interpolate({
    inputRange: [0, 1000],
    outputRange: [0, -1000], // Двигаем список вверх на высоту клавиатуры
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

  return (
    <Animated.View style={{ flex: 1, transform: [{ translateY: animatedTranslateY }] }}>
      {/* @ts-ignore - FlashList типы могут быть устаревшими */}
      <FlashList
        key={`chat-${chatId}-session-${scrollSessionKey}`}
        ref={listRef}
        data={messageListItems}
        extraData={messagesKey}
        drawDistance={Platform.OS === 'ios' ? 500 : 500}
        initialScrollIndex={initialScrollIndex}
        estimatedItemSize={150}
        getItemType={getItemType}
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
        onContentSizeChange={onContentSizeChange}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollToIndexFailed={(info: any) => {
          const averageHeight = info.averageItemLength || 100;
          const offset = averageHeight * info.index;
          listRef.current?.scrollToOffset({ offset, animated: false });

          setTimeout(() => {
            if (info.index < messageListItems.length) {
              listRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
                viewPosition: 0.2,
              });
            }
          }, 300);
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
