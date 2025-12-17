import { Poll, PollType } from '../types/poll.types';

/**
 * Get poll status configuration
 */
export const getPollStatusConfig = (status: Poll['status']) => {
  const config: Record<Poll['status'], { label: string; color: string }> = {
    active: { label: 'Активен', color: '#10B981' },
    closed: { label: 'Завершен', color: '#6B7280' },
    draft: { label: 'Черновик', color: '#F59E0B' },
    cancelled: { label: 'Отменен', color: '#EF4444' },
    archived: { label: 'Архивирован', color: '#9CA3AF' },
  };
  return config[status] || { label: status, color: '#9CA3AF' };
};

/**
 * Get poll type configuration
 */
export const getPollTypeConfig = (type: PollType) => {
  const config = {
    single_choice: { label: 'Один выбор', icon: 'radio-button-on', color: '#3B82F6' },
    multiple_choice: { label: 'Множественный', icon: 'checkbox', color: '#8B5CF6' },
    rating: { label: 'Оценка', icon: 'star', color: '#F59E0B' },
    ranking: { label: 'Ранжирование', icon: 'list', color: '#10B981' },
    open_text: { label: 'Текст', icon: 'text', color: '#EC4899' },
  };
  return config[type] || { label: type, icon: 'help-circle', color: '#9CA3AF' };
};

/**
 * Check if user is system administrator
 */
export const isSystemAdmin = (userRole: string | undefined): boolean => {
  return userRole === 'admin' || userRole === 'super_admin';
};

/**
 * Check if user can delete or close poll (creator or system admin)
 */
export const canDeleteOrClosePoll = (
  poll: Poll | null,
  userId: number | undefined,
  userRole: string | undefined
): boolean => {
  if (!poll || !userId) return false;
  return poll.created_by === userId || isSystemAdmin(userRole);
};

/**
 * Check if user can edit poll
 * - Creator: can edit unless closed/archived/cancelled
 * - System admin: always can edit
 */
export const canEditPoll = (
  poll: Poll | null,
  userId: number | undefined,
  userRole: string | undefined
): boolean => {
  if (!poll || !userId) return false;

  // System admin always can edit
  if (isSystemAdmin(userRole)) return true;

  // Creator can edit unless closed/archived/cancelled
  if (poll.created_by === userId) {
    return (
      poll.status !== 'closed' &&
      poll.status !== 'archived' &&
      poll.status !== 'cancelled'
    );
  }

  return false;
};

/**
 * Check if results should be shown for user
 */
export const shouldShowResults = (
  poll: Poll | null,
  userId: number | undefined,
  userRole: string | undefined,
  showResults: boolean,
  isRevoting: boolean
): boolean => {
  if (!poll) return false;

  const isCreatorOrAdmin =
    poll.created_by === userId || isSystemAdmin(userRole);

  // Always show results for creator/admin (unless revoting)
  if (isCreatorOrAdmin && !isRevoting) return true;

  // Always show results for closed/archived/cancelled polls
  if (
    poll.status === 'closed' ||
    poll.status === 'archived' ||
    poll.status === 'cancelled'
  ) {
    return true;
  }

  // For regular users
  if (!poll.show_results) return false;

  // Check if results should be hidden based on vote status
  if (!poll.user_has_voted && poll.show_results_after) return false;

  // Show results if user voted OR if they pressed the toggle button
  return poll.user_has_voted || showResults;
};

/**
 * Check if voting UI should be shown
 */
export const shouldShowVotingUI = (
  poll: Poll | null,
  userId: number | undefined,
  userRole: string | undefined,
  showResults: boolean,
  isRevoting: boolean
): boolean => {
  if (!poll) return false;

  // For admins and creators, don't show voting UI unless revoting
  const isCreatorOrAdmin =
    poll.created_by === userId || isSystemAdmin(userRole);
  if (isCreatorOrAdmin && !isRevoting) return false;

  // For closed/cancelled polls, don't show voting UI
  if (
    poll.status === 'closed' ||
    poll.status === 'archived' ||
    poll.status === 'cancelled'
  ) {
    return false;
  }

  // For regular users viewing results (toggle button pressed)
  if (showResults && !poll.user_has_voted && !isRevoting) return false;

  // Don't show voting UI if user already voted (unless revoting)
  if (poll.user_has_voted && poll.status === 'active' && !isRevoting) {
    return false;
  }

  return true;
};

/**
 * Format date for display
 */
export const formatPollDate = (date: string): string => {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
};

/**
 * Check if error is a private poll error
 */
export const isPrivatePollError = (error: string): boolean => {
  return error.includes('приватный') || error.includes('недоступен');
};

/**
 * Parse error response from API
 */
export const parsePollError = (error: any): string => {
  // Special handling for 404 error - poll deleted
  if (
    error.status === 404 ||
    (error.code === 'ERR_BAD_RESPONSE' && error.message.includes('404'))
  ) {
    return 'Этот опрос был удалён и больше недоступен.';
  }

  // Special handling for 403 error - access denied
  if (
    error.status === 403 ||
    (error.code === 'ERR_BAD_RESPONSE' && error.message.includes('403'))
  ) {
    return 'Этот опрос приватный и недоступен для вас. Вы не включены в список участников.';
  }

  return error.message || 'Не удалось загрузить опрос';
};
