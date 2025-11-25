import { Poll } from '../types/poll.types';

export type PollFilter = 'all' | 'active' | 'closed';

/**
 * Get filter options for poll list
 */
export const getFilterOptions = (): { key: PollFilter; label: string }[] => [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'closed', label: 'Завершенные' },
];

/**
 * Check if user can create polls
 */
export const canUserCreatePoll = (userRole: string | undefined): boolean => {
  return (
    userRole === 'department_head' ||
    userRole === 'admin' ||
    userRole === 'super_admin'
  );
};

/**
 * Filter polls by status
 */
export const filterPollsByStatus = (
  polls: Poll[],
  filter: PollFilter
): Poll[] => {
  if (filter === 'all') return polls;
  return polls.filter((poll) => poll.status === filter);
};

/**
 * Calculate poll statistics
 */
export const calculatePollStats = (polls: Poll[]) => {
  const activeCount = polls.filter((p) => p.status === 'active').length;
  const votedCount = polls.filter((p) => p.user_has_voted).length;

  return {
    activeCount,
    votedCount,
  };
};

/**
 * Deduplicate polls by ID
 */
export const deduplicatePolls = (
  existingPolls: Poll[],
  newPolls: Poll[]
): Poll[] => {
  const existingIds = new Set(existingPolls.map((p) => p.id));
  const uniquePolls = newPolls.filter((p) => !existingIds.has(p.id));
  return [...existingPolls, ...uniquePolls];
};
