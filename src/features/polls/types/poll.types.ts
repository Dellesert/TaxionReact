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
  description?: string;
  position: number;
  color?: string;
  image_url?: string;
  // Computed fields
  vote_count?: number;
  vote_percent?: number;
  rating_avg?: number;
  ranking_avg?: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Poll Vote Interface
export interface PollVote {
  id: number;
  poll_id: number;
  option_id?: number; // For single/multiple choice polls
  user_id?: number; // Null for anonymous votes
  user?: User;
  is_anonymous: boolean;
  text_value?: string; // For open_text polls
  rating_value?: number; // For rating polls
  ranking_value?: number; // For ranking polls (position in rank)
  comment?: string; // Additional comment
  created_at: ISODateString;
  updated_at: ISODateString;
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
  allow_anonymous: boolean; // Изменено с is_anonymous для соответствия бэкенду
  allow_multiple_vote: boolean; // Изменено с allow_multiple_votes
  require_comment: boolean;
  show_results: boolean;
  show_results_after: boolean;
  created_by: number;
  creator?: User;
  options: PollOption[];
  total_votes: number;
  total_voters: number;
  user_has_voted: boolean;
  user_vote?: PollVote;
  comments?: PollComment[];
  comments_count?: number;
  department_id?: number;
  department_name?: string; // Name of the department
  category?: string;
  participant_rate?: number;
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
  allow_anonymous?: boolean;
  allow_multiple_vote?: boolean;
  require_comment?: boolean;
  show_results?: boolean;
  show_results_after?: boolean;
  category?: string;
  options?: {
    text: string;
    description?: string;
    position?: number;
    color?: string;
    image_url?: string;
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
  require_comment?: boolean;
  show_results?: boolean;
  show_results_after?: boolean;
  category?: string;
  options?: {
    id?: number; // If id exists, update option, otherwise create new
    text: string;
    description?: string;
    position?: number;
    color?: string;
    image_url?: string;
  }[];
}

// Update Poll Status DTO
export interface UpdatePollStatusDto {
  status: PollStatus;
}

// Vote DTO
export interface VoteDto {
  option_id?: number; // For single choice
  option_ids?: number[]; // For multiple choice
  rating_value?: number; // For rating
  ranking_value?: number; // For ranking
  text_value?: string; // For open text
  comment?: string; // Optional comment
  is_anonymous?: boolean;
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

// Poll Voter Response
export interface PollVoter {
  user_id: number;
  user_name: string;
  user_email: string;
  avatar?: string; // Avatar URL
  position?: string; // User position/title
  voted_at: ISODateString;
  is_anonymous: boolean;
  options?: string[]; // Names of selected options
  comment?: string; // Comment if provided
}

// Poll Voters List Response
export interface PollVotersList {
  voters: PollVoter[];
  total_voters: number;
  poll_id: number;
  poll_title: string;
}
