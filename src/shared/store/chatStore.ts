/**
 * Chat Store
 * Zustand store для управления чатами и сообщениями
 *
 * MMKV кэширование на native (iOS/Android):
 * - Чаты и сообщения загружаются мгновенно из кэша
 * - Фоновая синхронизация обновляет данные
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Chat, Message, TypingIndicator, MessageType } from '@/features/chat/types/chat.types';
import * as chatApi from '@/features/chat/api/chat.api';
import { getUser } from '@api/user.api';
import { isMockMode, mockGetChats, mockGetMessages } from '@shared/utils/mockData';
import { useAuthStore } from '@shared/store/authStore';
import { websocketService } from '@services/websocket.service';
import { getZustandChatStorage, isNative } from '@shared/storage';

// Tab data structure for caching
interface TabData {
  pinnedChats: Chat[];
  regularChats: Chat[];
  offset: number;
  hasMore: boolean;
  loaded: boolean;
}

type TabName = 'all' | 'private' | 'group' | 'favorite';

interface ChatState {
  chats: Chat[]; // Combined list for current tab (for compatibility)
  tabs: Record<TabName, TabData>;
  currentTab: TabName;
  totalChats: number;
  hasMoreChats: boolean;
  activeChat: Chat | null;
  messages: Record<number, Message[]>;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  typingUsers: Record<number, TypingIndicator[]>;
  totalUnreadCount: number;
  loadTabData: (tabName: TabName) => Promise<void>;
  loadMoreChats: () => Promise<void>;
  refreshCurrentTab: () => Promise<void>;
  switchTab: (tabName: TabName) => void;
  loadUnreadCount: () => Promise<void>;
  // Legacy support - keeping for backward compatibility but will use new tab logic
  loadChats: (append?: boolean, filters?: { type?: 'private' | 'group'; is_favorite?: boolean; is_pinned?: boolean }) => Promise<void>;
  createChat: (name: string, memberIds: number[], type?: 'private' | 'group') => Promise<Chat>;
  updateChat: (chatId: number, data: { name?: string; avatar?: string; description?: string }) => Promise<void>;
  deleteChat: (chatId: number, clearHistory?: boolean) => Promise<void>;
  leaveChat: (chatId: number) => Promise<void>;
  removeChatMember: (chatId: number, userId: number) => Promise<void>;
  loadMessages: (chatId: number) => Promise<void>;
  loadMoreMessages: (chatId: number, beforeMessageId: number) => Promise<number>;
  jumpToMessage: (chatId: number, messageId: number) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  sendMessage: (chatId: number, content: string, replyToId?: number, fileIds?: number[], extraData?: any) => Promise<void>;
  updateMessage: (messageId: number, content: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  deleteMessageForUser: (messageId: number, deleteFor: 'everyone' | 'me') => Promise<void>;
  clearChatHistory: (chatId: number) => Promise<void>;
  restoreMessage: (messageId: number) => Promise<void>;
  deletePermanentMessage: (messageId: number) => Promise<void>;
  pinMessage: (messageId: number) => Promise<void>;
  unpinMessage: (messageId: number) => Promise<void>;
  getPinnedMessages: (chatId: number) => Message[];
  addReaction: (messageId: number, emoji: string) => Promise<void>;
  removeReaction: (messageId: number, emoji: string) => Promise<void>;
  markMessageRead: (messageId: number) => Promise<void>;
  markChatAsRead: (chatId: number) => Promise<void>;
  pinChat: (chatId: number) => Promise<void>;
  unpinChat: (chatId: number) => Promise<void>;
  muteChat: (chatId: number) => Promise<void>;
  unmuteChat: (chatId: number) => Promise<void>;
  toggleFavorite: (chatId: number) => Promise<void>;
  handleNewMessage: (message: Message, isLatest?: boolean) => Promise<void>;
  handleMessageUpdate: (message: Message) => void;
  handleMessageDelete: (messageId: number, chatId: number) => void;
  handleChatDelete: (chatId: number) => void;
  handleTypingStart: (chatId: number, typing: TypingIndicator) => void;
  handleTypingStop: (chatId: number, userId: number) => void;
  handleUserJoin: (chatId: number, userId?: number) => void;
  handleUserLeave: (chatId: number, userId?: number) => void;
  handleUserPresence: (presence: any) => void;
  handleMessageRead: (chatId: number, messageId: number, userId?: number) => void;
  handleReaction: (chatId: number, messageId: number, emoji: string, userId?: number) => void;
  clearError: () => void;
  getChatById: (chatId: number) => Chat | undefined;
  /** Merge updated chats (for differential sync) */
  mergeChats: (chats: Chat[]) => void;
  /** Remove deleted chats by IDs (for differential sync) */
  removeChats: (chatIds: number[]) => void;
  set: (state: Partial<ChatState>) => void;
}

// Helper function to enrich chat with user data
const enrichChatWithUsers = async (chat: Chat): Promise<Chat> => {
  if (!chat.members || chat.members.length === 0) {
    return chat;
  }

  // Load user data for each member who doesn't have it
  const enrichedMembers = await Promise.all(
    chat.members.map(async (member) => {
      if (member.user) {
        return member; // Already has user data
      }

      try {
        const user = await getUser(member.user_id);
        return { ...member, user };
      } catch (error) {
        console.error(`Failed to load user ${member.user_id}:`, error);
        return member; // Return member without user data
      }
    })
  );

  return { ...chat, members: enrichedMembers };
};

