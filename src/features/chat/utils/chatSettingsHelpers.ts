/**
 * Chat Settings Helper Functions
 * Вспомогательные функции для настроек чата
 */

/**
 * Check if user is the creator of the chat
 */
export const isUserChatCreator = (
  currentUserId: number | undefined,
  creatorId: number | undefined
): boolean => {
  if (!currentUserId || !creatorId) return false;
  return currentUserId === creatorId;
};

/**
 * Check if user can manage members
 */
export const canUserManageMembers = (
  role: string | undefined
): boolean => {
  return role === 'owner' || role === 'admin';
};

/**
 * Get member's role from members list
 */
export const getMemberRole = (
  members: Array<{ user_id: number; role: string }>,
  userId: number | undefined
): string | undefined => {
  if (!userId) return undefined;
  return members.find((m) => m.user_id === userId)?.role;
};

/**
 * Get creator ID from chat object
 */
export const getCreatorId = (chat: {
  created_by?: number;
  creator_id?: number;
} | null): number | undefined => {
  return chat?.created_by || chat?.creator_id;
};
