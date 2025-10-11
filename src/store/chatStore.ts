/**
 * Chat Store
 * Zustand store для управления чатами и сообщениями
 */

import { create } from 'zustand';
import { Chat, Message, TypingIndicator } from '@types/chat.types';
import * as chatApi from '@api/chat.api';
import { isMockMode, mockGetChats } from '@utils/mockData';

interface ChatState {
  // State
  chats: Chat[];
  activeChat: Chat | null;
  messages: Record<number, Message[]>; // chatId -> messages
  isLoading: boolean;
  error: string | null;
  typingUsers: Record<number, TypingIndicator[]>; // chatId -> typing users

  // Actions
  loadChats: () => Promise<void>;
  createChat: (name: string, memberIds: number[], type?: 'private' | 'group') => Promise<Chat>;
  loadMessages: (chatId: number) => Promise<void>;
  loadMoreMessages: (chatId: number, beforeMessageId: number) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  sendMessage: (chatId: number, content: string, replyToId?: number) => Promise<void>;
  updateMessage: (messageId: number, content: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  addReaction: (messageId: number, emoji: string) => Promise<void>;
  removeReaction: (messageId: number, emoji: string) => Promise<void>;
  markMessageRead: (messageId: number) => Promise<void>;
  pinChat: (chatId: number) => Promise<void>;
  unpinChat: (chatId: number) => Promise<void>;
  muteChat: (chatId: number) => Promise<void>;
  unmuteChat: (chatId: number) => Promise<void>;

  // WebSocket handlers
  handleNewMessage: (message: Message) => void;
  handleMessageUpdate: (message: Message) => void;
  handleMessageDelete: (messageId: number, chatId: number) => void;
  handleTypingStart: (chatId: number, typing: TypingIndicator) => void;
  handleTypingStop: (chatId: number, userId: number) => void;

  // Utility
  clearError: () => void;
  getChatById: (chatId: number) => Chat | undefined;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  chats: [],
  activeChat: null,
  messages: {},
  isLoading: false,
  error: null,
  typingUsers: {},

  /**
   * Load all chats
   */
  loadChats: async () => {
    try {
      set({ isLoading: true, error: null });

      let chats;
      if (isMockMode()) {
        console.log('🔧 Using mock chats');
        chats = await mockGetChats();
      } else {
        chats = await chatApi.getChats();
      }

      set({ chats, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to load chats', isLoading: false });
    }
  },

  /**
   * Create new chat
   */
  createChat: async (name: string, memberIds: number[], type: 'private' | 'group' = 'group') => {
    try {
      set({ isLoading: true, error: null });
      const newChat = await chatApi.createChat({
        type,
        name,
        member_ids: memberIds,
      });

      set((state) => ({
        chats: [newChat, ...state.chats],
        isLoading: false,
      }));

      return newChat;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create chat', isLoading: false });
      throw error;
    }
  },

  /**
   * Load messages for a chat
   */
  loadMessages: async (chatId: number) => {
    try {
      set({ isLoading: true, error: null });
      const response = await chatApi.getMessages(chatId, { limit: 50 });

      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: response.data.reverse(), // Reverse to show oldest first
        },
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to load messages', isLoading: false });
    }
  },

  /**
   * Load more messages (pagination)
   */
  loadMoreMessages: async (chatId: number, beforeMessageId: number) => {
    try {
      const response = await chatApi.getMessages(chatId, {
        limit: 50,
        before_message_id: beforeMessageId,
      });

      if (response.data.length > 0) {
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: [...response.data.reverse(), ...(state.messages[chatId] || [])],
          },
        }));
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to load more messages' });
    }
  },

  /**
   * Set active chat
   */
  setActiveChat: (chat: Chat | null) => {
    set({ activeChat: chat });

    // Load messages if not already loaded
    if (chat && !get().messages[chat.id]) {
      get().loadMessages(chat.id);
    }
  },

  /**
   * Send message
   */
  sendMessage: async (chatId: number, content: string, replyToId?: number) => {
    try {
      const message = await chatApi.sendMessage(chatId, {
        content,
        reply_to_id: replyToId,
      });

      // Add message to local state
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: [...(state.messages[chatId] || []), message],
        },
      }));

      // Update chat's last message
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, last_message: message } : chat
        ),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to send message' });
      throw error;
    }
  },

  /**
   * Update message
   */
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

  /**
   * Delete message
   */
  deleteMessage: async (messageId: number) => {
    try {
      await chatApi.deleteMessage(messageId);

      // Remove from local state via WebSocket handler
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete message' });
      throw error;
    }
  },

  /**
   * Add reaction
   */
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

  /**
   * Remove reaction
   */
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

  /**
   * Mark message as read
   */
  markMessageRead: async (messageId: number) => {
    try {
      await chatApi.markMessageRead(messageId);
    } catch (error: any) {
      console.error('Failed to mark message as read:', error);
    }
  },

  /**
   * Pin chat
   */
  pinChat: async (chatId: number) => {
    try {
      const updatedChat = await chatApi.pinChat(chatId);

      set((state) => ({
        chats: state.chats.map((chat) => (chat.id === chatId ? updatedChat : chat)),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to pin chat' });
    }
  },

  /**
   * Unpin chat
   */
  unpinChat: async (chatId: number) => {
    try {
      const updatedChat = await chatApi.unpinChat(chatId);

      set((state) => ({
        chats: state.chats.map((chat) => (chat.id === chatId ? updatedChat : chat)),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to unpin chat' });
    }
  },

  /**
   * Mute chat
   */
  muteChat: async (chatId: number) => {
    try {
      const updatedChat = await chatApi.muteChat(chatId);

      set((state) => ({
        chats: state.chats.map((chat) => (chat.id === chatId ? updatedChat : chat)),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to mute chat' });
    }
  },

  /**
   * Unmute chat
   */
  unmuteChat: async (chatId: number) => {
    try {
      const updatedChat = await chatApi.unmuteChat(chatId);

      set((state) => ({
        chats: state.chats.map((chat) => (chat.id === chatId ? updatedChat : chat)),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to unmute chat' });
    }
  },

  // ============= WebSocket Handlers =============

  /**
   * Handle new message from WebSocket
   */
  handleNewMessage: (message: Message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [message.chat_id]: [...(state.messages[message.chat_id] || []), message],
      },
      chats: state.chats.map((chat) =>
        chat.id === message.chat_id
          ? { ...chat, last_message: message, unread_count: chat.unread_count + 1 }
          : chat
      ),
    }));
  },

  /**
   * Handle message update from WebSocket
   */
  handleMessageUpdate: (message: Message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [message.chat_id]: (state.messages[message.chat_id] || []).map((msg) =>
          msg.id === message.id ? message : msg
        ),
      },
    }));
  },

  /**
   * Handle message delete from WebSocket
   */
  handleMessageDelete: (messageId: number, chatId: number) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).filter((msg) => msg.id !== messageId),
      },
    }));
  },

  /**
   * Handle typing start
   */
  handleTypingStart: (chatId: number, typing: TypingIndicator) => {
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

  /**
   * Handle typing stop
   */
  handleTypingStop: (chatId: number, userId: number) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [chatId]: (state.typingUsers[chatId] || []).filter((t) => t.user_id !== userId),
      },
    }));
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Get chat by ID
   */
  getChatById: (chatId: number) => {
    return get().chats.find((chat) => chat.id === chatId);
  },
}));