// Initial tabs state (used for reset)
const initialTabsState: Record<TabName, TabData> = {
  all: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
  private: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
  group: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
  favorite: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      tabs: { ...initialTabsState },
      currentTab: 'all',
      totalChats: 0,
      hasMoreChats: true,
      activeChat: null,
      messages: {},
      isLoading: false,
      isLoadingMore: false,
      error: null,
      typingUsers: {},
      totalUnreadCount: 0,

      // Load data for a specific tab
      loadTabData: async (tabName: TabName) => {
    const { tabs, isLoading } = get();

    // Skip if already loaded or currently loading
    if (tabs[tabName].loaded || isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Determine filters based on tab
      const typeMap: Record<TabName, 'private' | 'group' | undefined> = {
        all: undefined,
        private: 'private',
        group: 'group',
        favorite: undefined,
      };

      const type = typeMap[tabName];
      const isFavorite = tabName === 'favorite';

      // 1. Load all pinned chats for this tab
      const pinnedResponse = await chatApi.getPinnedChats(type);
      let pinnedChats = pinnedResponse.chats;

      // Filter favorites if needed
      if (isFavorite) {
        pinnedChats = pinnedChats.filter(c => c.is_favorite);
      }

      // Enrich pinned chats with user data
      pinnedChats = await Promise.all(pinnedChats.map(enrichChatWithUsers));

      // 2. Load first page of regular chats
      const limit = 15;
      const filters: any = {};
      if (type) filters.type = type;
      if (isFavorite) filters.is_favorite = true;

      const regularResponse = await chatApi.getChats(limit, 0, Object.keys(filters).length > 0 ? filters : undefined);

      // Filter out pinned chats from regular chats
      const pinnedIds = new Set(pinnedChats.map(c => c.id));
      let regularChats = regularResponse.chats.filter(c => !pinnedIds.has(c.id));

      // Enrich regular chats with user data
      regularChats = await Promise.all(regularChats.map(enrichChatWithUsers));

      // Update tab data
      set(state => {
        // Только обновляем currentTab, chats и hasMoreChats если загружаем текущий активный таб
        const isCurrentTab = state.currentTab === tabName;

        const updates: any = {
          tabs: {
            ...state.tabs,
            [tabName]: {
              pinnedChats,
              regularChats,
              offset: limit,
              hasMore: regularResponse.hasMore,
              loaded: true,
            }
          },
          isLoading: false,
        };

        // Обновляем chats и hasMoreChats только для текущего таба
        if (isCurrentTab) {
          updates.currentTab = tabName;
          updates.chats = [...pinnedChats, ...regularChats];
          updates.hasMoreChats = regularResponse.hasMore;
          updates.totalChats = regularResponse.total;
        }

        return updates;
      });

      // No need to join chats - WebSocket delivers events via personal user channel
    } catch (error: any) {
      console.error(`❌ Failed to load tab "${tabName}":`, error);
      set({ error: error.message || `Failed to load ${tabName} chats`, isLoading: false });
    }
  },

  // Switch to a different tab
  switchTab: (tabName: TabName) => {
    const { tabs } = get();
    const tabData = tabs[tabName];

    // Update current chats from cached tab data
    set({
      currentTab: tabName,
      chats: [...tabData.pinnedChats, ...tabData.regularChats],
      hasMoreChats: tabData.hasMore,
    });

    // Load tab data if not loaded yet
    if (!tabData.loaded) {
      get().loadTabData(tabName);
    }
  },

  // Refresh current tab (for pull-to-refresh)
  refreshCurrentTab: async () => {
    const { currentTab } = get();

    // Reset tab data
    set(state => ({
      tabs: {
        ...state.tabs,
        [currentTab]: {
          pinnedChats: [],
          regularChats: [],
          offset: 0,
          hasMore: true,
          loaded: false,
        }
      }
    }));

    // Reload tab data
    await get().loadTabData(currentTab);
  },

  loadChats: async (append = false, filters) => {
    try {
      if (!append) {
        set({ isLoading: true, error: null, currentFilter: filters || null });
      }
      const { chats: currentChats, currentFilter } = useChatStore.getState();
      const offset = append ? currentChats.length : 0;

      // Use passed filters or current filter
      const activeFilters = filters || currentFilter;

      let chats;
      let total = 0;
      let hasMore = false;

      if (isMockMode()) {
        chats = await mockGetChats();
        total = chats.length;
      } else {
        const response = await chatApi.getChats(15, offset, activeFilters || undefined);
        chats = response.chats;
        total = response.total;
        hasMore = response.hasMore;
        // Enrich chats with user data
        chats = await Promise.all(chats.map(enrichChatWithUsers));
      }

      if (append) {
        // Дедупликация - убираем дубликаты по ID
        const existingIds = new Set(currentChats.map(c => c.id));
        const uniqueChats = chats.filter(c => !existingIds.has(c.id));
        const updatedChats = [...currentChats, ...uniqueChats];
        const stillHasMore = updatedChats.length < total;

        set({
          chats: updatedChats,
          totalChats: total,
          hasMoreChats: stillHasMore,
          isLoading: false
        });

        // Если получили только дубликаты и еще есть данные, не делаем автозагрузку
        // Пользователь продолжит скроллить и onEndReached сработает снова
        // Это предотвратит бесконечный цикл
        // Не делаем рекурсивный вызов - ждем следующего onEndReached
      } else {
        set({
          chats,
          totalChats: total,
          hasMoreChats: hasMore,
          isLoading: false
        });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to load chats', isLoading: false });
    }
  },

  loadMoreChats: async () => {
    const { currentTab, tabs, isLoadingMore } = get();
    const tabData = tabs[currentTab];

    if (!tabData.hasMore || isLoadingMore) {
      return;
    }

    set({ isLoadingMore: true });

    try {
      // Determine filters based on current tab
      const typeMap: Record<TabName, 'private' | 'group' | undefined> = {
        all: undefined,
        private: 'private',
        group: 'group',
        favorite: undefined,
      };

      const type = typeMap[currentTab];
      const isFavorite = currentTab === 'favorite';

      const limit = 15;
      const filters: any = {};
      if (type) filters.type = type;
      if (isFavorite) filters.is_favorite = true;

      const response = await chatApi.getChats(
        limit,
        tabData.offset,
        Object.keys(filters).length > 0 ? filters : undefined
      );

      // Filter out pinned chats and existing chats
      const pinnedIds = new Set(tabData.pinnedChats.map(c => c.id));
      const existingIds = new Set(tabData.regularChats.map(c => c.id));
      let newChats = response.chats.filter(c => !pinnedIds.has(c.id) && !existingIds.has(c.id));

      // Enrich with user data
      newChats = await Promise.all(newChats.map(enrichChatWithUsers));

      // Update tab data
      set(state => {
        const updatedRegularChats = [...state.tabs[currentTab].regularChats, ...newChats];
        return {
          tabs: {
            ...state.tabs,
            [currentTab]: {
              ...state.tabs[currentTab],
              regularChats: updatedRegularChats,
              offset: state.tabs[currentTab].offset + limit,
              hasMore: response.hasMore,
            }
          },
          chats: [...state.tabs[currentTab].pinnedChats, ...updatedRegularChats],
          hasMoreChats: response.hasMore,
          isLoadingMore: false,
        };
      });
    } catch (error: any) {
      console.error(`❌ Failed to load more chats for "${currentTab}":`, error);
      set({ error: error.message || 'Failed to load more chats', isLoadingMore: false });
    }
  },

  loadUnreadCount: async () => {
    try {
      if (isMockMode()) {
        // В mock режиме считаем из загруженных чатов
        const { chats } = useChatStore.getState();
        const count = chats.reduce((total, chat) => total + (chat.unread_count || 0), 0);
        set({ totalUnreadCount: count });
      } else {
        const count = await chatApi.getChatUnreadCount();
        set({ totalUnreadCount: count });
      }
    } catch (error: any) {
      console.error('Failed to load unread count:', error);
    }
  },

  createChat: async (name: string, memberIds: number[], type: 'private' | 'group' = 'group') => {
    try {
      set({ isLoading: true, error: null });

      let newChat: Chat;

      // For private chats, use getOrCreateDirectChat to handle hidden chats
      if (type === 'private') {
        if (memberIds.length !== 1) {
          throw new Error('Private chat must have exactly one member');
        }
        newChat = await chatApi.getOrCreateDirectChat(memberIds[0]);
      } else {
        // For group chats, use regular createChat
        newChat = await chatApi.createChat({
          type,
          name,
          member_ids: memberIds,
        });
      }

      // Enrich chat with user data
      newChat = await enrichChatWithUsers(newChat);

      set((state) => ({
        // Check if chat already exists in the list (for reopened hidden chats)
        chats: state.chats.some(c => c.id === newChat.id)
          ? state.chats.map(c => c.id === newChat.id ? newChat : c)
          : [newChat, ...state.chats],
        isLoading: false,
      }));
      return newChat;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create chat', isLoading: false });
      throw error;
    }
  },

  updateChat: async (chatId: number, data: { name?: string; avatar?: string; description?: string }) => {
    try {
      const updatedChat = await chatApi.updateChat(chatId, data);
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, ...updatedChat } : chat
        ),
        activeChat: state.activeChat?.id === chatId
          ? { ...state.activeChat, ...updatedChat }
          : state.activeChat,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to update chat' });
      throw error;
    }
  },

  deleteChat: async (chatId: number, clearHistory?: boolean) => {
    try {
      await chatApi.deleteChat(chatId, clearHistory);

      // Use handleChatDelete to properly remove from all tabs
      get().handleChatDelete(chatId);
    } catch (error: any) {
      console.error(`Failed to delete chat ${chatId}:`, error);
      set({ error: error.message || 'Failed to delete chat' });
      throw error;
    }
  },

  leaveChat: async (chatId: number) => {
    try {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error('User not authenticated');

      await chatApi.removeChatMember(chatId, currentUser.id);

      // Use handleChatDelete to properly remove from all tabs
      get().handleChatDelete(chatId);
    } catch (error: any) {
      console.error(`Failed to leave chat ${chatId}:`, error);
      set({ error: error.message || 'Failed to leave chat' });
      throw error;
    }
  },

  removeChatMember: async (chatId: number, userId: number) => {
    try {
      await chatApi.removeChatMember(chatId, userId);

      // Обновляем список участников в чате
      set((state) => ({
        chats: state.chats.map((chat) => {
          if (chat.id === chatId && chat.members) {
            return {
              ...chat,
              members: chat.members.filter((member) => member.user_id !== userId),
            };
          }
          return chat;
        }),
      }));
    } catch (error: any) {
      console.error(`❌ Failed to remove member:`, error);
      set({ error: error.message || 'Failed to remove member' });
      throw error;
    }
  },

  loadMessages: async (chatId: number) => {
    try {
      set({ isLoading: true, error: null });
      let messages;

      if (isMockMode()) {
        messages = await mockGetMessages(String(chatId));
      } else {
        // NEW API: Use getLatestMessages (cursor-based pagination)
        // Messages are returned in chronological order (oldest → newest)
        const response = await chatApi.getLatestMessages(chatId, {
          limit: 30,
          include_unread_marker: true,
        });

        // ✅ Messages are ALREADY in chronological order (oldest → newest)
        // NO need to reverse!
        messages = response.messages;
      }

      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: messages,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      console.error(`Failed to load messages for chat ${chatId}:`, error);
      set({ error: error.message || 'Failed to load messages', isLoading: false });
    }
  },

  loadMoreMessages: async (chatId: number, beforeMessageId: number) => {
    try {
      // NEW API: Use getMessagesBefore (cursor-based pagination)
      const response = await chatApi.getMessagesBefore(chatId, beforeMessageId, {
        limit: 30,
      });

      const responseMessages = response.messages || [];
      let addedCount = 0;

      if (responseMessages.length > 0) {
        set((state) => {
          const existingMessages = state.messages[chatId] || [];
          const existingIds = new Set(existingMessages.map(m => m.id));

          // Filter duplicates - add only new messages
          // ✅ Messages are ALREADY in chronological order (oldest → newest)
          // NO need to reverse!
          const newMessages = responseMessages.filter(msg => !existingIds.has(msg.id));

          addedCount = newMessages.length;

          return {
            messages: {
              ...state.messages,
              [chatId]: [...newMessages, ...existingMessages], // Add old messages at the BEGINNING
            },
          };
        });
      }

      // Return count of NEW messages (not duplicates) to check if there are more
      return addedCount;
    } catch (error: any) {
      console.error(`Failed to load more messages for chat ${chatId}:`, error);
      set({ error: error.message || 'Failed to load more messages' });
      return 0;
    }
  },

  jumpToMessage: async (chatId: number, messageId: number) => {
    try {
      set({ isLoading: true, error: null });

      // NEW API: Get message context (messages around the target message)
      const response = await chatApi.getMessageContext(chatId, messageId, {
        before: 20,
        after: 20,
      });

      // Replace all messages with the context
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: response.messages,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      console.error(`Failed to jump to message ${messageId} in chat ${chatId}:`, error);
      set({ error: error.message || 'Failed to jump to message', isLoading: false });
    }
  },

  setActiveChat: (chat: Chat | null) => {
    set((state) => ({
      activeChat: chat,
      // Reset unread count for the chat being opened
      chats: chat
        ? state.chats.map((c) => (c.id === chat.id ? { ...c, unread_count: 0 } : c))
        : state.chats,
    }));

    // Mark all messages in chat as read on server
    if (chat && chat.unread_count && chat.unread_count > 0) {
      get().markChatAsRead(chat.id);
    }

    if (chat && !get().messages[chat.id]) {
      get().loadMessages(chat.id);
    }
  },

  sendMessage: async (chatId: number, content: string, replyToId?: number, fileIds?: number[], extraData?: any) => {
    try {
      if (!content.trim() && (!fileIds || fileIds.length === 0)) {
        throw new Error('Message content or files are required');
      }

      // Send message through API (not WebSocket)
      // Server will broadcast it to all WebSocket clients
      const message = await chatApi.sendMessage(chatId, {
        content: content.trim(),
        reply_to_id: replyToId,
        file_ids: fileIds,
        ...extraData, // Добавляем extraData (например, message_type, poll_data)
      });

      // Handle new message locally
      await get().handleNewMessage(message);

    } catch (error: any) {
      set({ error: error.message || 'Failed to send message' });
      throw error;
    }
  },

  updateMessage: async (messageId: number, content: string) => {
    try {
      const updatedMessage = await chatApi.updateMessage(messageId, { content });
      set((state) => ({
        messages: {
          ...state.messages,
          [updatedMessage.chat_id]: (state.messages[updatedMessage.chat_id] || []).map((msg) =>
            msg.id === messageId ? updatedMessage : msg
          ),
        },
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to update message' });
      throw error;
    }
  },

  deleteMessage: async (messageId: number) => {
    try {
      await chatApi.deleteMessage(messageId);
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete message' });
      throw error;
    }
  },

  deleteMessageForUser: async (messageId: number, deleteFor: 'everyone' | 'me') => {
    try {
      await chatApi.deleteMessageForUser(messageId, deleteFor);

      // Если удаление "для меня", удаляем сообщение локально
      if (deleteFor === 'me') {
        set((state) => {
          // Находим чат, в котором находится сообщение
          let chatId: number | null = null;
          for (const [cId, messages] of Object.entries(state.messages)) {
            if (messages.some(msg => msg.id === messageId)) {
              chatId = Number(cId);
              break;
            }
          }

          if (!chatId) return state;

          return {
            messages: {
              ...state.messages,
              [chatId]: state.messages[chatId].filter(msg => msg.id !== messageId),
            },
          };
        });
      }
      // Если удаление "для всех", WebSocket отправит событие удаления
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete message' });
      throw error;
    }
  },

  clearChatHistory: async (chatId: number) => {
    try {
      await chatApi.clearChatHistory(chatId);

      // Очищаем сообщения локально
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: [],
        },
      }));
    } catch (error: any) {
      console.error(`❌ Failed to clear chat history for chat ${chatId}:`, error);
      set({ error: error.message || 'Failed to clear chat history' });
      throw error;
    }
  },

  restoreMessage: async (messageId: number) => {
    try {
      await chatApi.restoreMessage(messageId);
      // WebSocket отправит обновлённое сообщение
    } catch (error: any) {
      set({ error: error.message || 'Failed to restore message' });
      throw error;
    }
  },

  deletePermanentMessage: async (messageId: number) => {
    try {
      await chatApi.deletePermanentMessage(messageId);
      // Удаляем сообщение локально из всех чатов
      set((state) => {
        const newMessages = { ...state.messages };
        for (const chatId in newMessages) {
          newMessages[chatId] = newMessages[chatId].filter(msg => msg.id !== messageId);
        }
        return { messages: newMessages };
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to permanently delete message' });
      throw error;
    }
  },

  pinMessage: async (messageId: number) => {
    try {
      const updatedMessage = await chatApi.pinMessage(messageId);
      // Обновляем сообщение локально ПОЛНОСТЬЮ с сервера (включая poll_data)
      set((state) => ({
        messages: {
          ...state.messages,
          [updatedMessage.chat_id]: (state.messages[updatedMessage.chat_id] || []).map((msg) =>
            msg.id === messageId ? updatedMessage : msg
          ),
        },
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to pin message' });
      throw error;
    }
  },

  unpinMessage: async (messageId: number) => {
    try {
      const updatedMessage = await chatApi.unpinMessage(messageId);
      // Обновляем сообщение локально ПОЛНОСТЬЮ с сервера (включая poll_data)
      set((state) => ({
        messages: {
          ...state.messages,
          [updatedMessage.chat_id]: (state.messages[updatedMessage.chat_id] || []).map((msg) =>
            msg.id === messageId ? updatedMessage : msg
          ),
        },
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to unpin message' });
      throw error;
    }
  },

  getPinnedMessages: (chatId: number) => {
    const messages = get().messages[chatId] || [];
    return messages.filter((msg) => msg.is_pinned && !msg.is_deleted);
  },

  addReaction: async (messageId: number, emoji: string) => {
    try {
      const updatedMessage = await chatApi.addReaction(messageId, { emoji });
      set((state) => ({
        messages: {
          ...state.messages,
          [updatedMessage.chat_id]: (state.messages[updatedMessage.chat_id] || []).map((msg) =>
            msg.id === messageId ? updatedMessage : msg
          ),
        },
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to add reaction' });
    }
  },

  removeReaction: async (messageId: number, emoji: string) => {
    try {
      const updatedMessage = await chatApi.removeReaction(messageId, emoji);
      set((state) => ({
        messages: {
          ...state.messages,
          [updatedMessage.chat_id]: (state.messages[updatedMessage.chat_id] || []).map((msg) =>
            msg.id === messageId ? updatedMessage : msg
          ),
        },
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to remove reaction' });
    }
  },

  markMessageRead: async (messageId: number) => {
    try {
      await chatApi.markMessageRead(messageId);
    } catch (error: any) {
      console.error('Failed to mark message as read:', error);
    }
  },

  markChatAsRead: async (chatId: number) => {
    try {
      const chat = get().chats.find((c) => c.id === chatId);
      const unreadCount = chat?.unread_count || 0;

      // NEW API: Use markChatAsReadV2 (returns marked count)
      await chatApi.markChatAsReadV2(chatId);

      // После успешного запроса обновляем локальный state
      set((state) => {
        // Helper function to update chat
        const updateChatUnread = (c: Chat) =>
          c.id === chatId ? { ...c, unread_count: 0 } : c;

        // Обновляем chats и tabs
        const updatedTabs = { ...state.tabs };
        Object.keys(updatedTabs).forEach(tabKey => {
          const tab = updatedTabs[tabKey as TabName];
          if (!tab.loaded) return;

          updatedTabs[tabKey as TabName] = {
            ...tab,
            pinnedChats: tab.pinnedChats.map(updateChatUnread),
            regularChats: tab.regularChats.map(updateChatUnread),
          };
        });

        const newTotalUnreadCount = Math.max(0, state.totalUnreadCount - unreadCount);

        return {
          chats: state.chats.map(updateChatUnread),
          tabs: updatedTabs,
          totalUnreadCount: newTotalUnreadCount,
        };
      });
    } catch (error: any) {
      console.error('Failed to mark chat as read:', error);
    }
  },

  pinChat: async (chatId: number) => {
    try {
      await chatApi.toggleChatPinned(chatId, true);
      set((state) => {
        // Обновляем табы - перемещаем чат из regularChats в pinnedChats
        const updatedTabs = { ...state.tabs };
        Object.keys(updatedTabs).forEach(tabKey => {
          const tab = updatedTabs[tabKey as TabName];
          if (!tab.loaded) return;

          // Ищем чат в regularChats
          const chatIndex = tab.regularChats.findIndex(c => c.id === chatId);
          if (chatIndex !== -1) {
            const chat = { ...tab.regularChats[chatIndex], is_pinned: true };
            const newRegularChats = tab.regularChats.filter(c => c.id !== chatId);
            const newPinnedChats = [chat, ...tab.pinnedChats];

            updatedTabs[tabKey as TabName] = {
              ...tab,
              pinnedChats: newPinnedChats,
              regularChats: newRegularChats,
            };
          }
        });

        // Обновляем chats для текущего таба
        const currentTabData = updatedTabs[state.currentTab];
        const updatedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

        return {
          tabs: updatedTabs,
          chats: updatedChats,
        };
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to pin chat' });
      throw error;
    }
  },

  unpinChat: async (chatId: number) => {
    try {
      await chatApi.toggleChatPinned(chatId, false);
      set((state) => {
        // Обновляем табы - перемещаем чат из pinnedChats в regularChats
        const updatedTabs = { ...state.tabs };
        let chatFound = false;

        Object.keys(updatedTabs).forEach(tabKey => {
          const tab = updatedTabs[tabKey as TabName];
          if (!tab.loaded) return;

          // Ищем чат в pinnedChats
          const chatIndex = tab.pinnedChats.findIndex(c => c.id === chatId);
          if (chatIndex !== -1) {
            chatFound = true;
            const chat = { ...tab.pinnedChats[chatIndex], is_pinned: false };
            const newPinnedChats = tab.pinnedChats.filter(c => c.id !== chatId);
            const newRegularChats = [chat, ...tab.regularChats];

            // Сортируем regularChats по времени последнего сообщения
            const sortedRegularChats = newRegularChats.sort((a, b) => {
              const timeA = a.last_message?.created_at || a.created_at || '';
              const timeB = b.last_message?.created_at || b.created_at || '';
              return new Date(timeB).getTime() - new Date(timeA).getTime();
            });

            updatedTabs[tabKey as TabName] = {
              ...tab,
              pinnedChats: newPinnedChats,
              regularChats: sortedRegularChats,
            };

          }
        });

        if (!chatFound) {
          console.warn(`[Store] Chat ${chatId} NOT found in any pinnedChats!`);
        }

        // Обновляем chats для текущего таба
        const currentTabData = updatedTabs[state.currentTab];
        const updatedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

        return {
          tabs: updatedTabs,
          chats: updatedChats,
        };
      });
    } catch (error: any) {
      console.error('[Store] Failed to unpin chat:', error);
      set({ error: error.message || 'Failed to unpin chat' });
      throw error;
    }
  },

  muteChat: async (chatId: number) => {
    try {
      // TODO: implement mute functionality when backend endpoint is ready
      console.warn('Mute chat not yet implemented on backend');
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, is_muted: true } : chat
        ),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to mute chat' });
    }
  },

  unmuteChat: async (chatId: number) => {
    try {
      // TODO: implement unmute functionality when backend endpoint is ready
      console.warn('Unmute chat not yet implemented on backend');
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, is_muted: false } : chat
        ),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to unmute chat' });
    }
  },

  toggleFavorite: async (chatId: number) => {
    try {
      const chat = get().chats.find((c) => c.id === chatId);
      if (!chat) throw new Error('Chat not found');

      const newFavoriteStatus = !chat.is_favorite;
      await chatApi.toggleChatFavorite(chatId, newFavoriteStatus);

      set((state) => {
        // Helper function to update chat in list
        const updateChatFavorite = (c: Chat) =>
          c.id === chatId ? { ...c, is_favorite: newFavoriteStatus } : c;

        // Обновляем табы
        const updatedTabs = { ...state.tabs };
        Object.keys(updatedTabs).forEach(tabKey => {
          const tab = updatedTabs[tabKey as TabName];
          if (!tab.loaded) return;

          // Для таба 'favorite' нужно добавить/удалить чат
          if (tabKey === 'favorite') {
            if (newFavoriteStatus) {
              // Добавляем в favorite, если там ещё нет
              const chatInPinned = tab.pinnedChats.find(c => c.id === chatId);
              const chatInRegular = tab.regularChats.find(c => c.id === chatId);

              if (!chatInPinned && !chatInRegular) {
                // Нужно загрузить чат и добавить его
                // Для упрощения, ищем чат в других табах
                const foundChat = Object.keys(state.tabs).find(otherTabKey => {
                  const otherTab = state.tabs[otherTabKey as TabName];
                  return otherTab.pinnedChats.find(c => c.id === chatId) ||
                         otherTab.regularChats.find(c => c.id === chatId);
                });

                if (foundChat) {
                  const otherTab = state.tabs[foundChat as TabName];
                  const chatData = otherTab.pinnedChats.find(c => c.id === chatId) ||
                                   otherTab.regularChats.find(c => c.id === chatId);

                  if (chatData) {
                    const updatedChat = { ...chatData, is_favorite: true };
                    if (updatedChat.is_pinned) {
                      updatedTabs.favorite = {
                        ...tab,
                        pinnedChats: [updatedChat, ...tab.pinnedChats],
                      };
                    } else {
                      updatedTabs.favorite = {
                        ...tab,
                        regularChats: [updatedChat, ...tab.regularChats],
                      };
                    }
                  }
                }
              } else {
                // Чат уже в favorite, просто обновляем флаг
                updatedTabs.favorite = {
                  ...tab,
                  pinnedChats: tab.pinnedChats.map(updateChatFavorite),
                  regularChats: tab.regularChats.map(updateChatFavorite),
                };
              }
            } else {
              // Удаляем из favorite
              updatedTabs.favorite = {
                ...tab,
                pinnedChats: tab.pinnedChats.filter(c => c.id !== chatId),
                regularChats: tab.regularChats.filter(c => c.id !== chatId),
              };
            }
          } else {
            // Для остальных табов просто обновляем флаг
            updatedTabs[tabKey as TabName] = {
              ...tab,
              pinnedChats: tab.pinnedChats.map(updateChatFavorite),
              regularChats: tab.regularChats.map(updateChatFavorite),
            };
          }
        });

        // Обновляем chats для текущего таба
        const currentTabData = updatedTabs[state.currentTab];
        const updatedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

        return {
          tabs: updatedTabs,
          chats: updatedChats,
        };
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to toggle favorite' });
      throw error;
    }
  },

  handleNewMessage: async (message: Message, isLatest?: boolean) => {
    const currentUser = useAuthStore.getState().user;
    const isOwnMessage = currentUser && message.sender_id === currentUser.id;
    const activeChat = get().activeChat;
    const isInActiveChat = activeChat && activeChat.id === message.chat_id;

    // Проверяем, существует ли чат в любом из загруженных табов
    const state = get();
    const currentChats = state.chats;
    const tabs = state.tabs;

    // Ищем чат во всех загруженных табах
    let chatExistsInTabs = false;
    Object.keys(tabs).forEach(tabKey => {
      const tab = tabs[tabKey as TabName];
      if (tab.loaded) {
        const inPinned = tab.pinnedChats.some(c => c.id === message.chat_id);
        const inRegular = tab.regularChats.some(c => c.id === message.chat_id);
        if (inPinned || inRegular) {
          chatExistsInTabs = true;
        }
      }
    });

    // Если чата нет ни в одном табе - загружаем его через API
    if (!chatExistsInTabs) {

      try {
        let fetchedChat = await chatApi.getChat(message.chat_id);

        // Validate fetched chat
        if (!fetchedChat || !fetchedChat.id) {
          console.error(`Invalid chat data received for chat ${message.chat_id}:`, fetchedChat);
          return;
        }

        // Enrich chat with user data for members
        fetchedChat = await enrichChatWithUsers(fetchedChat);

        // Добавляем загруженный чат в store
        set((state) => {
          const shouldIncrementUnread = !isOwnMessage && !isInActiveChat;
          const chatWithMessage = {
            ...fetchedChat,
            last_message: message,
            unread_count: shouldIncrementUnread ? 1 : 0,
          };

          // Определяем в какой таб добавить чат
          const updatedTabs = { ...state.tabs };
          const chatType = fetchedChat.type || 'private'; // Default to private if type is missing
          const isFavorite = fetchedChat.is_favorite || false;

          // Добавляем в соответствующие табы
          ['all', chatType === 'private' ? 'private' : chatType === 'group' ? 'group' : null, isFavorite ? 'favorite' : null]
            .filter(Boolean)
            .forEach(tabKey => {
              const tab = updatedTabs[tabKey as TabName];
              if (tab && tab.loaded) {
                // Проверяем, не существует ли чат уже в regularChats
                const chatExistsInTab = tab.regularChats.some(c => c.id === chatWithMessage.id);
                if (!chatExistsInTab) {
                  // Добавляем в начало regular chats только если его там еще нет
                  updatedTabs[tabKey as TabName] = {
                    ...tab,
                    regularChats: [chatWithMessage, ...tab.regularChats],
                  };
                } else {
                }
              }
            });

          // Формируем chats для текущего таба из обновленных табов
          const currentTab = state.currentTab;
          const currentTabData = updatedTabs[currentTab];
          const updatedChats = currentTabData
            ? [...currentTabData.pinnedChats, ...currentTabData.regularChats]
            : state.chats;

          // Добавляем сообщение в messages (с проверкой на дубликаты)
          const existingMessages = state.messages[message.chat_id] || [];
          const messageExists = existingMessages.some(msg => msg.id === message.id);

          let updatedMessagesForChat = existingMessages;
          if (!messageExists) {
            const messageWithDelivery = !isOwnMessage && currentUser
              ? { ...message, delivered_to: [currentUser.id] }
              : { ...message, delivered_to: [] };
            updatedMessagesForChat = [...existingMessages, messageWithDelivery];
          } else {
          }

          return {
            ...state,
            chats: updatedChats,
            tabs: updatedTabs,
            messages: {
              ...state.messages,
              [message.chat_id]: updatedMessagesForChat,
            },
            totalUnreadCount: shouldIncrementUnread && !messageExists ? state.totalUnreadCount + 1 : state.totalUnreadCount,
          };
        });

        // Чат успешно добавлен, выходим из функции
        return;
      } catch (error) {
        console.error(`❌ [ChatStore] Failed to fetch chat ${message.chat_id}:`, error);
        // При ошибке загрузки чата НЕ продолжаем обработку, чтобы избежать дублирования
        return;
      }
    }

    set((state) => {
      // Check if message already exists (deduplication)
      const existingMessages = state.messages[message.chat_id] || [];
      const messageExists = existingMessages.some((msg) => msg.id === message.id);


      // Если сообщение уже существует
      if (messageExists) {
        if (isOwnMessage) {
          // Обновляем существующее сообщение свежими данными (например, attachments с правильными URLs)
          const updatedMessages = {
            ...state.messages,
            [message.chat_id]: existingMessages.map(msg =>
              msg.id === message.id ? { ...msg, ...message } : msg
            ),
          };
          return { ...state, messages: updatedMessages };
        }
        // Для чужих сообщений - обновляем delivered_to (добавляем текущего пользователя)
        const updatedMessages = {
          ...state.messages,
          [message.chat_id]: existingMessages.map(msg => {
            if (msg.id === message.id && currentUser) {
              const deliveredTo = msg.delivered_to || [];
              if (!deliveredTo.includes(currentUser.id)) {
                return { ...msg, delivered_to: [...deliveredTo, currentUser.id] };
              }
            }
            return msg;
          }),
        };
        return { ...state, messages: updatedMessages };
      }

      // Новое сообщение - добавляем с delivered_to если это чужое сообщение
      const messageWithDelivery = !isOwnMessage && currentUser
        ? { ...message, delivered_to: [currentUser.id] }
        : { ...message, delivered_to: [] };

      // Add message to messages list
      const updatedMessages = {
        ...state.messages,
        [message.chat_id]: [...existingMessages, messageWithDelivery],
      };

      // Helper function to update chat in list
      const updateChatInList = (chats: Chat[]) => {
        return chats.map((chat) => {
          if (chat.id === message.chat_id) {
            const shouldIncrementUnread = !isOwnMessage && !isInActiveChat;
            const updatedChat = {
              ...chat,
              last_message: message,
              unread_count: shouldIncrementUnread ? (chat.unread_count || 0) + 1 : chat.unread_count || 0,
            };
            return updatedChat;
          }
          return chat;
        });
      };

      // Helper function to sort chats by last message time (pinned stay at top)
      const sortChatsByTime = (chats: Chat[]) => {
        return [...chats].sort((a, b) => {
          const timeA = a.last_message?.created_at || a.created_at || '';
          const timeB = b.last_message?.created_at || b.created_at || '';
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        });
      };

      // Update all tabs that might contain this chat
      const updatedTabs = { ...state.tabs };
      let chatFoundInTabs = false;

      Object.keys(updatedTabs).forEach(tabKey => {
        const tab = updatedTabs[tabKey as TabName];
        if (!tab.loaded) {
          return;
        }

        // Check if chat exists in this tab
        const chatInPinned = tab.pinnedChats.some(c => c.id === message.chat_id);
        const chatInRegular = tab.regularChats.some(c => c.id === message.chat_id);

        if (chatInPinned || chatInRegular) {
          chatFoundInTabs = true;
        }

        // Update pinned chats
        const updatedPinned = updateChatInList(tab.pinnedChats);

        // Update regular chats and re-sort them
        const updatedRegular = updateChatInList(tab.regularChats);
        const sortedRegular = sortChatsByTime(updatedRegular);

        updatedTabs[tabKey as TabName] = {
          ...tab,
          pinnedChats: updatedPinned,
          regularChats: sortedRegular,
        };

      });

      if (!chatFoundInTabs) {
        console.warn(`⚠️ [ChatStore] Chat ${message.chat_id} NOT found in any loaded tabs!`);
        console.warn(`⚠️ [ChatStore] Available chats in current tab (${state.currentTab}):`, state.chats.map(c => ({ id: c.id, type: c.type, name: c.name })));
      }

      // Reconstruct chats array from current tab to ensure new reference
      const currentTabData = updatedTabs[state.currentTab];
      const sortedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

      // Update total unread count if a new unread message was added
      const shouldIncrementUnread = !isOwnMessage && !isInActiveChat;
      const newTotalUnreadCount = shouldIncrementUnread
        ? state.totalUnreadCount + 1
        : state.totalUnreadCount;

      return {
        messages: updatedMessages,
        chats: sortedChats,
        tabs: updatedTabs,
        totalUnreadCount: newTotalUnreadCount,
      };
    });
  },

  handleMessageUpdate: (message: Message) => {
    // Parse poll_data if it's a JSON string (comes from WebSocket)
    // Create updated message object and explicitly preserve message_type
    const updatedMessage: any = {
      ...message,
      message_type: message.message_type, // Explicitly preserve
    };

    if ((message as any).poll_data && typeof (message as any).poll_data === 'string') {
      try {
        updatedMessage.poll_data = JSON.parse((message as any).poll_data);
      } catch (e) {
        console.error('❌ Failed to parse poll_data in WebSocket update:', e);
      }
    }

    set((state) => {
      // Update messages
      const updatedMessages = {
        ...state.messages,
        [message.chat_id]: (state.messages[message.chat_id] || []).map((msg) =>
          msg.id === message.id ? updatedMessage : msg
        ),
      };

      // Helper function to update last_message in chat if needed
      const updateChatLastMessage = (chat: Chat) => {
        if (chat.id === message.chat_id && chat.last_message?.id === message.id) {
          return { ...chat, last_message: updatedMessage };
        }
        return chat;
      };

      // Update all tabs
      const updatedTabs = { ...state.tabs };
      Object.keys(updatedTabs).forEach(tabKey => {
        const tab = updatedTabs[tabKey as TabName];
        if (!tab.loaded) return;

        updatedTabs[tabKey as TabName] = {
          ...tab,
          pinnedChats: tab.pinnedChats.map(updateChatLastMessage),
          regularChats: tab.regularChats.map(updateChatLastMessage),
        };
      });

      // Reconstruct chats array from current tab to ensure new reference
      const currentTabData = updatedTabs[state.currentTab];
      const updatedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

      return {
        messages: updatedMessages,
        chats: updatedChats,
        tabs: updatedTabs,
      };
    });
  },

  handleMessageDelete: (messageId: number, chatId: number) => {
    // Вместо удаления сообщения, помечаем его как удалённое И очищаем контент
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                is_deleted: true,
                content: '', // Очищаем контент для всех пользователей
                deleted_at: new Date().toISOString()
              }
            : msg
        ),
      },
    }));
  },

  handleChatDelete: (chatId: number) => {
    set((state) => {
      // Удаляем чат из всех табов
      const updatedTabs = { ...state.tabs };
      Object.keys(updatedTabs).forEach(tabKey => {
        const tab = updatedTabs[tabKey as TabName];
        updatedTabs[tabKey as TabName] = {
          ...tab,
          pinnedChats: tab.pinnedChats.filter(chat => chat.id !== chatId),
          regularChats: tab.regularChats.filter(chat => chat.id !== chatId),
        };
      });

      // Reconstruct chats array from current tab to ensure new reference
      const currentTabData = updatedTabs[state.currentTab];
      const updatedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

      // Удаляем сообщения чата
      const updatedMessages = { ...state.messages };
      delete updatedMessages[chatId];

      // Сбрасываем activeChat если это был удаленный чат
      const updatedActiveChat = state.activeChat?.id === chatId ? null : state.activeChat;

      return {
        ...state,
        chats: updatedChats,
        tabs: updatedTabs,
        messages: updatedMessages,
        activeChat: updatedActiveChat,
      };
    });
  },

  handleTypingStart: async (chatId: number, typing: TypingIndicator) => {
    // Load user data if not present
    if (!typing.user) {
      try {
        const user = await getUser(typing.user_id);
        typing = { ...typing, user };
      } catch (error) {
        console.error(`Failed to load user for typing indicator:`, error);
      }
    }

    set((state) => {
      const currentTyping = state.typingUsers[chatId] || [];
      const alreadyTyping = currentTyping.some((t) => t.user_id === typing.user_id);
      if (alreadyTyping) {
        return state;
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: [...currentTyping, typing],
        },
      };
    });
  },

  handleTypingStop: (chatId: number, userId: number) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [chatId]: (state.typingUsers[chatId] || []).filter((t) => t.user_id !== userId),
      },
    }));
  },

  handleUserJoin: (chatId: number, userId?: number) => {
    // Could update online status or member list if needed
  },

  handleUserLeave: (chatId: number, userId?: number) => {
    // Could update online status or member list if needed
  },

  handleUserPresence: (presence: any) => {
    // Update user status in all chats where user is a member
    const { user_id, status, last_seen, last_active_at } = presence;

    // Use last_active_at if available (from API), otherwise fall back to last_seen
    const lastActiveTime = last_active_at || last_seen;

    set((state) => ({
      chats: state.chats.map((chat) => {
        if (!chat.members) return chat;

        // Check if user is a member of this chat
        const hasMember = chat.members.some(m => m.user_id === user_id);
        if (!hasMember) return chat;

        // Update the member's user status
        const updatedMembers = chat.members.map(member => {
          if (member.user_id === user_id && member.user) {
            const updatedUser = {
              ...member.user,
              status,
              last_seen_at: lastActiveTime || member.user.last_seen_at,
              // Also update last_active_at if it exists in the user object
              ...(last_active_at ? { last_active_at } : {}),
            };
            return {
              ...member,
              user: updatedUser,
            };
          }
          return member;
        });

        return { ...chat, members: updatedMembers };
      }),
    }));
  },

  handleMessageRead: (chatId: number, messageId: number, userId?: number) => {
    // Update read_by array and read_receipts in message
    // userId - кто прочитал сообщение (может быть текущий пользователь или другой)
    const readerId = userId || useAuthStore.getState().user?.id;
    const currentUser = useAuthStore.getState().user;

    if (!readerId) {
      return;
    }

    set((state) => {
      // Обновляем сообщения в чате
      const updatedMessages = {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((msg) => {
          if (msg.id === messageId) {
            const currentReadBy = msg.read_by || [];
            const currentReadReceipts = msg.read_receipts || [];

            const alreadyInReadBy = currentReadBy.includes(readerId);
            const alreadyInReceipts = currentReadReceipts.some(r => r.user_id === readerId);

            if (!alreadyInReadBy || !alreadyInReceipts) {
              const newReadBy = alreadyInReadBy ? currentReadBy : [...currentReadBy, readerId];
              const newReadReceipts = alreadyInReceipts
                ? currentReadReceipts
                : [...currentReadReceipts, {
                    id: Date.now(),
                    message_id: messageId,
                    user_id: readerId,
                    read_at: new Date().toISOString(),
                  }];

              return {
                ...msg,
                read_by: newReadBy,
                read_receipts: newReadReceipts,
              };
            }
          }
          return msg;
        }),
      };

      // Также обновляем last_message в списке чатов, если это последнее сообщение
      // И сбрасываем unread_count если текущий пользователь прочитал сообщение
      const isCurrentUserRead = currentUser && readerId === currentUser.id;

      // Helper function to update chat
      const updateChatReadStatus = (chat: Chat) => {
        if (chat.id === chatId && chat.last_message && chat.last_message.id === messageId) {
          const currentReadBy = chat.last_message.read_by || [];
          const alreadyRead = currentReadBy.includes(readerId);

          if (!alreadyRead) {
            return {
              ...chat,
              last_message: {
                ...chat.last_message,
                read_by: [...currentReadBy, readerId],
              },
              // Сбрасываем unread_count если текущий пользователь прочитал последнее сообщение
              unread_count: isCurrentUserRead ? 0 : chat.unread_count,
            };
          }
        }
        return chat;
      };

      const updatedChats = state.chats.map(updateChatReadStatus);

      // Обновляем tabs тоже
      const updatedTabs = { ...state.tabs };
      Object.keys(updatedTabs).forEach(tabKey => {
        const tab = updatedTabs[tabKey as TabName];
        if (!tab.loaded) return;

        updatedTabs[tabKey as TabName] = {
          ...tab,
          pinnedChats: tab.pinnedChats.map(updateChatReadStatus),
          regularChats: tab.regularChats.map(updateChatReadStatus),
        };
      });

      // Обновляем totalUnreadCount если текущий пользователь прочитал сообщение
      // Но только если unread_count действительно изменился
      let newTotalUnreadCount = state.totalUnreadCount;
      if (isCurrentUserRead) {
        const oldChat = state.chats.find(c => c.id === chatId);
        const newChat = updatedChats.find(c => c.id === chatId);

        // Вычитаем разницу в unread_count
        const oldUnreadCount = oldChat?.unread_count || 0;
        const newUnreadCount = newChat?.unread_count || 0;
        const unreadDiff = oldUnreadCount - newUnreadCount;

        if (unreadDiff > 0) {
          newTotalUnreadCount = Math.max(0, state.totalUnreadCount - unreadDiff);
        }
      }

      return {
        messages: updatedMessages,
        chats: updatedChats,
        tabs: updatedTabs,
        totalUnreadCount: newTotalUnreadCount,
      };
    });
  },

  handleReaction: (chatId: number, messageId: number, emoji: string, userId?: number) => {
    // Update reactions array in message
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((msg) => {
          if (msg.id === messageId) {
            const existingReaction = msg.reactions.find(
              (r) => r.emoji === emoji && r.user_id === userId
            );
            if (existingReaction) {
              return msg; // Reaction already exists
            }
            return {
              ...msg,
              reactions: [
                ...msg.reactions,
                {
                  id: Date.now(), // temporary ID
                  message_id: messageId,
                  user_id: userId || 0,
                  emoji,
                  created_at: new Date().toISOString(),
                },
              ],
            };
          }
          return msg;
        }),
      },
    }));
  },

  clearError: () => {
    set({ error: null });
  },

  getChatById: (chatId: number) => {
    return get().chats.find((chat) => chat.id === chatId);
  },

  mergeChats: (updatedChats: Chat[]) => {
    if (!updatedChats || updatedChats.length === 0) return;

    set((state) => {
      // Helper to merge chats in a list
      const mergeChatList = (chats: Chat[]) => {
        const chatMap = new Map(chats.map(c => [c.id, c]));
        for (const chat of updatedChats) {
          chatMap.set(chat.id, { ...chatMap.get(chat.id), ...chat });
        }
        return Array.from(chatMap.values());
      };

      // Update all tabs
      const updatedTabs = { ...state.tabs };
      Object.keys(updatedTabs).forEach(tabKey => {
        const tab = updatedTabs[tabKey as TabName];
        if (!tab.loaded) return;

        updatedTabs[tabKey as TabName] = {
          ...tab,
          pinnedChats: mergeChatList(tab.pinnedChats),
          regularChats: mergeChatList(tab.regularChats),
        };
      });

      // Reconstruct chats for current tab
      const currentTabData = updatedTabs[state.currentTab];
      const mergedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

      return {
        tabs: updatedTabs,
        chats: mergedChats,
      };
    });
  },

  removeChats: (chatIds: number[]) => {
    if (!chatIds || chatIds.length === 0) return;

    const idsToRemove = new Set(chatIds);

    set((state) => {
      // Update all tabs
      const updatedTabs = { ...state.tabs };
      Object.keys(updatedTabs).forEach(tabKey => {
        const tab = updatedTabs[tabKey as TabName];
        if (!tab.loaded) return;

        updatedTabs[tabKey as TabName] = {
          ...tab,
          pinnedChats: tab.pinnedChats.filter(c => !idsToRemove.has(c.id)),
          regularChats: tab.regularChats.filter(c => !idsToRemove.has(c.id)),
        };
      });

      // Reconstruct chats for current tab
      const currentTabData = updatedTabs[state.currentTab];
      const filteredChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

      // Clean up messages for removed chats
      const updatedMessages = { ...state.messages };
      for (const chatId of chatIds) {
        delete updatedMessages[chatId];
      }

      return {
        tabs: updatedTabs,
        chats: filteredChats,
        messages: updatedMessages,
        activeChat: state.activeChat && idsToRemove.has(state.activeChat.id) ? null : state.activeChat,
      };
    });
  },

  set: (state: Partial<ChatState>) => {
    set(state);
  },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => getZustandChatStorage()),
      partialize: (state) => ({
        chats: state.chats,
        tabs: state.tabs,
        currentTab: state.currentTab,
        messages: state.messages,
        totalUnreadCount: state.totalUnreadCount,
      }),
      // На web пропускаем гидратацию (storage = no-op)
      skipHydration: !isNative,
      version: 1,
    }
  )
);