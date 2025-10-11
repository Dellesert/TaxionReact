/**
 * Poll Types
 * Типы для работы с опросами
 */

import { ISODateString } from './common.types';
import { User } from './user.types';

// Poll Types
export type PollType = 'single_choice' | 'multiple_choice' | 'ranking' | 'rating' | 'open_text';

// Poll Status
export type PollStatus = 'draft' | 'active' | 'closed' | 'archived' | 'cancelled';

// Poll Visibility
export type PollVisibility = 'public' | 'department' | 'invite_only' | 'private';

// Poll Option Interface
export interface PollOption {
  id: number;
  poll_id: number;
  text: string;
  order: number;
  votes_count: number;
  percentage: number;
  created_at: ISODateString;
}

// Poll Vote Interface
export interface PollVote {
  id: number;
  poll_id: number;
  user_id: number;
  user?: User;
  option_ids?: number[]; // For single/multiple choice
  ranking?: number[]; // For ranking (array of option_ids in order)
  rating?: number; // For rating (1-5 or 1-10)
  text_answer?: string; // For open text
  voted_at: ISODateString;
}

// Poll Comment Interface
export interface PollComment {
  id: number;
  poll_id: number;
  user_id: number;
  user?: User;
  content: string;
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Poll Interface
export interface Poll {
  id: number;
  title: string;
  description?: string;
  type: PollType;
  status: PollStatus;
  visibility: PollVisibility;
  start_time?: ISODateString;
  end_time?: ISODateString;
  is_anonymous: boolean;
  allow_comments: boolean;
  allow_multiple_votes: boolean;
  created_by: number;
  creator?: User;
  options: PollOption[];
  total_votes: number;
  user_has_voted: boolean;
  user_vote?: PollVote;
  comments?: PollComment[];
  comments_count: number;
  department_id?: number;
  invited_user_ids?: number[];
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Create Poll DTO
export interface CreatePollDto {
  title: string;
  description?: string;
  type: PollType;
  status?: PollStatus;
  visibility?: PollVisibility;
  start_time?: ISODateString;
  end_time?: ISODateString;
  is_anonymous?: boolean;
  allow_comments?: boolean;
  allow_multiple_votes?: boolean;
  options: {
    text: string;
    order: number;
  }[];
  department_id?: number;
  invited_user_ids?: number[];
}

// Update Poll DTO
export interface UpdatePollDto {
  title?: string;
  description?: string;
  status?: PollStatus;
  visibility?: PollVisibility;
  start_time?: ISODateString;
  end_time?: ISODateString;
  allow_comments?: boolean;
  options?: {
    id?: number; // If id exists, update option, otherwise create new
    text: string;
    order: number;
  }[];
}

// Update Poll Status DTO
export interface UpdatePollStatusDto {
  status: PollStatus;
}

// Vote DTO
export interface VoteDto {
  option_ids?: number[]; // For single/multiple choice
  ranking?: number[]; // For ranking
  rating?: number; // For rating
  text_answer?: string; // For open text
}

// Add Poll Comment DTO
export interface AddPollCommentDto {
  content: string;
}

// Poll Results
export interface PollResults {
  poll_id: number;
  total_votes: number;
  options: {
    option_id: number;
    text: string;
    votes_count: number;
    percentage: number;
    voters?: User[]; // Only if not anonymous
  }[];
  rating_average?: number; // For rating polls
  text_answers?: {
    user?: User;
    answer: string;
    voted_at: ISODateString;
  }[]; // For open text polls
}

// Poll List Filters
export interface PollListFilters {
  status?: PollStatus;
  type?: PollType;
  visibility?: PollVisibility;
  created_by?: number;
  department_id?: number;
  search?: string;
}
