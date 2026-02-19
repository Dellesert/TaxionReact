import type { Chat, Message, TypingAction } from '../types/chat.types';

/**
 * Check if user can delete selected messages for everyone
 */
export const canDeleteForEveryone = (
  chat: Chat | null,
  selectedMessageIds: Set<number>,
  messages: Message[],
  currentUserId: number | undefined,
  isAdmin: boolean
): boolean => {
  if (!chat || selectedMessageIds.size === 0 || !currentUserId) return false;

  // For private chats: can only delete own messages for everyone
  if (chat.type === 'private') {
    return Array.from(selectedMessageIds).every((messageId) => {
      const message = messages.find((m) => m.id === messageId);
      return message && message.sender_id === currentUserId;
    });
  }

  // For group chats and channels
  // Admins and owners can delete any messages
  if (isAdmin) {
    return true;
  }

  // Regular members can only delete their own messages
  return Array.from(selectedMessageIds).every((messageId) => {
    const message = messages.find((m) => m.id === messageId);
    return message && message.sender_id === currentUserId;
  });
};

/**
 * Get user role in chat
 */
export const getUserRoleInChat = (
  chat: Chat | null | undefined,
  currentUserId: number | undefined
): 'owner' | 'admin' | 'member' => {
  if (!chat || !currentUserId) return 'member';
  const member = chat.members?.find((m) => m.user_id === currentUserId);
  return (member?.role as 'owner' | 'admin' | 'member') || 'member';
};

/**
 * Check if user is admin (owner or admin role)
 */
export const isUserAdmin = (role: string): boolean => {
  return role === 'owner' || role === 'admin';
};

export interface TypingUserInfo {
  name: string;
  action: TypingAction | undefined;
}

/**
 * Get typing user names for display
 */
export const getTypingUserNames = (
  typingUsers: Array<{ user_id: number; user?: { name?: string; email?: string }; action?: TypingAction }>,
  currentUserId: number | undefined
): TypingUserInfo[] => {
  return typingUsers
    .filter((t) => t.user_id !== currentUserId)
    .map((t) => ({
      name: t.user?.name || t.user?.email?.split('@')[0] || `User ${t.user_id}`,
      action: t.action,
    }));
};

const ACTION_LABELS: Record<string, { single: string; plural: string }> = {
  typing: { single: 'печатает...', plural: 'печатают...' },
  uploading_photo: { single: 'отправляет фото...', plural: 'отправляют фото...' },
  uploading_video: { single: 'отправляет видео...', plural: 'отправляют видео...' },
};

/**
 * Format typing text for header
 */
export const formatTypingText = (
  typingUserNames: TypingUserInfo[],
  isPrivateChat: boolean
): string => {
  if (typingUserNames.length === 0) return '';

  const action = typingUserNames[0].action || 'typing';
  const labels = ACTION_LABELS[action] || ACTION_LABELS.typing;

  if (isPrivateChat) {
    return labels.single;
  }

  if (typingUserNames.length === 1) {
    return `${typingUserNames[0].name} ${labels.single}`;
  }

  return `${typingUserNames[0].name} и ещё ${typingUserNames.length - 1} ${labels.plural}`;
};

/**
 * Get members text for group chats
 */
export const getMembersText = (chat: Chat | null | undefined): string => {
  if (!chat || chat.type !== 'group' || !chat.members) return '';
  return `${chat.members.length} участников`;
};
