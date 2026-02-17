/**
 * Global Search Types
 * Типы для унифицированного API поиска
 */

export type SearchEntityType = 'task' | 'poll' | 'chat' | 'message' | 'event' | 'schedule';

export interface TaskSearchMetadata {
  status: string;
  priority: string;
  due_date: string | null;
  department_id: number | null;
}

export interface PollSearchMetadata {
  status: string;
  type: string;
  visibility: string;
  category: string;
  department_id: number | null;
}

export interface ChatSearchMetadata {
  type: string;
}

export interface MessageSearchMetadata {
  chat_id: number;
  sender_id: number;
  type: string;
}

export interface EventSearchMetadata {
  type: string;
  location: string | null;
  all_day: boolean;
}

export interface ScheduleSearchMetadata {
  type: string;
  visibility: string;
  is_active: boolean;
  department_id: number | null;
}

export type SearchResultMetadata =
  | TaskSearchMetadata
  | PollSearchMetadata
  | ChatSearchMetadata
  | MessageSearchMetadata
  | EventSearchMetadata
  | ScheduleSearchMetadata;

export interface SearchResult {
  entity_type: SearchEntityType;
  entity_id: number;
  title: string;
  content: string;
  metadata: SearchResultMetadata;
  rank: number;
  created_at: string;
  updated_at: string;
}

export interface SearchCategory {
  type: SearchEntityType;
  results: SearchResult[];
  total: number;
  has_more: boolean;
}

export interface GlobalSearchResponse {
  query: string;
  categories: SearchCategory[];
  total_count: number;
}

export interface GlobalSearchParams {
  q: string;
  type?: SearchEntityType[];
  limit?: number;
  category?: SearchEntityType;
  offset?: number;
}
