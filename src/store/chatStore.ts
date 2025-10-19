/**
 * Chat Store
 * Zustand store для управления чатами и сообщениями
 */

import { create } from 'zustand';
import { Chat, Message, TypingIndicator, MessageType } from '../types/chat.types';
import * as chatApi from '@api/chat.api';
import { isMockMode, mockGetChats } from '@utils/mockData';
import { useAuthStore } from '@store/authStore';
import { websocketService } from '@services/websocket.service';

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Record<number, Message[]>;
  isLoading: boolean;
  error: string | null;
  typingUsers: Record<number, TypingIndicator[]>;
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
  markChatAsRead: (chatId: number) => Promise<void>;
  pinChat: (chatId: number) => Promise<void>;
  unpinChat: (chatId: number) => Promise<void>;
  muteChat: (chatId: number) => Promise<void>;
  unmuteChat: (chatId: number) => Promise<void>;
  handleNewMessage: (message: Message) => void;
  handleMessageUpdate: (message: Message) => void;
  handleMessageDelete: (messageId: number, chatId: number) => void;
  handleTypingStart: (chatId: number, typing: TypingIndicator) => void;
  handleTypingStop: (chatId: number, userId: number) => void;
  handleUserJoin: (chatId: number, userId?: number) => void;
  handleUserLeave: (chatId: number, userId?: number) => void;
  handleMessageRead: (chatId: number, messageId: number) => void;
  handleReaction: (chatId: number, messageId: number, emoji: string, userId?: number) => void;
  clearError: () => void;
  getChatById: (chatId: number) => Chat | undefined;
  set: (state: Partial<ChatState>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  messages: {},
  isLoading: false,
  error: null,
  typingUsers: {},

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

  loadMessages: async (chatId: number) => {
    try {
      set({ isLoading: true, error: null });
      let messages;

      if (isMockMode()) {
        console.log('🔧 Using mock messages for chat:', chatId);
        const { mockGetMessages } = await import('@utils/mockData');
        messages = await mockGetMessages(String(chatId));
      } else {
        // Загружаем только последние 30 сообщений
        // Старые сообщения будут подгружаться при скролле вверх
        const limit = 30;
        console.log(`📚 Loading last ${limit} messages`);

        const response = await chatApi.getMessages(chatId, { limit });
        messages = (response.messages || response.data || []).reverse();
      }

      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: messages,
        },
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to load messages', isLoading: false });
    }
  },

  loadMoreMessages: async (chatId: number, beforeMessageId: number) => {
    try {
      console.log(`📚 Loading more messages before ID ${beforeMessageId}`);
      console.log(`🔍 Request params: chatId=${chatId}, before_message_id=${beforeMessageId}, limit=30`);
      const response = await chatApi.getMessages(chatId, {
        limit: 30,
        before_message_id: beforeMessageId,
      });
      const responseMessages = response.messages || response.data || [];

      console.log(`📚 Received ${responseMessages.length} older messages`);
      if (responseMessages.length > 0) {
        const ids = responseMessages.map(m => m.id).sort((a, b) => a - b);
        console.log(`📚 Received message IDs: first=${ids[0]}, last=${ids[ids.length - 1]}, all=[${ids.slice(0, 5).join(',')}...${ids.slice(-3).join(',')}]`);
      }

      let addedCount = 0;

      if (responseMessages.length > 0) {
        set((state) => {
          const existingMessages = state.messages[chatId] || [];
          const existingIds = new Set(existingMessages.map(m => m.id));

          // Фильтруем дубликаты - добавляем только новые сообщения
          const newMessages = responseMessages
            .reverse() // Переворачиваем (от новых к старым -> от старых к новым)
            .filter(msg => !existingIds.has(msg.id));

          addedCount = newMessages.length;
          console.log(`📚 Adding ${newMessages.length} new messages (filtered ${responseMessages.length - newMessages.length} duplicates)`);

          return {
            messages: {
              ...state.messages,
              [chatId]: [...newMessages, ...existingMessages], // Старые добавляем В НАЧАЛО
            },
          };
        });
      }

      // Возвращаем количество НОВЫХ сообщений (не дубликатов) для проверки "больше нет"
      console.log(`📚 Returning ${addedCount} new messages (from ${responseMessages.length} received)`);
      return addedCount;
    } catch (error: any) {
      set({ error: error.message || 'Failed to load more messages' });
      return 0;
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

  sendMessage: async (chatId: number, content: string, replyToId?: number) => {
    try {
      if (!content.trim()) throw new Error('Message content cannot be empty');

      // Send message through API (not WebSocket)
      // Server will broadcast it to all WebSocket clients
      const message = await chatApi.sendMessage(chatId, {
        content: content.trim(),
        reply_to_id: replyToId,
      });

      // Handle new message locally
      get().handleNewMessage(message);

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
      await chatApi.markChatAsRead(chatId);
      // Update unread count in state
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, unread_count: 0 } : chat
        ),
      }));
    } catch (error: any) {
      console.error('Failed to mark chat as read:', error);
    }
  },

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

  handleNewMessage: (message: Message) => {
    const currentUser = useAuthStore.getState().user;
    const isOwnMessage = currentUser && message.sender_id === currentUser.id;
    const activeChat = get().activeChat;
    const isInActiveChat = activeChat && activeChat.id === message.chat_id;

    set((state) => {
      // Check if message already exists (deduplication)
      const existingMessages = state.messages[message.chat_id] || [];
      const messageExists = existingMessages.some((msg) => msg.id === message.id);

      // ✅ ИСПРАВЛЕНИЕ: Пропускаем дубликат только для собственных сообщений
      // Для чужих сообщений - всегда добавляем (может придти через WebSocket broadcast)
      if (messageExists && isOwnMessage) {
        console.log('⚠️ Duplicate own message detected, skipping:', message.id);
        return state; // Skip processing duplicate message only for own messages
      }

      // Add message to messages list
      const updatedMessages = {
        ...state.messages,
        [message.chat_id]: [...existingMessages, message],
      };

      // Update chats list
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === message.chat_id) {
          // Increment unread_count only if:
          // 1. Message is not from current user
          // 2. User is not currently viewing this chat
          const shouldIncrementUnread = !isOwnMessage && !isInActiveChat;

          return {
            ...chat,
            last_message: message,
            unread_count: shouldIncrementUnread ? (chat.unread_count || 0) + 1 : chat.unread_count || 0,
          };
        }
        return chat;
      });

      // Sort chats by last message time (most recent first)
      const sortedChats = [...updatedChats].sort((a, b) => {
        const timeA = a.last_message?.created_at || a.created_at || '';
        const timeB = b.last_message?.created_at || b.created_at || '';
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });

      return {
        messages: updatedMessages,
        chats: sortedChats,
      };
    });
  },

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

  handleMessageDelete: (messageId: number, chatId: number) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).filter((msg) => msg.id !== messageId),
      },
    }));
  },

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

  handleMessageRead: (chatId: number, messageId: number) => {
    // Update read_by array in message
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((msg) =>
          msg.id === messageId
            ? { ...msg, read_by: [...(msg.read_by || []), useAuthStore.getState().user?.id].filter((id): id is number => id !== undefined) }
            : msg
        ),
      },
    }));
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

  set: (state: Partial<ChatState>) => {
    set(state);
  },
}));