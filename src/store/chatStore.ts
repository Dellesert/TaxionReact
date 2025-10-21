/**
 * Chat Store
 * Zustand store для управления чатами и сообщениями
 */

import { create } from 'zustand';
import { Chat, Message, TypingIndicator, MessageType } from '../types/chat.types';
import * as chatApi from '@api/chat.api';
import { getUser } from '@api/user.api';
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
  updateChat: (chatId: number, name: string) => Promise<void>;
  deleteChat: (chatId: number) => Promise<void>;
  leaveChat: (chatId: number) => Promise<void>;
  removeChatMember: (chatId: number, userId: number) => Promise<void>;
  loadMessages: (chatId: number) => Promise<void>;
  loadMoreMessages: (chatId: number, beforeMessageId: number) => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  sendMessage: (chatId: number, content: string, replyToId?: number) => Promise<void>;
  updateMessage: (messageId: number, content: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  deleteMessageForUser: (messageId: number, deleteFor: 'everyone' | 'me') => Promise<void>;
  clearChatHistory: (chatId: number) => Promise<void>;
  restoreMessage: (messageId: number) => Promise<void>;
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
  handleNewMessage: (message: Message) => void;
  handleMessageUpdate: (message: Message) => void;
  handleMessageDelete: (messageId: number, chatId: number) => void;
  handleTypingStart: (chatId: number, typing: TypingIndicator) => void;
  handleTypingStop: (chatId: number, userId: number) => void;
  handleUserJoin: (chatId: number, userId?: number) => void;
  handleUserLeave: (chatId: number, userId?: number) => void;
  handleUserPresence: (presence: any) => void;
  handleMessageRead: (chatId: number, messageId: number, userId?: number) => void;
  handleReaction: (chatId: number, messageId: number, emoji: string, userId?: number) => void;
  clearError: () => void;
  getChatById: (chatId: number) => Chat | undefined;
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
        // Enrich chats with user data
        chats = await Promise.all(chats.map(enrichChatWithUsers));
      }

      set({ chats, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to load chats', isLoading: false });
    }
  },

  createChat: async (name: string, memberIds: number[], type: 'private' | 'group' = 'group') => {
    try {
      set({ isLoading: true, error: null });
      let newChat = await chatApi.createChat({
        type,
        name,
        member_ids: memberIds,
      });

      // Enrich chat with user data
      newChat = await enrichChatWithUsers(newChat);

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

  updateChat: async (chatId: number, name: string) => {
    try {
      const updatedChat = await chatApi.updateChat(chatId, { name });
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, name: updatedChat.name } : chat
        ),
        activeChat: state.activeChat?.id === chatId
          ? { ...state.activeChat, name: updatedChat.name }
          : state.activeChat,
      }));
      console.log(`✏️ Chat ${chatId} renamed to "${name}"`);
    } catch (error: any) {
      set({ error: error.message || 'Failed to update chat' });
      throw error;
    }
  },

  deleteChat: async (chatId: number) => {
    try {
      await chatApi.deleteChat(chatId);
      set((state) => ({
        chats: state.chats.filter((chat) => chat.id !== chatId),
        messages: Object.fromEntries(
          Object.entries(state.messages).filter(([id]) => Number(id) !== chatId)
        ),
        activeChat: state.activeChat?.id === chatId ? null : state.activeChat,
      }));
      console.log(`🗑️ Chat ${chatId} deleted successfully`);
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete chat' });
      throw error;
    }
  },

  leaveChat: async (chatId: number) => {
    try {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser) throw new Error('User not authenticated');

      await chatApi.removeChatMember(chatId, currentUser.id);
      set((state) => ({
        chats: state.chats.filter((chat) => chat.id !== chatId),
        messages: Object.fromEntries(
          Object.entries(state.messages).filter(([id]) => Number(id) !== chatId)
        ),
        activeChat: state.activeChat?.id === chatId ? null : state.activeChat,
      }));
      console.log(`👋 Left chat ${chatId} successfully`);
    } catch (error: any) {
      set({ error: error.message || 'Failed to leave chat' });
      throw error;
    }
  },

  removeChatMember: async (chatId: number, userId: number) => {
    console.log(`🚫 removeChatMember called: chatId=${chatId}, userId=${userId}`);
    try {
      console.log(`🌐 Calling API to remove user ${userId} from chat ${chatId}`);
      await chatApi.removeChatMember(chatId, userId);
      console.log(`✅ API call successful, updating local state`);

      // Обновляем список участников в чате
      set((state) => ({
        chats: state.chats.map((chat) => {
          if (chat.id === chatId && chat.members) {
            console.log(`📝 Updating members list for chat ${chatId}`);
            return {
              ...chat,
              members: chat.members.filter((member) => member.user_id !== userId),
            };
          }
          return chat;
        }),
      }));
      console.log(`🚫 Removed user ${userId} from chat ${chatId}`);
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

  pinMessage: async (messageId: number) => {
    try {
      const updatedMessage = await chatApi.pinMessage(messageId);
      // Обновляем сообщение локально
      set((state) => ({
        messages: {
          ...state.messages,
          [updatedMessage.chat_id]: (state.messages[updatedMessage.chat_id] || []).map((msg) =>
            msg.id === messageId ? { ...msg, is_pinned: true } : msg
          ),
        },
      }));
      console.log(`📌 Message ${messageId} pinned`);
    } catch (error: any) {
      set({ error: error.message || 'Failed to pin message' });
      throw error;
    }
  },

  unpinMessage: async (messageId: number) => {
    try {
      const updatedMessage = await chatApi.unpinMessage(messageId);
      // Обновляем сообщение локально
      set((state) => ({
        messages: {
          ...state.messages,
          [updatedMessage.chat_id]: (state.messages[updatedMessage.chat_id] || []).map((msg) =>
            msg.id === messageId ? { ...msg, is_pinned: false } : msg
          ),
        },
      }));
      console.log(`📌 Message ${messageId} unpinned`);
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
      await chatApi.toggleChatPinned(chatId, true);
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, is_pinned: true } : chat
        ),
      }));
      console.log(`📌 Chat ${chatId} pinned`);
    } catch (error: any) {
      set({ error: error.message || 'Failed to pin chat' });
      throw error;
    }
  },

  unpinChat: async (chatId: number) => {
    try {
      await chatApi.toggleChatPinned(chatId, false);
      set((state) => ({
        chats: state.chats.map((chat) =>
          chat.id === chatId ? { ...chat, is_pinned: false } : chat
        ),
      }));
      console.log(`📌 Chat ${chatId} unpinned`);
    } catch (error: any) {
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

  handleNewMessage: (message: Message) => {
    const currentUser = useAuthStore.getState().user;
    const isOwnMessage = currentUser && message.sender_id === currentUser.id;
    const activeChat = get().activeChat;
    const isInActiveChat = activeChat && activeChat.id === message.chat_id;

    set((state) => {
      // Check if message already exists (deduplication)
      const existingMessages = state.messages[message.chat_id] || [];
      const messageExists = existingMessages.some((msg) => msg.id === message.id);

      // Если сообщение уже существует
      if (messageExists) {
        if (isOwnMessage) {
          console.log('⚠️ Duplicate own message detected, skipping:', message.id);
          return state;
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
    // Вместо удаления сообщения, помечаем его как удалённое
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((msg) =>
          msg.id === messageId
            ? { ...msg, is_deleted: true, deleted_at: new Date().toISOString() }
            : msg
        ),
      },
    }));
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
    const { user_id, status, last_seen } = presence;

    set((state) => ({
      chats: state.chats.map((chat) => {
        if (!chat.members) return chat;

        // Check if user is a member of this chat
        const hasMember = chat.members.some(m => m.user_id === user_id);
        if (!hasMember) return chat;

        // Update the member's user status
        const updatedMembers = chat.members.map(member => {
          if (member.user_id === user_id && member.user) {
            return {
              ...member,
              user: {
                ...member.user,
                status,
                last_seen_at: last_seen || member.user.last_seen_at,
              }
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

    if (!readerId) {
      return;
    }

    set((state) => ({
      messages: {
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