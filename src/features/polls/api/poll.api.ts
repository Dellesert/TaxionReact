/**
 * Poll API
 * API клиент для работы с опросами
 */

import api from '@api/axios.config';
import { API_ENDPOINTS } from '@constants/api.constants';
import {
  Poll,
  CreatePollDto,
  UpdatePollDto,
  UpdatePollStatusDto,
  VoteDto,
  AddPollCommentDto,
  PollResults,
  PollListFilters,
  PollVote,
  PollVotersList,
} from '../types/poll.types';
import { ApiResponse } from '../../../types/common.types';

// ============= Poll Operations =============

/**
 * Get list of polls with filters and pagination
 */
export const getPolls = async (
  filters?: PollListFilters,
  limit?: number,
  offset?: number
): Promise<{ polls: Poll[]; total: number; hasMore: boolean }> => {
  const params = {
    ...filters,
    limit: limit || 20,
    offset: offset || 0,
  };

  const response = await api.get<any>(API_ENDPOINTS.POLL.LIST, { params });

  // Backend returns: { polls: [...], total: 10, limit: 20, offset: 0 }
  const polls = response.data.polls || [];
  const total = response.data.total || 0;
  const hasMore = (params.offset + polls.length) < total;

  return { polls, total, hasMore };
};

/**
 * Search polls by query
 */
export const searchPolls = async (
  query: string,
  limit?: number,
  offset?: number
): Promise<{ polls: Poll[]; total: number; hasMore: boolean }> => {
  const params = {
    q: query,
    limit: limit || 20,
    offset: offset || 0,
  };

  const response = await api.get<any>(API_ENDPOINTS.POLL.SEARCH, { params });

  // Backend returns: { polls: [...], total: 10, limit: 20, offset: 0 }
  const polls = response.data.polls || [];
  const total = response.data.total || 0;
  const hasMore = (params.offset + polls.length) < total;

  return { polls, total, hasMore };
};

/**
 * Create new poll
 */
export const createPoll = async (data: CreatePollDto): Promise<Poll> => {
  const response = await api.post<any>(API_ENDPOINTS.POLL.CREATE, data);
  // Backend returns: { message: "...", poll: {...} }
  return response.data.poll;
};

/**
 * Get poll by ID
 */
export const getPoll = async (id: number): Promise<Poll> => {
  const response = await api.get<any>(API_ENDPOINTS.POLL.BY_ID(id));
  // Backend returns: { poll: {...} }
  return response.data.poll;
};

/**
 * Update poll
 */
export const updatePoll = async (id: number, data: UpdatePollDto): Promise<Poll> => {
  const response = await api.put<any>(API_ENDPOINTS.POLL.UPDATE(id), data);
  // Backend returns: { message: "...", poll: {...} }
  return response.data.poll;
};

/**
 * Delete poll
 */
export const deletePoll = async (id: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.POLL.DELETE(id));
};

/**
 * Update poll status
 */
export const updatePollStatus = async (
  id: number,
  data: UpdatePollStatusDto
): Promise<Poll> => {
  const response = await api.patch<any>(
    API_ENDPOINTS.POLL.UPDATE_STATUS(id),
    data
  );
  // Backend returns: { message: "...", poll: {...} }
  return response.data.poll;
};

// ============= Voting =============

/**
 * Vote in poll
 */
export const vote = async (pollId: number, data: VoteDto): Promise<Poll> => {
  const response = await api.post<any>(API_ENDPOINTS.POLL.VOTE(pollId), data);
  // Backend returns: { message: "...", poll: {...} }
  return response.data.poll;
};

/**
 * Get poll results
 */
export const getPollResults = async (pollId: number): Promise<PollResults> => {
  const response = await api.get<any>(
    API_ENDPOINTS.POLL.RESULTS(pollId)
  );
  // Backend returns: { results: {...} }
  return response.data.results;
};

/**
 * Get my votes in poll
 */
export const getMyVotes = async (pollId: number): Promise<PollVote[]> => {
  const response = await api.get<any>(
    API_ENDPOINTS.POLL.MY_VOTES(pollId)
  );
  // Backend returns: { votes: [...] }
  return response.data.votes || [];
};

/**
 * Get list of poll voters
 */
export const getPollVoters = async (pollId: number): Promise<PollVotersList> => {
  const response = await api.get<any>(
    API_ENDPOINTS.POLL.VOTERS(pollId)
  );
  // Backend returns: { voters: [...] }
  return response.data.voters;
};

// ============= Poll Comments =============

/**
 * Get poll comments
 */
export const getPollComments = async (pollId: number): Promise<Comment[]> => {
  const response = await api.get<any>(
    API_ENDPOINTS.POLL.COMMENTS(pollId)
  );
  // Backend returns: { comments: [...] }
  return response.data.comments;
};

/**
 * Add comment to poll
 */
export const addPollComment = async (
  pollId: number,
  data: AddPollCommentDto
): Promise<Comment> => {
  const response = await api.post<any>(
    API_ENDPOINTS.POLL.ADD_COMMENT(pollId),
    data
  );
  // Backend returns: { message: "...", comment: {...} }
  return response.data.comment;
};

/**
 * Delete poll comment
 */
export const deletePollComment = async (pollId: number, commentId: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.POLL.DELETE_COMMENT(pollId, commentId));
};
