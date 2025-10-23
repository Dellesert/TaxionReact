/**
 * Poll API
 * API клиент для работы с опросами
 */

import api from './axios.config';
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
import { ApiResponse } from '../types/common.types';

// ============= Poll Operations =============

/**
 * Get list of polls with filters
 */
export const getPolls = async (filters?: PollListFilters): Promise<Poll[]> => {
  const response = await api.get<ApiResponse<Poll[]>>(API_ENDPOINTS.POLL.LIST, {
    params: filters,
  });

  // Handle different response formats
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.polls) {
    return response.data.polls;
  } else if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
};

/**
 * Create new poll
 */
export const createPoll = async (data: CreatePollDto): Promise<Poll> => {
  const response = await api.post<ApiResponse<Poll>>(API_ENDPOINTS.POLL.CREATE, data);

  if (response.data.data) {
    return response.data.data;
  } else if (response.data.poll) {
    return response.data.poll;
  }

  return response.data as any;
};

/**
 * Get poll by ID
 */
export const getPoll = async (id: number): Promise<Poll> => {
  const response = await api.get<ApiResponse<Poll>>(API_ENDPOINTS.POLL.BY_ID(id));

  if (response.data.data) {
    return response.data.data;
  } else if (response.data.poll) {
    return response.data.poll;
  }

  return response.data as any;
};

/**
 * Update poll
 */
export const updatePoll = async (id: number, data: UpdatePollDto): Promise<Poll> => {
  const response = await api.put<ApiResponse<Poll>>(API_ENDPOINTS.POLL.UPDATE(id), data);

  if (response.data.data) {
    return response.data.data;
  } else if (response.data.poll) {
    return response.data.poll;
  }

  return response.data as any;
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
  const response = await api.patch<ApiResponse<Poll>>(
    API_ENDPOINTS.POLL.UPDATE_STATUS(id),
    data
  );

  if (response.data.data) {
    return response.data.data;
  } else if (response.data.poll) {
    return response.data.poll;
  }

  return response.data as any;
};

// ============= Voting =============

/**
 * Vote in poll
 */
export const vote = async (pollId: number, data: VoteDto): Promise<Poll> => {
  const response = await api.post<ApiResponse<Poll>>(API_ENDPOINTS.POLL.VOTE(pollId), data);

  if (response.data.data) {
    return response.data.data;
  } else if (response.data.poll) {
    return response.data.poll;
  } else if (response.data.votes) {
    // Return the poll from the vote response
    return response.data as any;
  }

  return response.data as any;
};

/**
 * Get poll results
 */
export const getPollResults = async (pollId: number): Promise<PollResults> => {
  const response = await api.get<ApiResponse<PollResults>>(
    API_ENDPOINTS.POLL.RESULTS(pollId)
  );

  if (response.data.data) {
    return response.data.data;
  } else if (response.data.results) {
    return response.data.results;
  }

  return response.data as any;
};

/**
 * Get my votes in poll
 */
export const getMyVotes = async (pollId: number): Promise<PollVote[]> => {
  const response = await api.get<ApiResponse<PollVote[]>>(
    API_ENDPOINTS.POLL.MY_VOTES(pollId)
  );

  if (response.data.data) {
    return response.data.data;
  } else if (response.data.votes) {
    return response.data.votes;
  } else if (Array.isArray(response.data)) {
    return response.data;
  }

  return [];
};

/**
 * Get list of poll voters
 */
export const getPollVoters = async (pollId: number): Promise<PollVotersList> => {
  const response = await api.get<ApiResponse<PollVotersList>>(
    API_ENDPOINTS.POLL.VOTERS(pollId)
  );

  if (response.data.data) {
    return response.data.data;
  }

  return response.data as any;
};

// ============= Poll Comments =============

/**
 * Get poll comments
 */
export const getPollComments = async (pollId: number): Promise<Comment[]> => {
  const response = await api.get<ApiResponse<Comment[]>>(
    API_ENDPOINTS.POLL.COMMENTS(pollId)
  );
  return response.data.data;
};

/**
 * Add comment to poll
 */
export const addPollComment = async (
  pollId: number,
  data: AddPollCommentDto
): Promise<Comment> => {
  const response = await api.post<ApiResponse<Comment>>(
    API_ENDPOINTS.POLL.ADD_COMMENT(pollId),
    data
  );
  return response.data.data;
};

/**
 * Delete poll comment
 */
export const deletePollComment = async (pollId: number, commentId: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.POLL.DELETE_COMMENT(pollId, commentId));
};
