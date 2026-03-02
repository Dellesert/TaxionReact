/**
 * ThreadScreen
 * Экран комментариев к посту в канале (тред)
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Animated, Keyboard, Platform, Dimensions } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming } from 'react-native-reanimated';
import RNAnimated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@shared/hooks/useTheme';
import { ChatStackParamList } from '@navigation/types';
import { Message } from '../types/chat.types';
import { getThreadMessages } from '../api/chat.api';
import * as chatApi from '../api/chat.api';
import { MessageBubble } from '../components/messages/MessageBubble';
import { MessageInput } from '../components/messages/MessageInput';
import { MessageContextMenu } from '../components/modals/MessageContextMenu';
import { MediaViewer, MediaItem } from '../components/modals/MediaViewer';
import { useAuthStore } from '@shared/store/authStore';
import { useChatStore } from '@shared/store/chatStore';
import { Avatar } from '@shared/components/common/Avatar';
import { isImageFile, isVideoFile } from '../utils/message.utils';
import { useImageLoader } from '@shared/hooks/useImageLoader';

function getCommentsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'комментарий';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'комментария';
  return 'комментариев';
}

type ThreadScreenProps = {
  chatId?: number;
  messageId?: number;
  chatName?: string;
  onBack?: () => void;
};

const ThreadScreen: React.FC<ThreadScreenProps> = (props) => {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<ChatStackParamList>>();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const routeParams = (route.params || {}) as Partial<ThreadScreenProps>;
  const chatId = props.chatId ?? routeParams.chatId!;
  const messageId = props.messageId ?? routeParams.messageId!;
  const chatName = props.chatName ?? routeParams.chatName;
  const handleBack = props.onBack ?? (() => navigation.goBack());

  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id;

  // Store-based thread messages for real-time WS updates
  const storeThreadMessages = useChatStore((s) => s.threadMessages[messageId]);
  const setThreadMessages = useChatStore((s) => s.setThreadMessages);
  const clearThreadMessages = useChatStore((s) => s.clearThreadMessages);
  const addReaction = useChatStore((s) => s.addReaction);
  const removeReaction = useChatStore((s) => s.removeReaction);

  const [rootMessage, setRootMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  // Context menu state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Reaction animation
  const [animatedEmoji, setAnimatedEmoji] = useState('👍');
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));
  const [animatingMessageId, setAnimatingMessageId] = useState<number | null>(null);

  // Comments derived from store (updated by both API loads and WS events)
  const comments = storeThreadMessages || [];

  // Root message media data
  const rootImageUrls = useImageLoader(rootMessage?.attachments);
  const rootMediaItems: MediaItem[] = useMemo(() => {
    if (!rootMessage?.attachments || rootMessage.attachments.length === 0) return [];
    return rootMessage.attachments
      .filter(att => {
        const mt = att.mime_type || att.file_type || '';
        return isImageFile(mt) || isVideoFile(mt);
      })
      .map(att => {
        const mt = att.mime_type || att.file_type || '';
        return {
          type: isVideoFile(mt) ? 'video' as const : 'image' as const,
          url: att.file_url,
          thumbnailUrl: att.thumbnail_url ? att.thumbnail_url : undefined,
          thumbnailLargeUrl: att.thumbnail_large_url ? att.thumbnail_large_url : undefined,
          attachmentId: att.id,
          duration: att.duration,
        };
      });
  }, [rootMessage?.attachments]);

  const flatListRef = useRef<FlatList>(null);
  const isNearBottom = useRef(false);
  const scrollOffset = useRef(0);
  const isPaginationLoad = useRef(false);
  const rootMessageBubbleRef = useRef<View>(null);

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

        // Lift content by keyboard height only if user is at the bottom
        if (isNearBottom.current) {
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: scrollOffset.current + height,
              animated: true,
            });
          }, 150);
        }
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

  // Load thread messages (first page — oldest 25 comments)
  const loadThread = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getThreadMessages(chatId, messageId, { limit: 25 });
      setRootMessage(response.root_message || null);
      setThreadMessages(messageId, response.messages || []);
      setTotalCount(response.total || 0);
      setHasMore(response.has_more);
    } catch (error) {
      console.error('Failed to load thread:', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, messageId, setThreadMessages]);

  // Load more (newer) comments — forward pagination by scrolling down
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || comments.length === 0) return;

    try {
      setIsLoadingMore(true);
      const newestId = comments[comments.length - 1]?.id;
      if (!newestId) return;

      const response = await getThreadMessages(chatId, messageId, {
        limit: 25,
        after: newestId,
      });

      const newMessages = response.messages || [];
      if (newMessages.length === 0) {
        setHasMore(false);
      } else {
        isPaginationLoad.current = true;
        setThreadMessages(messageId, [...comments, ...newMessages]);
        setHasMore(response.has_more);
        setTotalCount(response.total || 0);
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

  // Sync root message reactions from store (WS updates land in messages[chatId])
  const storeMessages = useChatStore((s) => s.messages[chatId]);
  useEffect(() => {
    if (!rootMessage || !storeMessages) return;
    const storeRoot = storeMessages.find(m => m.id === rootMessage.id);
    if (storeRoot && storeRoot.reactions !== rootMessage.reactions) {
      setRootMessage(prev => prev ? { ...prev, reactions: storeRoot.reactions } : prev);
    }
  }, [storeMessages, rootMessage?.id]);

  // Auto-scroll when new WS comment arrives (skip initial load)
  const prevCommentsLength = useRef(comments.length);
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) {
      if (comments.length > 0) {
        initialLoadDone.current = true;
      }
      prevCommentsLength.current = comments.length;
      return;
    }
    if (comments.length > prevCommentsLength.current) {
      if (isPaginationLoad.current) {
        isPaginationLoad.current = false;
      } else if (isNearBottom.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    }
    prevCommentsLength.current = comments.length;
  }, [comments.length]);

  // Send comment in thread — WS will append the new message via handleNewThreadMessage
  const handleSend = useCallback(async (content: string) => {
    try {
      await chatApi.sendMessage(chatId, {
        content,
        thread_root_id: messageId,
      });
      setTotalCount(prev => prev + 1);

      // If not all comments were loaded (user didn't scroll through all pages),
      // load remaining pages so the list is complete before scrolling to the new message
      if (hasMore) {
        const currentComments = useChatStore.getState().threadMessages[messageId] || [];
        let lastId = currentComments[currentComments.length - 1]?.id;
        let additionalMessages: Message[] = [];
        let moreToLoad = true;

        while (moreToLoad && lastId) {
          const response = await getThreadMessages(chatId, messageId, {
            limit: 100,
            after: lastId,
          });
          const newMsgs = response.messages || [];
          if (newMsgs.length === 0) break;
          additionalMessages = [...additionalMessages, ...newMsgs];
          lastId = newMsgs[newMsgs.length - 1]?.id;
          moreToLoad = response.has_more;
          setTotalCount(response.total || 0);
        }

        if (additionalMessages.length > 0) {
          // Re-read store to include any WS-delivered message that arrived in the meantime
          const latestComments = useChatStore.getState().threadMessages[messageId] || [];
          const existingIds = new Set(latestComments.map(m => m.id));
          const merged = [...latestComments];
          for (const msg of additionalMessages) {
            if (!existingIds.has(msg.id)) {
              merged.push(msg);
              existingIds.add(msg.id);
            }
          }
          merged.sort((a, b) => a.id - b.id);
          setThreadMessages(messageId, merged);
        }
        setHasMore(false);
      }

      // Scroll to bottom after WS delivers the message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (error) {
      console.error('Failed to send thread message:', error);
    }
  }, [chatId, messageId, hasMore, setThreadMessages]);

  // --- Reaction handlers (mirrored from MessageItem.tsx) ---

  const messageBubbleRefs = useRef<Record<number, View | null>>({});

  const handleToggleReaction = useCallback((msgId: number, emoji: string) => {
    if (!currentUserId) return;
    const msg = comments.find(m => m.id === msgId);
    const hasReacted = msg?.reactions?.some(r => r.emoji === emoji && r.user_id === currentUserId);
    if (hasReacted) {
      removeReaction(msgId, emoji);
    } else {
      addReaction(msgId, emoji);
      // Animate
      setAnimatedEmoji(emoji);
      setAnimatingMessageId(msgId);
      heartScale.value = 0;
      heartOpacity.value = 1;
      heartScale.value = withSpring(1, { damping: 8, stiffness: 200 });
      heartOpacity.value = withDelay(400, withTiming(0, { duration: 300 }));
    }
  }, [comments, currentUserId, addReaction, removeReaction, heartScale, heartOpacity]);

  const handleDoubleTap = useCallback((msgId: number) => {
    const msg = comments.find(m => m.id === msgId);
    if (msg?.is_deleted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleToggleReaction(msgId, '👍');
  }, [comments, handleToggleReaction]);

  const handleLongPress = useCallback((msgId: number) => {
    const msg = comments.find(m => m.id === msgId);
    if (!msg) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ref = messageBubbleRefs.current[msgId];
    if (ref) {
      ref.measureInWindow((_x, y, _width, _height) => {
        const screenWidth = Dimensions.get('window').width;
        const screenHeight = Dimensions.get('window').height;
        const menuWidth = 260;
        const menuHeight = 510;
        const edgePadding = 10;
        const minTopMargin = 160;
        const minBottomMargin = 20;
        const isOwn = msg.sender_id === currentUserId;

        let left = isOwn ? screenWidth - menuWidth - edgePadding : edgePadding;
        if (left + menuWidth > screenWidth - edgePadding) {
          left = screenWidth - menuWidth - edgePadding;
        }
        if (left < edgePadding) {
          left = edgePadding;
        }
        const messageVisibleTop = Math.max(y, minTopMargin);
        let top = messageVisibleTop;
        if (top + menuHeight > screenHeight - minBottomMargin) {
          if (messageVisibleTop - menuHeight >= minTopMargin) {
            top = messageVisibleTop - menuHeight;
          } else {
            top = Math.max(minTopMargin, screenHeight - menuHeight - minBottomMargin);
          }
        }
        top = Math.max(minTopMargin, Math.min(top, screenHeight - menuHeight - minBottomMargin));

        setMenuPosition({ top, left });
        setSelectedMessage(msg);
        setShowContextMenu(true);
      });
    }
  }, [comments, currentUserId]);

  const handleRightClick = useCallback((msgId: number, position: { x: number; y: number }) => {
    const msg = comments.find(m => m.id === msgId);
    if (!msg) return;
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const menuWidth = 260;
    const menuHeight = 510;
    const edgePadding = 10;

    let left = position.x;
    let top = position.y;
    if (left + menuWidth > screenWidth - edgePadding) left = screenWidth - menuWidth - edgePadding;
    if (top + menuHeight > screenHeight - 20) top = screenHeight - menuHeight - 20;
    top = Math.max(20, top);
    left = Math.max(edgePadding, left);

    setMenuPosition({ top, left });
    setSelectedMessage(msg);
    setShowContextMenu(true);
  }, [comments]);

  // --- Root message handlers (reactions, media, context menu) ---

  const handleRootToggleReaction = useCallback((emoji: string) => {
    if (!currentUserId || !rootMessage) return;
    const hasReacted = rootMessage.reactions?.some(
      r => r.emoji === emoji && r.user_id === currentUserId
    );
    if (hasReacted) {
      removeReaction(rootMessage.id, emoji);
      setRootMessage(prev => prev ? {
        ...prev,
        reactions: (prev.reactions || []).filter(r => !(r.emoji === emoji && r.user_id === currentUserId))
      } : prev);
    } else {
      addReaction(rootMessage.id, emoji);
      setRootMessage(prev => prev ? {
        ...prev,
        reactions: [...(prev.reactions || []), {
          id: Date.now(),
          message_id: prev.id,
          user_id: currentUserId!,
          user: currentUser || undefined,
          emoji,
          created_at: new Date().toISOString(),
        } as any]
      } : prev);
      setAnimatedEmoji(emoji);
      setAnimatingMessageId(rootMessage.id);
      heartScale.value = 0;
      heartOpacity.value = 1;
      heartScale.value = withSpring(1, { damping: 8, stiffness: 200 });
      heartOpacity.value = withDelay(400, withTiming(0, { duration: 300 }));
    }
  }, [rootMessage, currentUserId, currentUser, addReaction, removeReaction, heartScale, heartOpacity]);

  const handleRootDoubleTap = useCallback(() => {
    if (!rootMessage || rootMessage.is_deleted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleRootToggleReaction('👍');
  }, [rootMessage, handleRootToggleReaction]);

  const handleRootLongPress = useCallback(() => {
    if (!rootMessage) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ref = rootMessageBubbleRef.current;
    if (ref) {
      ref.measureInWindow((_x: number, y: number) => {
        const screenHeight = Dimensions.get('window').height;
        const menuHeight = 510;
        const minTopMargin = 160;
        const minBottomMargin = 20;
        const left = 20;
        const messageVisibleTop = Math.max(y, minTopMargin);
        let top = messageVisibleTop;
        if (top + menuHeight > screenHeight - minBottomMargin) {
          if (messageVisibleTop - menuHeight >= minTopMargin) {
            top = messageVisibleTop - menuHeight;
          } else {
            top = Math.max(minTopMargin, screenHeight - menuHeight - minBottomMargin);
          }
        }
        top = Math.max(minTopMargin, Math.min(top, screenHeight - menuHeight - minBottomMargin));
        setMenuPosition({ top, left });
        setSelectedMessage(rootMessage);
        setShowContextMenu(true);
      });
    }
  }, [rootMessage]);

  const handleRootRightClick = useCallback((position: { x: number; y: number }) => {
    if (!rootMessage) return;
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const menuWidth = 260;
    const menuHeight = 510;
    const edgePadding = 10;
    let left = position.x;
    let top = position.y;
    if (left + menuWidth > screenWidth - edgePadding) left = screenWidth - menuWidth - edgePadding;
    if (top + menuHeight > screenHeight - 20) top = screenHeight - menuHeight - 20;
    top = Math.max(20, top);
    left = Math.max(edgePadding, left);
    setMenuPosition({ top, left });
    setSelectedMessage(rootMessage);
    setShowContextMenu(true);
  }, [rootMessage]);

  const handleRootImagePress = useCallback((imageUrl: string) => {
    const index = rootMediaItems.findIndex(item => item.url === imageUrl);
    setSelectedMediaIndex(index >= 0 ? index : 0);
    setShowMediaViewer(true);
  }, [rootMediaItems]);

  const handleRootVideoPress = useCallback((videoUrl: string, _thumbnailUrl?: string) => {
    const index = rootMediaItems.findIndex(item => item.url === videoUrl);
    setSelectedMediaIndex(index >= 0 ? index : 0);
    setShowMediaViewer(true);
  }, [rootMediaItems]);

  // Render list header: root message (post) + "Начало обсуждения" divider
  const renderListHeader = () => {
    return (
      <View>
        {/* Root message (post) */}
        {rootMessage && (
          <View style={[styles.rootMessageContainer, { borderBottomColor: theme.border }]}>
            <View style={styles.rootMessageHeader}>
              <Text style={[styles.rootMessageLabel, { color: theme.textSecondary }]}>
                Пост в канале
              </Text>
            </View>

            {/* Root message rendered as MessageBubble (like in regular chat) */}
            <View style={styles.rootBubbleRow}>
              <Avatar
                imageUrl={rootMessage.sender?.avatar}
                thumbnailUrl={rootMessage.sender?.avatar_thumbnail}
                name={rootMessage.sender?.name || `User ${rootMessage.sender_id}`}
                size={28}
                userId={rootMessage.sender?.id}
                style={styles.rootBubbleAvatar}
              />
              <View
                ref={rootMessageBubbleRef}
                style={[styles.rootBubbleWrapper, { position: 'relative' as const }]}
              >
                <MessageBubble
                  message={rootMessage}
                  isOwnMessage={false}
                  isHighlighted={false}
                  sender={rootMessage.sender ?? null}
                  replySender={rootMessage.reply_to?.sender ?? null}
                  imageUrls={rootImageUrls}
                  currentUserId={currentUserId}
                  onImagePress={handleRootImagePress}
                  onVideoPress={handleRootVideoPress}
                  onReactionPress={handleRootToggleReaction}
                  onLongPress={Platform.OS === 'web' ? undefined : handleRootLongPress}
                  onRightClick={handleRootRightClick}
                  onDoubleTap={handleRootDoubleTap}
                  isChannel={false}
                />
                {/* Reaction animation overlay */}
                {animatingMessageId === rootMessage.id && (
                  <RNAnimated.View
                    pointerEvents="none"
                    style={[styles.heartOverlay, heartAnimStyle]}
                  >
                    <Text style={styles.heartEmoji}>{animatedEmoji}</Text>
                  </RNAnimated.View>
                )}
              </View>
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

      </View>
    );
  };

  // Render footer: loading indicator when fetching next page
  const renderListFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 12 }} />
    );
  };

  // Render comment item
  const renderComment = useCallback(({ item }: { item: Message }) => {
    const isOwn = item.sender_id === currentUserId;
    const msgId = item.id;

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
        <View
          ref={(node) => { messageBubbleRefs.current[msgId] = node; }}
          style={[styles.commentItem, isOwn && styles.commentItemOwn, { position: 'relative' }]}
        >
          <MessageBubble
            message={item}
            isOwnMessage={isOwn}
            isHighlighted={false}
            sender={item.sender ?? null}
            replySender={null}
            imageUrls={[]}
            currentUserId={currentUserId}
            onImagePress={() => {}}
            onReactionPress={(emoji) => handleToggleReaction(msgId, emoji)}
            onLongPress={Platform.OS === 'web' ? undefined : () => handleLongPress(msgId)}
            onRightClick={(position) => handleRightClick(msgId, position)}
            onDoubleTap={() => handleDoubleTap(msgId)}
          />
          {/* Reaction animation overlay */}
          {animatingMessageId === msgId && (
            <RNAnimated.View
              pointerEvents="none"
              style={[styles.heartOverlay, heartAnimStyle]}
            >
              <Text style={styles.heartEmoji}>{animatedEmoji}</Text>
            </RNAnimated.View>
          )}
        </View>
      </View>
    );
  }, [currentUserId, handleToggleReaction, handleDoubleTap, handleLongPress, handleRightClick, animatingMessageId, animatedEmoji, heartAnimStyle]);

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
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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
          onScroll={(e) => {
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            scrollOffset.current = contentOffset.y;
            const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
            isNearBottom.current = distanceFromBottom < 150;
          }}
          scrollEventThrottle={100}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
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

      {/* Context menu for reactions */}
      {selectedMessage && (
        <MessageContextMenu
          visible={showContextMenu}
          message={selectedMessage}
          menuPosition={menuPosition}
          isOwnMessage={selectedMessage.sender_id === currentUserId}
          isAdmin={false}
          isForwardedMessage={false}
          chatType="channel"
          onClose={() => {
            setShowContextMenu(false);
            setSelectedMessage(null);
          }}
          onReaction={(emoji) => {
            if (selectedMessage.id === rootMessage?.id) {
              handleRootToggleReaction(emoji);
            } else {
              handleToggleReaction(selectedMessage.id, emoji);
            }
          }}
          currentUserId={currentUserId}
        />
      )}

      {/* MediaViewer for root message media */}
      <MediaViewer
        visible={showMediaViewer}
        mediaItems={rootMediaItems}
        initialIndex={selectedMediaIndex}
        onClose={() => {
          setShowMediaViewer(false);
          setSelectedMediaIndex(0);
        }}
      />
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
  rootBubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 8,
  },
  rootBubbleAvatar: {
    marginRight: 8,
  },
  rootBubbleWrapper: {
    maxWidth: '80%',
    flexShrink: 1,
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
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartEmoji: {
    fontSize: 48,
  },
});

export default ThreadScreen;
