import { Chat } from '../types/chat.types';
import { getChatDisplayName } from './chatUtils';

export type ChatFilter = 'all' | 'group' | 'private' | 'channel';

/**
 * Filter tabs order for swipe navigation
 */
export const FILTER_TABS_ORDER: ChatFilter[] = ['all', 'private', 'group', 'channel'];

/**
 * Filter chats by search query
 * Для личных чатов ищет по имени собеседника, для групповых - по названию чата
 */
export const filterChatsBySearch = (chats: Chat[], searchQuery: string, currentUserId?: number): Chat[] => {
  if (!searchQuery.trim()) return chats;

  const query = searchQuery.toLowerCase().trim();
  return chats.filter((chat) => {
    // Используем getChatDisplayName для получения корректного имени чата
    // Для личных чатов это будет имя собеседника, для групповых - название чата
    const displayName = getChatDisplayName(chat, currentUserId);
    return displayName.toLowerCase().includes(query);
  });
};

/**
 * Get tab index from filter
 */
export const getTabIndexFromFilter = (filter: ChatFilter): number => {
  return FILTER_TABS_ORDER.indexOf(filter);
};

/**
 * Get filter from tab index
 */
export const getFilterFromTabIndex = (index: number): ChatFilter => {
  return FILTER_TABS_ORDER[index] || 'all';
};

/**
 * Check if chats array is empty
 */
export const isChatsEmpty = (chats: Chat[]): boolean => {
  return chats.length === 0;
};

/**
 * Combine pinned and regular chats from tab data
 */
export const combineTabChats = (pinnedChats: Chat[], regularChats: Chat[]): Chat[] => {
  return [...pinnedChats, ...regularChats];
};
