import { useState, useCallback } from 'react';
import { Poll } from '@/types/poll.types';
import * as pollApi from '@api/poll.api';

interface UsePollVotingReturn {
  selectedOptions: number[];
  textAnswer: string;
  ratingValue: number | null;
  rankingValues: { [optionId: number]: number };
  comment: string;
  showResults: boolean;
  isRevoting: boolean;
  isVoting: boolean;
  setSelectedOptions: (options: number[]) => void;
  setTextAnswer: (text: string) => void;
  setRatingValue: (value: number | null) => void;
  setRankingValues: (values: { [optionId: number]: number }) => void;
  setComment: (comment: string) => void;
  setShowResults: (show: boolean) => void;
  setIsRevoting: (revoting: boolean) => void;
  handleOptionToggle: (optionId: number, pollType: Poll['type']) => void;
  handleVote: (
    poll: Poll,
    onSuccess: (wasRevoting: boolean) => void,
    onError: (message: string) => void
  ) => Promise<void>;
  initializeVoteFromPoll: (poll: Poll) => void;
  resetVotingState: () => void;
}

/**
 * Custom hook for managing poll voting state and actions
 */
export const usePollVoting = (): UsePollVotingReturn => {
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [rankingValues, setRankingValues] = useState<{ [optionId: number]: number }>({});
  const [comment, setComment] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [isRevoting, setIsRevoting] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const handleOptionToggle = useCallback(
    (optionId: number, pollType: Poll['type']) => {
      if (pollType === 'single_choice') {
        setSelectedOptions([optionId]);
      } else if (pollType === 'multiple_choice') {
        if (selectedOptions.includes(optionId)) {
          setSelectedOptions(selectedOptions.filter((id) => id !== optionId));
        } else {
          setSelectedOptions([...selectedOptions, optionId]);
        }
      }
    },
    [selectedOptions]
  );

  const handleVote = useCallback(
    async (
      poll: Poll,
      onSuccess: (wasRevoting: boolean) => void,
      onError: (message: string) => void
    ) => {
      let voteData: any = {};

      try {
        setIsVoting(true);

        switch (poll.type) {
          case 'single_choice':
            if (selectedOptions.length === 0) {
              onError('Выберите вариант ответа');
              return;
            }
            voteData.option_ids = selectedOptions;
            break;

          case 'multiple_choice':
            if (selectedOptions.length === 0) {
              onError('Выберите хотя бы один вариант');
              return;
            }
            voteData.option_ids = selectedOptions;
            break;

          case 'open_text':
            if (!textAnswer.trim()) {
              onError('Введите текстовый ответ');
              return;
            }
            voteData.text_value = textAnswer;
            break;

          case 'rating':
            if (ratingValue === null) {
              onError('Выберите оценку');
              return;
            }
            voteData.rating_values = {};
            if (selectedOptions.length > 0) {
              voteData.rating_values[selectedOptions[0]] = ratingValue;
            } else if (poll.options.length > 0) {
              voteData.rating_values[poll.options[0].id] = ratingValue;
            }
            break;

          case 'ranking':
            if (Object.keys(rankingValues).length === 0) {
              onError('Проставьте ранжирование');
              return;
            }
            voteData.ranking_values = rankingValues;
            break;
        }

        if (comment.trim()) {
          voteData.comment = comment;
        }

        await pollApi.vote(poll.id, voteData);

        // Save revoting state before reset
        const wasRevoting = isRevoting;

        // Reset revoting mode
        setIsRevoting(false);

        onSuccess(wasRevoting);
      } catch (error: any) {
        console.error('❌ Failed to vote:', error);
        console.error('📋 Vote data sent:', JSON.stringify(voteData, null, 2));
        console.error('📋 Error details:', JSON.stringify(error.details, null, 2));
        onError(error.details?.error || error.message || 'Не удалось проголосовать');
      } finally {
        setIsVoting(false);
      }
    },
    [selectedOptions, textAnswer, ratingValue, rankingValues, comment, isRevoting]
  );

  const initializeVoteFromPoll = useCallback((poll: Poll) => {
    // Reset revoting mode when initializing
    setIsRevoting(false);

    // If user already voted, show their vote
    if (poll.user_vote) {
      if (poll.user_vote.option_id) {
        setSelectedOptions([poll.user_vote.option_id]);
      }
      if (poll.user_vote.text_value) {
        setTextAnswer(poll.user_vote.text_value);
      }
      if (poll.user_vote.rating_value) {
        setRatingValue(poll.user_vote.rating_value);
      }
      if (poll.user_vote.comment) {
        setComment(poll.user_vote.comment);
      }
    }
  }, []);

  const resetVotingState = useCallback(() => {
    setSelectedOptions([]);
    setTextAnswer('');
    setRatingValue(null);
    setRankingValues({});
    setComment('');
    setShowResults(false);
    setIsRevoting(false);
  }, []);

  return {
    selectedOptions,
    textAnswer,
    ratingValue,
    rankingValues,
    comment,
    showResults,
    isRevoting,
    isVoting,
    setSelectedOptions,
    setTextAnswer,
    setRatingValue,
    setRankingValues,
    setComment,
    setShowResults,
    setIsRevoting,
    handleOptionToggle,
    handleVote,
    initializeVoteFromPoll,
    resetVotingState,
  };
};
