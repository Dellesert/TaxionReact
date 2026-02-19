/**
 * ThreadScreen
 * Экран комментариев к посту в канале (тред)
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Animated, Keyboard, Platform } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ChatStackParamList } from '@navigation/types';
import { Message } from '../types/chat.types';
import { getThreadMessages } from '../api/chat.api';
import * as chatApi from '../api/chat.api';
import { MessageBubble } from '../components/messages/MessageBubble';
import { MessageInput } from '../components/messages/MessageInput';
import { useAuthStore } from '@shared/store/authStore';
import { useChatStore } from '@shared/store/chatStore';
import { Avatar } from '@shared/components/common/Avatar';
import { formatTime } from '../utils/message.utils';

function getCommentsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'комментарий';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'комментария';
  return 'комментариев';
}

type ThreadScreenRouteProp = {
  chatId: number;
  messageId: number;
  chatName?: string;
};

const ThreadScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<ChatStackParamList>>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = route.params as ThreadScreenRouteProp;
  const { chatId, messageId, chatName } = params;

  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id;

  // Store-based thread messages for real-time WS updates
  const storeThreadMessages = useChatStore((s) => s.threadMessages[messageId]);
  const setThreadMessages = useChatStore((s) => s.setThreadMessages);
  const clearThreadMessages = useChatStore((s) => s.clearThreadMessages);

  const [rootMessage, setRootMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isPostExpanded, setIsPostExpanded] = useState(false);
  const [isPostTruncated, setIsPostTruncated] = useState(false);

  // Comments derived from store (updated by both API loads and WS events)
  const comments = storeThreadMessages || [];

  const flatListRef = useRef<FlatList>(null);

  // Keyboard state — same approach as ChatScreen
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const height = event.endCoordinates.height;
        setKeyboardHeight(height);
        Animated.timing(keyboardHeightAnim, {
          toValue: height,
          duration: Platform.OS === 'ios' ? 200 : 120,
          useNativeDriver: true,
        }).start();

        // Scroll to bottom so latest comments stay visible
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 150);
      }
    );

    const keyboardHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        Animated.timing(keyboardHeightAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 200 : 120,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [keyboardHeightAnim]);

  // На iOS высота клавиатуры уже включает home indicator
  const isKeyboardVisible = keyboardHeight > 0;
  const effectiveInsetsBottom = (Platform.OS === 'ios' && isKeyboardVisible) ? 0 : insets.bottom;

  const inputWrapperHeight = useMemo(() => {
    return 72 + effectiveInsetsBottom;
  }, [effectiveInsetsBottom]);

  const inputWrapperAnimatedStyle = useMemo(() => {
    return {
      transform: [
        {
          translateY: keyboardHeightAnim.interpolate({
            inputRange: [0, 1000],
            outputRange: [0, -1000],
          }),
        },
      ],
    };
  }, [keyboardHeightAnim]);

  // Load thread messages
  const loadThread = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getThreadMessages(chatId, messageId, { limit: 30 });
      setRootMessage(response.root_message || null);
      setThreadMessages(messageId, response.messages || []);
      setTotalCount(response.total || 0);
      setHasMore((response.messages || []).length < (response.total || 0));
    } catch (error) {
      console.error('Failed to load thread:', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, messageId, setThreadMessages]);

  // Load more (older) comments
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || comments.length === 0) return;

    try {
      setIsLoadingMore(true);
      const oldestId = comments[0]?.id;
      if (!oldestId) return;

      const response = await getThreadMessages(chatId, messageId, {
        limit: 30,
        before: oldestId,
      });

      const newMessages = response.messages || [];
      if (newMessages.length === 0) {
        setHasMore(false);
      } else {
        setThreadMessages(messageId, [...newMessages, ...comments]);
      }
    } catch (error) {
      console.error('Failed to load more thread messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, messageId, isLoadingMore, hasMore, comments, setThreadMessages]);

  useEffect(() => {
    loadThread();
    return () => {
      clearThreadMessages(messageId);
    };
  }, [loadThread, messageId, clearThreadMessages]);

  // Auto-scroll when new WS comment arrives
  const prevCommentsLength = useRef(comments.length);
  useEffect(() => {
    if (comments.length > prevCommentsLength.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    prevCommentsLength.current = comments.length;
  }, [comments.length]);

  // Send comment in thread
  const handleSend = useCallback(async (content: string) => {
    try {
      await chatApi.sendMessage(chatId, {
        content,
        thread_root_id: messageId,
      });

      // Reload thread to get the new message with full data
      const response = await getThreadMessages(chatId, messageId, { limit: 30 });
      setThreadMessages(messageId, response.messages || []);
      setTotalCount(response.total || 0);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send thread message:', error);
    }
  }, [chatId, messageId, setThreadMessages]);

  // Render list header: root message (post) + "Начало обсуждения" divider
  const renderListHeader = () => {
    return (
      <View>
        {/* Root message (post) */}
        {rootMessage && (
          <View style={[styles.rootMessageContainer, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
            <View style={styles.rootMessageHeader}>
              <Text style={[styles.rootMessageLabel, { color: theme.textSecondary }]}>
                Пост в канале
              </Text>
            </View>
            <View style={styles.rootMessageContent}>
              <View style={styles.rootSenderRow}>
                <Avatar
                  imageUrl={rootMessage.sender?.avatar}
                  thumbnailUrl={rootMessage.sender?.avatar_thumbnail}
                  name={rootMessage.sender?.name || `User ${rootMessage.sender_id}`}
                  size={28}
                  userId={rootMessage.sender?.id}
                />
                <Text style={[styles.rootSenderName, { color: theme.primary }]}>
                  {rootMessage.sender?.name || `User ${rootMessage.sender_id}`}
                </Text>
              </View>
              <Text
                style={[styles.rootMessageText, { color: theme.text }]}
                numberOfLines={isPostExpanded ? undefined : 10}
                onTextLayout={(e) => {
                  if (!isPostExpanded && e.nativeEvent.lines.length >= 10) {
                    setIsPostTruncated(true);
                  }
                }}
              >
                {rootMessage.content}
              </Text>
              {isPostTruncated && (
                <TouchableOpacity
                  onPress={() => setIsPostExpanded(prev => !prev)}
                  style={styles.expandButton}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.expandButtonText, { color: theme.primary }]}>
                    {isPostExpanded ? 'Скрыть' : 'Развернуть'}
                  </Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.rootMessageTime, { color: theme.textTertiary }]}>
                {formatTime(rootMessage.created_at)}
              </Text>
            </View>
            <View style={[styles.commentCountBar, { borderTopColor: theme.border }]}>
              <Ionicons name="chatbubble-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.commentCountText, { color: theme.textSecondary }]}>
                {totalCount} {getCommentsLabel(totalCount)}
              </Text>
            </View>
          </View>
        )}

        {/* Divider: Начало обсуждения */}
        <View style={styles.discussionDivider}>
          <View style={[styles.discussionDividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.discussionDividerText, { color: theme.textSecondary }]}>
            Начало обсуждения
          </Text>
          <View style={[styles.discussionDividerLine, { backgroundColor: theme.border }]} />
        </View>

        {/* Loading more indicator */}
        {isLoadingMore && (
          <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 8 }} />
        )}
      </View>
    );
  };

  // Render comment item
  const renderComment = useCallback(({ item }: { item: Message }) => {
    const isOwn = item.sender_id === currentUserId;

    return (
      <View style={[styles.commentRow, isOwn && styles.commentRowOwn]}>
        {!isOwn && (
          <Avatar
            imageUrl={item.sender?.avatar}
            thumbnailUrl={item.sender?.avatar_thumbnail}
            name={item.sender?.name || `User ${item.sender_id}`}
            size={28}
            userId={item.sender?.id}
            style={styles.commentAvatar}
          />
        )}
        <View style={[styles.commentItem, isOwn && styles.commentItemOwn]}>
          <MessageBubble
            message={item}
            isOwnMessage={isOwn}
            isHighlighted={false}
            sender={item.sender ?? null}
            replySender={null}
            imageUrls={[]}
            currentUserId={currentUserId}
            onImagePress={() => {}}
          />
        </View>
      </View>
    );
  }, [currentUserId]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const inputContent = (
    <MessageInput
      onSend={(content) => handleSend(content)}
      onTyping={() => {}}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            Обсуждение
          </Text>
          {chatName && (
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
              {chatName}
            </Text>
          )}
        </View>
      </View>

      {/* Comments list */}
      <View style={[styles.flex1, Platform.OS === 'web' && { marginBottom: inputWrapperHeight }]}>
        <FlatList
          ref={flatListRef}
          style={styles.flex1}
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderComment}
          contentContainerStyle={[
            styles.commentsList,
            {
              paddingBottom: inputWrapperHeight + (isKeyboardVisible ? keyboardHeight : 0) + 8,
            },
          ]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Нет комментариев. Будьте первым!
              </Text>
            </View>
          }
        />
      </View>

      {/* Input — platform-specific, same as ChatScreenContent */}
      {Platform.OS === 'ios' ? (
        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
          <View style={{ backgroundColor: theme.background, paddingBottom: insets.bottom }}>
            {inputContent}
          </View>
        </KeyboardStickyView>
      ) : (
        <Animated.View
          style={[
            styles.inputWrapper,
            { height: inputWrapperHeight },
            inputWrapperAnimatedStyle,
          ]}
        >
          <View
            style={[
              styles.inputWrapperInner,
              {
                paddingBottom: effectiveInsetsBottom,
                backgroundColor: theme.background,
              },
            ]}
          >
            {inputContent}
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  rootMessageContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rootMessageHeader: {
    marginBottom: 8,
  },
  rootMessageLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  rootMessageContent: {
    marginBottom: 8,
  },
  rootSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  rootSenderName: {
    fontSize: 14,
    fontWeight: '600',
  },
  rootMessageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  rootMessageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  commentCountBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  commentCountText: {
    fontSize: 13,
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
  },
  commentRowOwn: {
    justifyContent: 'flex-end',
  },
  commentAvatar: {
    marginRight: 8,
  },
  commentItem: {
    maxWidth: '80%',
    flexShrink: 1,
  },
  commentItemOwn: {
    marginLeft: 'auto',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  discussionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  discussionDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  discussionDividerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  inputWrapperInner: {
    flex: 1,
  },
  expandButton: {
    marginTop: 6,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ThreadScreen;
