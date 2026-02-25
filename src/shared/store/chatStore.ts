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
import { getUserById } from '@api/user.api';
import { isMockMode, mockGetChats, mockGetMessages } from '@shared/utils/mockData';
import { useAuthStore } from '@shared/store/authStore';
import { useUserStore } from '@shared/store/userStore';
import { websocketService } from '@services/websocket.service';
import { getZustandChatStorage, isNative } from '@shared/storage';
import { PAGINATION } from '@shared/constants/api.constants';
import { useNotificationStore } from '@shared/store/notificationStore';
import { syncChatsToShareExtension } from '../../../modules/share-data/src/ShareDataModule';

// In-flight user requests cache to prevent duplicate requests
const inFlightUserRequests = new Map<number, Promise<any>>();

// Typing indicator auto-clear timeouts (chatId_userId -> timeout)
// Auto-clears typing indicator after 5 seconds if no stop event received
const typingTimeouts = new Map<string, NodeJS.Timeout>();
const TYPING_TIMEOUT_MS = 5000;

/**
 * Merges updated message with existing message, preserving forward-related fields.
 * This is needed because some API endpoints (pin, unpin, reaction) may not return
 * forward-related fields (original_sender, etc.) in the response.
 */
const mergeMessageWithForwardFields = (existingMsg: Message | undefined, updatedMsg: Message): Message => {
  return {
    ...existingMsg,
    ...updatedMsg,
    // Preserve forward-related fields if they exist locally but not in update
    original_sender: updatedMsg.original_sender || existingMsg?.original_sender,
    original_sender_id: updatedMsg.original_sender_id ?? existingMsg?.original_sender_id,
    is_forwarded: updatedMsg.is_forwarded ?? existingMsg?.is_forwarded,
    forwarded_from_message_id: updatedMsg.forwarded_from_message_id ?? existingMsg?.forwarded_from_message_id,
  } as Message;
};

/**
 * Get user with request deduplication
 * Prevents multiple parallel requests for the same user
 */
const getUserWithDedup = async (userId: number): Promise<any> => {
  const { getCachedUser, cacheUser } = useUserStore.getState();

  // Check cache first
  const cachedUser = getCachedUser(userId);
  if (cachedUser) {
    return cachedUser;
  }

  // Check if there's already a request in flight for this user
  const existingRequest = inFlightUserRequests.get(userId);
  if (existingRequest) {
    return existingRequest;
  }

  // Create new request
  const request = getUserById(userId)
    .then((user) => {
      cacheUser(user);
      inFlightUserRequests.delete(userId);
      return user;
    })
    .catch((error) => {
      inFlightUserRequests.delete(userId);
      console.error(`❌ Failed to fetch user ${userId}:`, error);
      throw error;
    });

  // Store the request promise
  inFlightUserRequests.set(userId, request);

  return request;
};

// Tab data structure for caching
interface TabData {
  pinnedChats: Chat[];
  regularChats: Chat[];
  offset: number;
  hasMore: boolean;
  loaded: boolean;
}

type TabName = 'all' | 'private' | 'group' | 'channel';

interface ChatState {
  chats: Chat[]; // Combined list for current tab (for compatibility)
  tabs: Record<TabName, TabData>;
  currentTab: TabName;
  totalChats: number;
  hasMoreChats: boolean;
  activeChat: Chat | null;
  messages: Record<number, Message[]>;
  pinnedMessages: Record<number, Message[]>; // Закрепленные сообщения по chatId
  threadMessages: Record<number, Message[]>; // Комментарии треда по threadRootId
  isLoading: boolean;
  isLoadingMore: boolean;
  isRefreshingChats: boolean;
  error: string | null;
  typingUsers: Record<number, TypingIndicator[]>;
  totalUnreadCount: number;
  // Desktop mode: selected chat (persisted across tab switches)
  selectedChatId: number | null;
  setSelectedChatId: (chatId: number | null) => void;
  loadTabData: (tabName: TabName) => Promise<void>;
  loadMoreChats: () => Promise<void>;
  refreshCurrentTab: () => Promise<void>;
  silentRefreshCurrentTab: () => Promise<void>;
  switchTab: (tabName: TabName) => void;
  loadUnreadCount: () => Promise<void>;
  // Legacy support - keeping for backward compatibility but will use new tab logic
  loadChats: (append?: boolean, filters?: { type?: 'private' | 'group'; is_favorite?: boolean; is_pinned?: boolean }) => Promise<void>;
  createChat: (name: string, memberIds: number[], type?: 'private' | 'group' | 'channel') => Promise<Chat>;
  updateChat: (chatId: number, data: { name?: string; avatar?: string; avatar_thumbnail?: string; description?: string }) => Promise<void>;
  deleteChat: (chatId: number, clearHistory?: boolean) => Promise<void>;
  leaveChat: (chatId: number) => Promise<void>;
  removeChatMember: (chatId: number, userId: number) => Promise<void>;
  loadMessages: (chatId: number) => Promise<void>;
  loadMoreMessages: (chatId: number, beforeMessageId: number) => Promise<number>;
  loadMoreMessagesAfter: (chatId: number, afterMessageId: number) => Promise<boolean>;
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
  muteChat: (chatId: number, duration: '1h' | '12h' | 'forever') => Promise<void>;
  unmuteChat: (chatId: number) => Promise<void>;
  toggleFavorite: (chatId: number) => Promise<void>;
  handleNewMessage: (message: Message, isLatest?: boolean) => Promise<void>;
  handleMessageUpdate: (message: Message) => void;
  handleMessageDelete: (messageId: number, chatId: number) => void;
  handleChatDelete: (chatId: number) => void;
  handleTypingStart: (chatId: number, typing: TypingIndicator) => void;
  handleTypingStop: (chatId: number, userId: number) => void;
  clearTypingUsers: (chatId: number) => void;
  handleUserJoin: (chatId: number, userId?: number) => void;
  handleUserLeave: (chatId: number, userId?: number) => void;
  handleUserPresence: (presence: any) => void;
  handleMessageRead: (chatId: number, messageId: number, userId?: number) => void;
  handleReaction: (chatId: number, messageId: number, emoji: string, userId?: number, action?: string, user?: any) => void;
  clearError: () => void;
  getChatById: (chatId: number) => Chat | undefined;
  /** Thread messages (channel post comments) */
  handleNewThreadMessage: (threadRootId: number, chatId: number, message: Message) => void;
  setThreadMessages: (threadRootId: number, messages: Message[], total?: number) => void;
  clearThreadMessages: (threadRootId: number) => void;
  /** Merge updated chats (for differential sync) */
  mergeChats: (chats: Chat[]) => void;
  /** Remove deleted chats by IDs (for differential sync) */
  removeChats: (chatIds: number[]) => void;
  set: (state: Partial<ChatState>) => void;
}

