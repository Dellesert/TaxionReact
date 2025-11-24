import { useMemo } from 'react';
import { Poll } from '@/types/poll.types';
import { canEditPoll, canDeleteOrClosePoll } from '@utils/pollHelpers';

interface PollPermissions {
  can_edit: boolean;
  can_delete_or_close: boolean;
  can_share: boolean;
}

/**
 * Custom hook for determining poll permissions for current user
 */
export const usePollPermissions = (
  poll: Poll | null,
  userId: number | undefined,
  userRole: string | undefined
): PollPermissions => {
  return useMemo(() => {
    if (!poll || !userId) {
      return {
        can_edit: false,
        can_delete_or_close: false,
        can_share: false,
      };
    }

    return {
      can_edit: canEditPoll(poll, userId, userRole),
      can_delete_or_close: canDeleteOrClosePoll(poll, userId, userRole),
      can_share: poll.status === 'active', // Anyone can share active polls
    };
  }, [poll, userId, userRole]);
};
