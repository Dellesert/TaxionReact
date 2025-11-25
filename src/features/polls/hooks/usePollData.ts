import { useState, useCallback } from 'react';
import { Poll } from '../types/poll.types';
import * as pollApi from '../api/poll.api';
import { parsePollError } from '../utils/pollHelpers';

interface UsePollDataReturn {
  poll: Poll | null;
  isLoading: boolean;
  error: string | null;
  votersPreview: any[];
  loadPollDetail: () => Promise<void>;
}

/**
 * Custom hook for managing poll data loading and state
 */
export const usePollData = (
  pollId: number,
  currentUserId: number | undefined,
  isSystemAdmin: boolean
): UsePollDataReturn => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votersPreview, setVotersPreview] = useState<any[]>([]);

  const loadPollDetail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const loadedPoll = await pollApi.getPoll(pollId);

      // Load poll results separately
      try {
        const results = await pollApi.getPollResults(pollId);

        // Merge results into poll options
        if (results.options && loadedPoll.options) {
          loadedPoll.options = loadedPoll.options.map((option) => {
            const resultOption = results.options.find(
              (r) => r.option_id === option.id
            );
            if (resultOption) {
              return {
                ...option,
                vote_count: resultOption.votes_count || 0,
                vote_percent: resultOption.percentage || 0,
              };
            }
            return option;
          });
        }

        // Update total votes count
        if (results.total_votes !== undefined) {
          loadedPoll.total_votes = results.total_votes;
        }
      } catch (resultsError) {
        console.warn('Failed to load poll results:', resultsError);
      }

      setPoll(loadedPoll);

      // Load voters preview (first 5)
      const isCreatorOrAdmin =
        loadedPoll.created_by === currentUserId || isSystemAdmin;
      if (
        loadedPoll.total_voters > 0 &&
        (isCreatorOrAdmin || loadedPoll.show_results)
      ) {
        try {
          const votersData = await pollApi.getPollVoters(pollId);
          setVotersPreview(votersData.voters.slice(0, 5));
        } catch (error) {
          console.warn('Failed to load voters preview:', error);
        }
      }
    } catch (error: any) {
      console.error('Failed to load poll detail:', error);
      setError(parsePollError(error));
    } finally {
      setIsLoading(false);
    }
  }, [pollId, currentUserId, isSystemAdmin]);

  return {
    poll,
    isLoading,
    error,
    votersPreview,
    loadPollDetail,
  };
};
