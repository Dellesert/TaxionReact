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

        // Update total votes and voters count
        if (results.total_votes !== undefined) {
          loadedPoll.total_votes = results.total_votes;
        }
        if (results.total_voters !== undefined) {
          loadedPoll.total_voters = results.total_voters;
        }

        // Merge results into poll options using votes_by_option
        if (results.votes_by_option && loadedPoll.options) {
          const totalVotes = results.total_votes || 0;

          loadedPoll.options = loadedPoll.options.map((option) => {
            // votes_by_option is an object like {6177: 2, 6178: 5}
            const voteCount = results.votes_by_option[option.id] || 0;
            const votePercent = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

            return {
              ...option,
              vote_count: voteCount,
              vote_percent: votePercent,
            };
          });
        } else if (results.options && loadedPoll.options) {
          // Fallback: if backend returns options array with vote data
          loadedPoll.options = loadedPoll.options.map((option) => {
            const resultOption = results.options.find(
              (r: any) => r.option_id === option.id || r.id === option.id
            );
            if (resultOption) {
              return {
                ...option,
                vote_count: resultOption.votes_count || resultOption.vote_count || 0,
                vote_percent: resultOption.percentage || resultOption.vote_percent || 0,
              };
            }
            return {
              ...option,
              vote_count: 0,
              vote_percent: 0,
            };
          });
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
