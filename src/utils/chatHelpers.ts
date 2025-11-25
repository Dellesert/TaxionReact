import { Chat } from '@/types/chat.types';

export type ChatFilter = 'all' | 'group' | 'private' | 'favorite';

/**
 * Filter tabs order for swipe navigation
 */
export const FILTER_TABS_ORDER: ChatFilter[] = ['all', 'private', 'group', 'favorite'];

/**
 * Filter chats by search query
 */
export const filterChatsBySearch = (chats: Chat[], searchQuery: string): Chat[] => {
  if (!searchQuery.trim()) return chats;

  const query = searchQuery.toLowerCase().trim();
  return chats.filter((chat) => {
    const chatName = chat.name || '';
    return chatName.toLowerCase().includes(query);
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