// Helper function to enrich chat with user data (with caching and deduplication)
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
        // Use deduplication function
        const user = await getUserWithDedup(member.user_id);
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
  channel: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
};

// Pre-load from localStorage on web (skipHydration prevents auto-rehydration)
let preloadedUnreadCount = 0;
let preloadedChats: Chat[] | null = null;
let preloadedTabs: Record<TabName, TabData> | null = null;
let preloadedCurrentTab: TabName | null = null;
let preloadedMessages: Record<number, Message[]> | null = null;
let preloadedSelectedChatId: number | null = null;
if (!isNative) {
  try {
    const stored = localStorage.getItem('taxion-chat-storage:chat-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.totalUnreadCount !== undefined) {
        preloadedUnreadCount = parsed.state.totalUnreadCount;
      }
      if (Array.isArray(parsed?.state?.chats)) {
        preloadedChats = parsed.state.chats;
      }
      if (parsed?.state?.tabs && typeof parsed.state.tabs === 'object') {
        preloadedTabs = { ...initialTabsState, ...parsed.state.tabs };
      }
      if (parsed?.state?.currentTab) {
        preloadedCurrentTab = parsed.state.currentTab;
      }
      if (parsed?.state?.messages && typeof parsed.state.messages === 'object') {
        preloadedMessages = parsed.state.messages;
      }
      if (parsed?.state?.selectedChatId !== undefined) {
        preloadedSelectedChatId = parsed.state.selectedChatId;
      }
    }
  } catch (error) {
    // Ignore errors, will use initial state
  }
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: preloadedChats || [],
      tabs: preloadedTabs || { ...initialTabsState },
      currentTab: preloadedCurrentTab || 'all',
      totalChats: 0,
      hasMoreChats: true,
      activeChat: null,
      messages: preloadedMessages || {},
      pinnedMessages: {},
      threadMessages: {},
      isLoading: false,
      isLoadingMore: false,
      isRefreshingChats: false,
      error: null,
      typingUsers: {},
      totalUnreadCount: preloadedUnreadCount,
      // Desktop mode: selected chat
      selectedChatId: preloadedSelectedChatId,
      setSelectedChatId: (chatId) => set({ selectedChatId: chatId }),

      // Load data for a specific tab
      loadTabData: async (tabName: TabName) => {
    const { tabs, isLoading } = get();

    // Skip if already loaded or currently loading
    if (tabs[tabName].loaded || isLoading) {
      return;
    }

    set({ isLoading: true, isRefreshingChats: true, error: null });

    try {
      // Determine filters based on tab
      const typeMap: Record<TabName, 'private' | 'group' | 'channel' | undefined> = {
        all: undefined,
        private: 'private',
        group: 'group',
        channel: 'channel',
      };

      const type = typeMap[tabName];

      // 1. Load all pinned chats for this tab
      const pinnedResponse = await chatApi.getPinnedChats(type);
      let pinnedChats = pinnedResponse.chats;

      // Enrich pinned chats with user data
      pinnedChats = await Promise.all(pinnedChats.map(enrichChatWithUsers));

      // 2. Load first page of regular chats
      const limit = 15;
      const filters: any = {};
      if (type) filters.type = type;

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
          isRefreshingChats: false,
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
      set({ error: error.message || `Failed to load ${tabName} chats`, isLoading: false, isRefreshingChats: false });
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

    // Set refreshing flag
    set({ isRefreshingChats: true });

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
    try {
      await get().loadTabData(currentTab);
    } finally {
      set({ isRefreshingChats: false });
    }
  },

  // Silent refresh - updates data without showing loading indicator
  // Used when app comes to foreground to fetch new messages
  silentRefreshCurrentTab: async () => {
    const { currentTab, isLoading, isRefreshingChats } = get();

    // Skip if already loading or refreshing
    if (isLoading || isRefreshingChats) {
      return;
    }

    // Show refreshing indicator in header
    set({ isRefreshingChats: true });

    try {
      // Determine filters based on tab
      const typeMap: Record<TabName, 'private' | 'group' | 'channel' | undefined> = {
        all: undefined,
        private: 'private',
        group: 'group',
        channel: 'channel',
      };

      const type = typeMap[currentTab];

      // 1. Load all pinned chats for this tab
      const pinnedResponse = await chatApi.getPinnedChats(type);
      let pinnedChats = pinnedResponse.chats;

      // Enrich pinned chats with user data
      pinnedChats = await Promise.all(pinnedChats.map(enrichChatWithUsers));

      // 2. Load first page of regular chats
      const limit = 15;
      const filters: any = {};
      if (type) filters.type = type;

      const regularResponse = await chatApi.getChats(limit, 0, Object.keys(filters).length > 0 ? filters : undefined);

      // Filter out pinned chats from regular chats
      const pinnedIds = new Set(pinnedChats.map(c => c.id));
      let regularChats = regularResponse.chats.filter(c => !pinnedIds.has(c.id));

      // Enrich regular chats with user data
      regularChats = await Promise.all(regularChats.map(enrichChatWithUsers));

      // Update state silently (no isLoading changes)
      set(state => ({
        tabs: {
          ...state.tabs,
          [currentTab]: {
            pinnedChats,
            regularChats,
            offset: limit,
            hasMore: regularResponse.hasMore,
            loaded: true,
          }
        },
        chats: [...pinnedChats, ...regularChats],
        hasMoreChats: regularResponse.hasMore,
        totalChats: regularResponse.total,
        isRefreshingChats: false,
      }));

    } catch (error: any) {
      // Silent fail - don't update error state, just log
      console.error('[ChatStore] Silent refresh failed:', error);
      set({ isRefreshingChats: false });
    }
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

      // Sync chats to iOS Share Extension
      const allChats = useChatStore.getState().chats;
      syncChatsToShareExtension(allChats.map(c => ({
        id: c.id,
        name: c.name || 'Без названия',
        type: c.type,
        avatar: c.avatar,
        last_message_content: c.last_message?.content,
        last_message_time: c.last_message?.created_at,
      })));
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
      const typeMap: Record<TabName, 'private' | 'group' | 'channel' | undefined> = {
        all: undefined,
        private: 'private',
        group: 'group',
        channel: 'channel',
      };

      const type = typeMap[currentTab];

      const limit = 15;
      const filters: any = {};
      if (type) filters.type = type;

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

  createChat: async (name: string, memberIds: number[], type: 'private' | 'group' | 'channel' = 'group') => {
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

  updateChat: async (chatId: number, data: { name?: string; avatar?: string; avatar_thumbnail?: string; description?: string }) => {
    try {
      const updatedChat = await chatApi.updateChat(chatId, data);
      set((state) => {
        // Helper to update chat in a list
        const updateChatInList = (chats: Chat[]) =>
          chats.map((chat) =>
            chat.id === chatId ? { ...chat, ...updatedChat } : chat
          );

        // Update all tabs
        const updatedTabs = { ...state.tabs };
        (Object.keys(updatedTabs) as TabName[]).forEach((tabKey) => {
          const tab = updatedTabs[tabKey];
          if (!tab.loaded) return;

          updatedTabs[tabKey] = {
            ...tab,
            pinnedChats: updateChatInList(tab.pinnedChats),
            regularChats: updateChatInList(tab.regularChats),
          };
        });

        // Reconstruct chats for current tab
        const currentTabData = updatedTabs[state.currentTab];
        const updatedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

        return {
          tabs: updatedTabs,
          chats: updatedChats,
          activeChat: state.activeChat?.id === chatId
            ? { ...state.activeChat, ...updatedChat }
            : state.activeChat,
        };
      });
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
      let pinnedMessages: Message[] = [];

      if (isMockMode()) {
        messages = await mockGetMessages(String(chatId));
      } else {
        // NEW API: Use getLatestMessages (cursor-based pagination)
        // Messages are returned in chronological order (oldest → newest)
        const response = await chatApi.getLatestMessages(chatId, {
          limit: PAGINATION.INITIAL_LIMIT,
          include_unread_marker: true,
        });

        // ✅ OPTIMIZATION: If there are many unread messages (>10) and we have first_unread_id,
        // load context around first unread instead of all latest messages
        if (response.unread_info &&
            response.unread_info.unread_count > 10 &&
            response.unread_info.first_unread_id) {

          const contextResponse = await chatApi.getMessageContext(
            chatId,
            response.unread_info.first_unread_id,
            {
              before: 10,  // 10 messages before first unread
              after: 15,   // 15 messages after (including more unread)
            }
          );

          messages = contextResponse.messages;
          pinnedMessages = response.pinned_messages || [];
        } else {
          // Normal case: load latest messages
          messages = response.messages;
          pinnedMessages = response.pinned_messages || [];
        }
      }

      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: messages,
        },
        pinnedMessages: {
          ...state.pinnedMessages,
          [chatId]: pinnedMessages,
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
        limit: PAGINATION.DEFAULT_LIMIT,
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

  loadMoreMessagesAfter: async (chatId: number, afterMessageId: number) => {
    try {
      // NEW API: Use getMessagesAfter (cursor-based pagination for scrolling down)
      const response = await chatApi.getMessagesAfter(chatId, afterMessageId, {
        limit: PAGINATION.DEFAULT_LIMIT,
      });

      const responseMessages = response.messages || [];

      if (responseMessages.length > 0) {
        set((state) => {
          const existingMessages = state.messages[chatId] || [];
          const existingIds = new Set(existingMessages.map(m => m.id));

          // Filter duplicates - add only new messages
          // Messages are in chronological order (oldest → newest)
          const newMessages = responseMessages.filter(msg => !existingIds.has(msg.id));

          return {
            messages: {
              ...state.messages,
              [chatId]: [...existingMessages, ...newMessages], // Add new messages at the END
            },
          };
        });
      }

      // Return true if there are more newer messages, false otherwise
      return response.has_older; // Note: has_older from response maps to has_newer
    } catch (error: any) {
      console.error(`Failed to load messages after ${afterMessageId} for chat ${chatId}:`, error);
      set({ error: error.message || 'Failed to load newer messages' });
      return false;
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
      // При пересылке контент может быть пустым - бэкенд скопирует из оригинала
      const isForwarding = extraData?.forward_from_message_id != null;
      if (!content.trim() && (!fileIds || fileIds.length === 0) && !isForwarding) {
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
      set((state) => {
        const existingMessages = state.messages[updatedMessage.chat_id] || [];
        const existingMsg = existingMessages.find(m => m.id === messageId);

        // Мержим сообщение, сохраняя forward-related поля
        const mergedMessage = {
          ...existingMsg,
          ...updatedMessage,
          original_sender: updatedMessage.original_sender || existingMsg?.original_sender,
          original_sender_id: updatedMessage.original_sender_id ?? existingMsg?.original_sender_id,
          is_forwarded: updatedMessage.is_forwarded ?? existingMsg?.is_forwarded,
          forwarded_from_message_id: updatedMessage.forwarded_from_message_id ?? existingMsg?.forwarded_from_message_id,
        };

        return {
          messages: {
            ...state.messages,
            [updatedMessage.chat_id]: existingMessages.map((msg) =>
              msg.id === messageId ? mergedMessage : msg
            ),
          },
        };
      });
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

      // Очищаем сообщения локально и обновляем last_message в чате
      set((state) => {
        // Функция для обновления last_message в чате
        const updateChatLastMessage = (chat: Chat): Chat => {
          if (chat.id === chatId) {
            return { ...chat, last_message: undefined };
          }
          return chat;
        };

        // Обновляем чаты во всех табах
        const updatedTabs = { ...state.tabs };
        Object.keys(updatedTabs).forEach(tabKey => {
          const tab = updatedTabs[tabKey as TabName];
          if (tab.loaded) {
            updatedTabs[tabKey as TabName] = {
              ...tab,
              pinnedChats: tab.pinnedChats.map(updateChatLastMessage),
              regularChats: tab.regularChats.map(updateChatLastMessage),
            };
          }
        });

        // Обновляем текущий список чатов
        const currentTabData = updatedTabs[state.currentTab];
        const updatedChats = currentTabData
          ? [...currentTabData.pinnedChats, ...currentTabData.regularChats]
          : state.chats.map(updateChatLastMessage);

        return {
          messages: {
            ...state.messages,
            [chatId]: [],
          },
          tabs: updatedTabs,
          chats: updatedChats,
        };
      });
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
      // Обновляем сообщение локально, сохраняя forward-related поля
      set((state) => {
        const chatId = updatedMessage.chat_id;
        const existingPinned = state.pinnedMessages[chatId] || [];
        const existingMessages = state.messages[chatId] || [];

        // Находим существующее сообщение для мержа forward-related полей
        const existingMsg = existingMessages.find(m => m.id === messageId);

        // Мержим сообщение, сохраняя forward-related поля
        const mergedMessage = {
          ...existingMsg,
          ...updatedMessage,
          original_sender: updatedMessage.original_sender || existingMsg?.original_sender,
          original_sender_id: updatedMessage.original_sender_id ?? existingMsg?.original_sender_id,
          is_forwarded: updatedMessage.is_forwarded ?? existingMsg?.is_forwarded,
          forwarded_from_message_id: updatedMessage.forwarded_from_message_id ?? existingMsg?.forwarded_from_message_id,
        };

        // Добавляем в закрепленные (если еще нет)
        const isAlreadyPinned = existingPinned.some(m => m.id === messageId);
        const newPinned = isAlreadyPinned
          ? existingPinned.map(m => m.id === messageId ? mergedMessage : m)
          : [mergedMessage, ...existingPinned]; // Добавляем в начало

        return {
          messages: {
            ...state.messages,
            [chatId]: existingMessages.map((msg) =>
              msg.id === messageId ? mergedMessage : msg
            ),
          },
          pinnedMessages: {
            ...state.pinnedMessages,
            [chatId]: newPinned,
          },
        };
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to pin message' });
      throw error;
    }
  },

  unpinMessage: async (messageId: number) => {
    try {
      const updatedMessage = await chatApi.unpinMessage(messageId);
      // Обновляем сообщение локально, сохраняя forward-related поля
      set((state) => {
        const chatId = updatedMessage.chat_id;
        const existingPinned = state.pinnedMessages[chatId] || [];
        const existingMessages = state.messages[chatId] || [];

        // Находим существующее сообщение для мержа forward-related полей
        const existingMsg = existingMessages.find(m => m.id === messageId);

        // Мержим сообщение, сохраняя forward-related поля
        const mergedMessage = {
          ...existingMsg,
          ...updatedMessage,
          original_sender: updatedMessage.original_sender || existingMsg?.original_sender,
          original_sender_id: updatedMessage.original_sender_id ?? existingMsg?.original_sender_id,
          is_forwarded: updatedMessage.is_forwarded ?? existingMsg?.is_forwarded,
          forwarded_from_message_id: updatedMessage.forwarded_from_message_id ?? existingMsg?.forwarded_from_message_id,
        };

        // Удаляем из закрепленных
        const newPinned = existingPinned.filter(m => m.id !== messageId);

        return {
          messages: {
            ...state.messages,
            [chatId]: existingMessages.map((msg) =>
              msg.id === messageId ? mergedMessage : msg
            ),
          },
          pinnedMessages: {
            ...state.pinnedMessages,
            [chatId]: newPinned,
          },
        };
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to unpin message' });
      throw error;
    }
  },

  getPinnedMessages: (chatId: number) => {
    // Возвращаем закрепленные сообщения из отдельного поля
    return get().pinnedMessages[chatId] || [];
  },

  addReaction: async (messageId: number, emoji: string) => {
    try {
      const currentUser = useAuthStore.getState().user;
      const userId = currentUser?.id || 0;

      // Find chatId for this message
      let chatId: number | undefined;
      const state = get();
      for (const [cid, msgs] of Object.entries(state.messages)) {
        if (msgs.find(m => m.id === messageId)) {
          chatId = Number(cid);
          break;
        }
      }

      const newReaction = {
        id: Date.now(),
        message_id: messageId,
        user_id: userId,
        user: currentUser || undefined,
        emoji,
        created_at: new Date().toISOString(),
      };

      // Optimistic update for messages and threadMessages
      set((state) => {
        const updates: any = {};

        // Update messages
        if (chatId !== undefined) {
          updates.messages = {
            ...state.messages,
            [chatId!]: (state.messages[chatId!] || []).map((msg) => {
              if (msg.id === messageId) {
                const exists = msg.reactions?.some(r => r.emoji === emoji && r.user_id === userId);
                if (exists) return msg;
                return { ...msg, reactions: [...(msg.reactions || []), newReaction] };
              }
              return msg;
            }),
          };
        }

        // Update threadMessages
        const updatedThreadMessages = { ...state.threadMessages };
        let threadUpdated = false;
        for (const [rootId, msgs] of Object.entries(updatedThreadMessages)) {
          const idx = msgs.findIndex(m => m.id === messageId);
          if (idx !== -1) {
            const msg = msgs[idx];
            const exists = msg.reactions?.some(r => r.emoji === emoji && r.user_id === userId);
            if (!exists) {
              updatedThreadMessages[Number(rootId)] = msgs.map((m, i) =>
                i === idx ? { ...m, reactions: [...(m.reactions || []), newReaction] } : m
              );
              threadUpdated = true;
            }
            break;
          }
        }
        if (threadUpdated) updates.threadMessages = updatedThreadMessages;

        return updates;
      });

      await chatApi.addReaction(messageId, { emoji });
    } catch (error: any) {
      set({ error: error.message || 'Failed to add reaction' });
    }
  },

  removeReaction: async (messageId: number, emoji: string) => {
    try {
      const currentUser = useAuthStore.getState().user;
      const userId = currentUser?.id || 0;

      // Find chatId for this message
      let chatId: number | undefined;
      const state = get();
      for (const [cid, msgs] of Object.entries(state.messages)) {
        if (msgs.find(m => m.id === messageId)) {
          chatId = Number(cid);
          break;
        }
      }

      // Optimistic update for messages and threadMessages
      set((state) => {
        const updates: any = {};

        // Update messages
        if (chatId !== undefined) {
          updates.messages = {
            ...state.messages,
            [chatId!]: (state.messages[chatId!] || []).map((msg) => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  reactions: (msg.reactions || []).filter(
                    (r) => !(r.emoji === emoji && r.user_id === userId)
                  ),
                };
              }
              return msg;
            }),
          };
        }

        // Update threadMessages
        const updatedThreadMessages = { ...state.threadMessages };
        let threadUpdated = false;
        for (const [rootId, msgs] of Object.entries(updatedThreadMessages)) {
          const idx = msgs.findIndex(m => m.id === messageId);
          if (idx !== -1) {
            updatedThreadMessages[Number(rootId)] = msgs.map((m, i) =>
              i === idx ? { ...m, reactions: (m.reactions || []).filter((r) => !(r.emoji === emoji && r.user_id === userId)) } : m
            );
            threadUpdated = true;
            break;
          }
        }
        if (threadUpdated) updates.threadMessages = updatedThreadMessages;

        return updates;
      });

      await chatApi.removeReaction(messageId, emoji);
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

      // Backend also marks message notifications as read for this chat.
      // Sync the notification store: mark local notifications for this chat as read
      // and refresh the unread count from the server.
      const notificationStore = useNotificationStore.getState();
      notificationStore.markNotificationsReadByChat(chatId);
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
            // Add new pinned chat at the end (but saved chat always stays first)
            const newPinnedChats = [...tab.pinnedChats, chat].sort((a, b) => {
              // Saved chat always first
              if (a.type === 'saved' && b.type !== 'saved') return -1;
              if (a.type !== 'saved' && b.type === 'saved') return 1;
              return 0; // Keep relative order for other chats
            });

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

  muteChat: async (chatId: number, duration: '1h' | '12h' | 'forever' = 'forever') => {
    try {
      // Optimistic update — tabs + chats
      const updateMuted = (c: Chat) =>
        c.id === chatId ? { ...c, is_muted: true } : c;

      set((state) => {
        const updatedTabs = { ...state.tabs };
        Object.keys(updatedTabs).forEach(tabKey => {
          const tab = updatedTabs[tabKey as TabName];
          if (!tab.loaded) return;
          updatedTabs[tabKey as TabName] = {
            ...tab,
            pinnedChats: tab.pinnedChats.map(updateMuted),
            regularChats: tab.regularChats.map(updateMuted),
          };
        });
        const currentTabData = updatedTabs[state.currentTab];
        return {
          tabs: updatedTabs,
          chats: [...currentTabData.pinnedChats, ...currentTabData.regularChats],
        };
      });

      const result = await chatApi.muteChat(chatId, duration);

      // Update with server response (muted_until)
      const updateWithResult = (c: Chat) =>
        c.id === chatId ? { ...c, is_muted: true, muted_until: result.muted_until } : c;

      set((state) => {
        const updatedTabs = { ...state.tabs };
        Object.keys(updatedTabs).forEach(tabKey => {
          const tab = updatedTabs[tabKey as TabName];
          if (!tab.loaded) return;
          updatedTabs[tabKey as TabName] = {
            ...tab,
            pinnedChats: tab.pinnedChats.map(updateWithResult),
            regularChats: tab.regularChats.map(updateWithResult),
          };
        });
        const currentTabData = updatedTabs[state.currentTab];
        return {
          tabs: updatedTabs,
          chats: [...currentTabData.pinnedChats, ...currentTabData.regularChats],
        };
      });
    } catch (error: any) {
      // Revert optimistic update
      const revertMuted = (c: Chat) =>
        c.id === chatId ? { ...c, is_muted: false, muted_until: null } : c;

      set((state) => {
        const updatedTabs = { ...state.tabs };
        Object.keys(updatedTabs).forEach(tabKey => {
          const tab = updatedTabs[tabKey as TabName];
          if (!tab.loaded) return;
          updatedTabs[tabKey as TabName] = {
            ...tab,
            pinnedChats: tab.pinnedChats.map(revertMuted),
            regularChats: tab.regularChats.map(revertMuted),
          };
        });
        const currentTabData = updatedTabs[state.currentTab];
        return {
          tabs: updatedTabs,
          chats: [...currentTabData.pinnedChats, ...currentTabData.regularChats],
          error: error.message || 'Failed to mute chat',
        };
      });
      throw error;
    }
  },

  unmuteChat: async (chatId: number) => {
    try {
      // Optimistic update — tabs + chats
      const updateUnmuted = (c: Chat) =>
        c.id === chatId ? { ...c, is_muted: false, muted_until: null } : c;

      set((state) => {
        const updatedTabs = { ...state.tabs };
        Object.keys(updatedTabs).forEach(tabKey => {
          const tab = updatedTabs[tabKey as TabName];
          if (!tab.loaded) return;
          updatedTabs[tabKey as TabName] = {
            ...tab,
            pinnedChats: tab.pinnedChats.map(updateUnmuted),
            regularChats: tab.regularChats.map(updateUnmuted),
          };
        });
        const currentTabData = updatedTabs[state.currentTab];
        return {
          tabs: updatedTabs,
          chats: [...currentTabData.pinnedChats, ...currentTabData.regularChats],
        };
      });

      await chatApi.unmuteChat(chatId);
    } catch (error: any) {
      // Revert optimistic update
      const revertUnmuted = (c: Chat) =>
        c.id === chatId ? { ...c, is_muted: true } : c;

      set((state) => {
        const updatedTabs = { ...state.tabs };
        Object.keys(updatedTabs).forEach(tabKey => {
          const tab = updatedTabs[tabKey as TabName];
          if (!tab.loaded) return;
          updatedTabs[tabKey as TabName] = {
            ...tab,
            pinnedChats: tab.pinnedChats.map(revertUnmuted),
            regularChats: tab.regularChats.map(revertUnmuted),
          };
        });
        const currentTabData = updatedTabs[state.currentTab];
        return {
          tabs: updatedTabs,
          chats: [...currentTabData.pinnedChats, ...currentTabData.regularChats],
          error: error.message || 'Failed to unmute chat',
        };
      });
      throw error;
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

          // Обновляем флаг favorite во всех табах
          updatedTabs[tabKey as TabName] = {
            ...tab,
            pinnedChats: tab.pinnedChats.map(updateChatFavorite),
            regularChats: tab.regularChats.map(updateChatFavorite),
          };
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

          // ⚠️ ВАЖНО: Используем last_message из fetchedChat если оно новее текущего message
          let lastMessage = message;
          if (fetchedChat.last_message) {
            const fetchedLastTime = new Date(fetchedChat.last_message.created_at).getTime();
            const newMessageTime = new Date(message.created_at).getTime();
            // Если сообщение из fetchedChat новее - используем его
            if (fetchedLastTime > newMessageTime ||
                (fetchedLastTime === newMessageTime && fetchedChat.last_message.id > message.id)) {
              lastMessage = fetchedChat.last_message;
            }
          }

          const chatWithMessage = {
            ...fetchedChat,
            last_message: lastMessage,
            unread_count: shouldIncrementUnread ? 1 : 0,
          };

          // Определяем в какой таб добавить чат
          const updatedTabs = { ...state.tabs };
          const chatType = fetchedChat.type || 'private'; // Default to private if type is missing

          // Добавляем в соответствующие табы
          const typeTabMap: Record<string, TabName | null> = { private: 'private', group: 'group', channel: 'channel' };
          ['all', typeTabMap[chatType] || null]
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
          // Обновляем существующее сообщение свежими данными, но сохраняем вложения
          // если входящее сообщение (из WebSocket) содержит меньше вложений чем существующее (из API)
          const updatedMessages = {
            ...state.messages,
            [message.chat_id]: existingMessages.map(msg => {
              if (msg.id !== message.id) return msg;
              const existingAttachments = msg.attachments || [];
              const incomingAttachments = message.attachments || [];
              // Сохраняем существующие вложения если их больше (API ответ полнее чем WS)
              const mergedAttachments = incomingAttachments.length >= existingAttachments.length
                ? incomingAttachments
                : existingAttachments;
              return { ...msg, ...message, attachments: mergedAttachments };
            }),
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

            // ⚠️ ВАЖНО: Обновляем last_message только если новое сообщение ДЕЙСТВИТЕЛЬНО новее
            // Проверяем по ID (большее ID = новее) или по дате создания
            let shouldUpdateLastMessage = true;
            if (chat.last_message) {
              const currentLastMessageTime = new Date(chat.last_message.created_at).getTime();
              const newMessageTime = new Date(message.created_at).getTime();
              // Обновляем только если новое сообщение новее (или равно по времени, но с большим ID)
              shouldUpdateLastMessage = newMessageTime > currentLastMessageTime ||
                (newMessageTime === currentLastMessageTime && message.id > chat.last_message.id);
            }

            const updatedChat = {
              ...chat,
              last_message: shouldUpdateLastMessage ? message : chat.last_message,
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
    // Для каналов: удалённые root-посты полностью убираем из UI
    const chatForUpdate = get().chats.find(c => c.id === message.chat_id);
    if (chatForUpdate?.type === 'channel' && message.is_deleted && !(message as any).thread_root_id) {
      get().handleMessageDelete(message.id, message.chat_id);
      return;
    }

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

    // Parse link_preview if it's a JSON string (comes from WebSocket)
    if ((message as any).link_preview && typeof (message as any).link_preview === 'string') {
      try {
        updatedMessage.link_preview = JSON.parse((message as any).link_preview);
      } catch (e) {
        console.error('❌ Failed to parse link_preview in WebSocket update:', e);
      }
    }

    set((state) => {
      // Update messages with merge logic to preserve important fields
      const updatedMessages = {
        ...state.messages,
        [message.chat_id]: (state.messages[message.chat_id] || []).map((msg) => {
          if (msg.id !== message.id) return msg;

          // Merge: keep local original_sender if WebSocket didn't provide it
          // This handles cases like pin/unpin where WS may not include all relations
          return {
            ...msg, // Keep existing local data as base
            ...updatedMessage, // Override with WebSocket data
            // Preserve forward-related fields if they exist locally but not in update
            original_sender: updatedMessage.original_sender || msg.original_sender,
            original_sender_id: updatedMessage.original_sender_id ?? msg.original_sender_id,
            is_forwarded: updatedMessage.is_forwarded ?? msg.is_forwarded,
            forwarded_from_message_id: updatedMessage.forwarded_from_message_id ?? msg.forwarded_from_message_id,
          };
        }),
      };

      // Helper function to update last_message in chat if needed
      const updateChatLastMessage = (chat: Chat) => {
        if (chat.id === message.chat_id && chat.last_message?.id === message.id) {
          // Merge last_message to preserve forward-related fields
          const mergedLastMessage = {
            ...chat.last_message,
            ...updatedMessage,
            original_sender: updatedMessage.original_sender || chat.last_message?.original_sender,
            original_sender_id: updatedMessage.original_sender_id ?? chat.last_message?.original_sender_id,
            is_forwarded: updatedMessage.is_forwarded ?? chat.last_message?.is_forwarded,
            forwarded_from_message_id: updatedMessage.forwarded_from_message_id ?? chat.last_message?.forwarded_from_message_id,
          };
          return { ...chat, last_message: mergedLastMessage };
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
    const chat = get().chats.find(c => c.id === chatId);

    // Для каналов: полностью убираем пост из UI (без плейсхолдера «Сообщение удалено»)
    if (chat?.type === 'channel') {
      set((state) => {
        const updatedChatMessages = (state.messages[chatId] || []).filter(
          msg => msg.id !== messageId
        );

        // Обновляем last_message если удалённый пост был последним
        const needsLastMessageUpdate = chat.last_message?.id === messageId;
        const newLastMessage = needsLastMessageUpdate
          ? updatedChatMessages[updatedChatMessages.length - 1] || undefined
          : undefined;

        const updateChat = (c: Chat): Chat => {
          if (c.id === chatId && needsLastMessageUpdate) {
            return { ...c, last_message: newLastMessage };
          }
          return c;
        };

        const updatedTabs = { ...state.tabs };
        Object.keys(updatedTabs).forEach(tabKey => {
          const tab = updatedTabs[tabKey as TabName];
          if (tab.loaded) {
            updatedTabs[tabKey as TabName] = {
              ...tab,
              pinnedChats: tab.pinnedChats.map(updateChat),
              regularChats: tab.regularChats.map(updateChat),
            };
          }
        });

        const currentTabData = updatedTabs[state.currentTab];
        const updatedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

        return {
          messages: { ...state.messages, [chatId]: updatedChatMessages },
          tabs: updatedTabs,
          chats: updatedChats,
        };
      });
      return;
    }

    // Для остальных типов чатов: помечаем как удалённое с плейсхолдером
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                is_deleted: true,
                content: '', // Очищаем контент для всех пользователей
                attachments: [], // Очищаем вложения удалённого сообщения
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

      // Сбрасываем selectedChatId если это был удаленный чат (для desktop mode)
      const updatedSelectedChatId = state.selectedChatId === chatId ? null : state.selectedChatId;

      return {
        ...state,
        chats: updatedChats,
        tabs: updatedTabs,
        messages: updatedMessages,
        activeChat: updatedActiveChat,
        selectedChatId: updatedSelectedChatId,
      };
    });
  },

  handleTypingStart: async (chatId: number, typing: TypingIndicator) => {
    // Load user data if not present (with caching and deduplication)
    if (!typing.user) {
      try {
        // Use deduplication function
        const user = await getUserWithDedup(typing.user_id);
        typing = { ...typing, user };
      } catch (error) {
        console.error(`Failed to load user for typing indicator:`, error);
      }
    }

    // Clear existing timeout for this user (reset timer on new typing event)
    const timeoutKey = `${chatId}_${typing.user_id}`;
    const existingTimeout = typingTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set auto-clear timeout (5 seconds)
    // This ensures typing indicator is cleared even if stop event is lost
    const timeout = setTimeout(() => {
      typingTimeouts.delete(timeoutKey);
      get().handleTypingStop(chatId, typing.user_id);
    }, TYPING_TIMEOUT_MS);
    typingTimeouts.set(timeoutKey, timeout);

    set((state) => {
      const currentTyping = state.typingUsers[chatId] || [];
      const existingIndex = currentTyping.findIndex((t) => t.user_id === typing.user_id);
      if (existingIndex >= 0) {
        // Update action if changed (e.g. typing -> uploading_photo)
        if (currentTyping[existingIndex].action === typing.action) {
          return state;
        }
        const updated = [...currentTyping];
        updated[existingIndex] = { ...updated[existingIndex], action: typing.action };
        return {
          typingUsers: {
            ...state.typingUsers,
            [chatId]: updated,
          },
        };
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
    // Clear timeout when stop event received
    const timeoutKey = `${chatId}_${userId}`;
    const existingTimeout = typingTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      typingTimeouts.delete(timeoutKey);
    }

    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [chatId]: (state.typingUsers[chatId] || []).filter((t) => t.user_id !== userId),
      },
    }));
  },

  clearTypingUsers: (chatId: number) => {
    // Clear all timeouts for this chat
    typingTimeouts.forEach((timeout, key) => {
      if (key.startsWith(`${chatId}_`)) {
        clearTimeout(timeout);
        typingTimeouts.delete(key);
      }
    });

    set((state) => {
      const { [chatId]: _, ...rest } = state.typingUsers;
      return { typingUsers: rest };
    });
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

    let updatedCount = 0;

    // Helper function to update chat members with new presence
    const updateChatMembers = (chat: Chat): Chat => {
      if (!chat.members) {
        return chat;
      }

      // Check if user is a member of this chat
      const memberIndex = chat.members.findIndex(m => m.user_id === user_id);
      if (memberIndex === -1) {
        return chat;
      }

      const member = chat.members[memberIndex];

      // Debug: Check if member.user exists
      if (!member.user) {
        return chat;
      }

      updatedCount++;

      // Update the member's user status
      const updatedMembers = chat.members.map(m => {
        if (m.user_id === user_id && m.user) {
          const updatedUser = {
            ...m.user,
            status,
            last_seen_at: lastActiveTime || m.user.last_seen_at,
            // Also update last_active_at if it exists in the user object
            ...(last_active_at ? { last_active_at } : {}),
          };
          return {
            ...m,
            user: updatedUser,
          };
        }
        return m;
      });

      return { ...chat, members: updatedMembers };
    };

    set((state) => {
      // Update chats array
      const updatedChats = state.chats.map(updateChatMembers);

      // Update tabs (pinnedChats and regularChats in each tab)
      const updatedTabs = { ...state.tabs };
      (Object.keys(updatedTabs) as TabName[]).forEach(tabKey => {
        const tab = updatedTabs[tabKey];
        updatedTabs[tabKey] = {
          ...tab,
          pinnedChats: tab.pinnedChats.map(updateChatMembers),
          regularChats: tab.regularChats.map(updateChatMembers),
        };
      });


      return {
        chats: updatedChats,
        tabs: updatedTabs,
      };
    });
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

  handleReaction: (chatId: number, messageId: number, emoji: string, userId?: number, action?: string, user?: any) => {
    const applyReaction = (msg: Message): Message => {
      if (msg.id !== messageId) return msg;
      if (action === 'removed') {
        return { ...msg, reactions: msg.reactions.filter((r) => !(r.emoji === emoji && r.user_id === userId)) };
      }
      if (msg.reactions.find((r) => r.emoji === emoji && r.user_id === userId)) return msg;
      return {
        ...msg,
        reactions: [...msg.reactions, { id: Date.now(), message_id: messageId, user_id: userId || 0, user: user || undefined, emoji, created_at: new Date().toISOString() }],
      };
    };

    set((state) => {
      const updates: any = {
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).map(applyReaction),
        },
      };

      // Also update threadMessages
      const updatedThreadMessages = { ...state.threadMessages };
      let threadUpdated = false;
      for (const [rootId, msgs] of Object.entries(updatedThreadMessages)) {
        if (msgs.some(m => m.id === messageId)) {
          updatedThreadMessages[Number(rootId)] = msgs.map(applyReaction);
          threadUpdated = true;
          break;
        }
      }
      if (threadUpdated) updates.threadMessages = updatedThreadMessages;

      return updates;
    });
  },

  clearError: () => {
    set({ error: null });
  },

  getChatById: (chatId: number) => {
    return get().chats.find((chat) => chat.id === chatId);
  },

  // Thread messages (channel post comments)
  handleNewThreadMessage: (threadRootId: number, chatId: number, message: Message) => {
    set((state) => {
      const existing = state.threadMessages[threadRootId] || [];
      // Deduplicate
      if (existing.some(m => m.id === message.id)) return state;
      return {
        threadMessages: {
          ...state.threadMessages,
          [threadRootId]: [...existing, message],
        },
      };
    });
  },

  setThreadMessages: (threadRootId: number, messages: Message[]) => {
    set((state) => ({
      threadMessages: {
        ...state.threadMessages,
        [threadRootId]: messages,
      },
    }));
  },

  clearThreadMessages: (threadRootId: number) => {
    set((state) => {
      const updated = { ...state.threadMessages };
      delete updated[threadRootId];
      return { threadMessages: updated };
    });
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
        selectedChatId: state.selectedChatId, // Desktop mode: persist selected chat
      }),
      merge: (persistedState: any, currentState: ChatState) => ({
        ...currentState,
        ...persistedState,
        // Deep-merge tabs so new tab keys (e.g. 'channel') are always present
        tabs: {
          ...initialTabsState,
          ...currentState.tabs,
          ...(persistedState?.tabs || {}),
        },
      }),
      // На web пропускаем гидратацию (storage = no-op)
      skipHydration: !isNative,
      version: 3,
    }
  )
);