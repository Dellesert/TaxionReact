import { useState, useEffect, useMemo, useCallback } from 'react';
import { PollVoter, PollVotersList } from '@/types/poll.types';
import * as pollApi from '@api/poll.api';

export type ViewMode = 'users' | 'options';

interface UsePollVotersDataReturn {
  votersData: PollVotersList | null;
  isLoading: boolean;
  error: string | null;
  viewMode: ViewMode;
  votersByOption: { [option: string]: PollVoter[] };
  setViewMode: (mode: ViewMode) => void;
  loadVoters: () => Promise<void>;
}

/**
 * Custom hook for managing poll voters data
 */
export const usePollVotersData = (
  pollId: number,
  onAccessDenied?: () => void
): UsePollVotersDataReturn => {
  const [votersData, setVotersData] = useState<PollVotersList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('users');

  const loadVoters = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await pollApi.getPollVoters(pollId);
      setVotersData(data);
    } catch (error: any) {
      console.error('Failed to load voters:', error);
      setError(error.message || 'Не удалось загрузить список проголосовавших');

      // Handle access denied
      if (
        error.message?.includes('access denied') ||
        error.message?.includes('доступ')
      ) {
        onAccessDenied?.();
      }
    } finally {
      setIsLoading(false);
    }
  }, [pollId, onAccessDenied]);

  useEffect(() => {
    loadVoters();
  }, [pollId]);

  // Group voters by options
  const votersByOption = useMemo(() => {
    if (!votersData) return {};

    const grouped: { [option: string]: PollVoter[] } = {};

    votersData.voters.forEach((voter) => {
      if (voter.options && voter.options.length > 0) {
        voter.options.forEach((option) => {
          if (!grouped[option]) {
            grouped[option] = [];
          }
          grouped[option].push(voter);
        });
      }
    });

    return grouped;
  }, [votersData]);

  return {
    votersData,
    isLoading,
    error,
    viewMode,
    votersByOption,
    setViewMode,
    loadVoters,
  };
};
