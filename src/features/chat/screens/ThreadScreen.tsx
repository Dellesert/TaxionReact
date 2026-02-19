/**
 * ThreadScreen
 * Экран комментариев к посту в канале (тред)
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
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

  const [rootMessage, setRootMessage] = useState<Message | null>(null);
  const [comments, setComments] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  // Load thread messages
  const loadThread = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getThreadMessages(chatId, messageId, { limit: 30 });
      setRootMessage(response.root_message || null);
      setComments(response.messages || []);
      setTotalCount(response.total || 0);
      setHasMore((response.messages || []).length < (response.total || 0));
    } catch (error) {
      console.error('Failed to load thread:', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId, messageId]);

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
        setComments(prev => [...newMessages, ...prev]);
      }
    } catch (error) {
      console.error('Failed to load more thread messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, messageId, isLoadingMore, hasMore, comments]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  // Send comment in thread
  const handleSend = useCallback(async (content: string) => {
    try {
      await chatApi.sendMessage({
        chat_id: chatId,
        content,
        thread_root_id: messageId,
      });

      // Reload thread to get the new message
      const response = await getThreadMessages(chatId, messageId, { limit: 30 });
      setComments(response.messages || []);
      setTotalCount(response.total || 0);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Failed to send thread message:', error);
    }
  }, [chatId, messageId]);

  // Render root message (post)
  const renderRootMessage = () => {
    if (!rootMessage) return null;

    return (
      <View style={[styles.rootMessageContainer, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
        <View style={styles.rootMessageHeader}>
          <Text style={[styles.rootMessageLabel, { color: theme.textSecondary }]}>
            Пост в канале
          </Text>
        </View>
        <View style={styles.rootMessageContent}>
          <Text style={[styles.rootSenderName, { color: theme.primary }]}>
            {rootMessage.sender?.name || `User ${rootMessage.sender_id}`}
          </Text>
          <Text style={[styles.rootMessageText, { color: theme.text }]} numberOfLines={10}>
            {rootMessage.content}
          </Text>
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
    );
  };

  // Render comment item
  const renderComment = useCallback(({ item }: { item: Message }) => {
    const isOwn = item.sender_id === currentUserId;

    return (
      <View style={[styles.commentItem, isOwn && styles.commentItemOwn]}>
        <MessageBubble
          message={item}
          isOwnMessage={isOwn}
          isHighlighted={false}
          sender={item.sender}
          replySender={undefined}
          imageUrls={[]}
          currentUserId={currentUserId}
        />
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

      {/* Root message */}
      {renderRootMessage()}

      {/* Comments list */}
      <FlatList
        ref={flatListRef}
        data={comments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderComment}
        contentContainerStyle={[styles.commentsList, { paddingBottom: 8 }]}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          isLoadingMore ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 8 }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Нет комментариев. Будьте первым!
            </Text>
          </View>
        }
      />

      {/* Input */}
      <View style={{ paddingBottom: insets.bottom }}>
        <MessageInput
          onSend={(content) => handleSend(content)}
          onTyping={() => {}}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  rootSenderName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
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
  commentItem: {
    marginVertical: 4,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  commentItemOwn: {
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ThreadScreen;
