/**
 * Common Types
 * Общие типы, используемые across the application
 */

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

// Pagination Types
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data?: T[];
  messages?: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore?: boolean;
  has_more?: boolean;
}

// Search Types
export interface SearchParams extends PaginationParams {
  query: string;
}

// Filter Types
export interface DateRange {
  start: string;
  end: string;
}

// Loading States
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

// Form Types
export interface FormErrors {
  [key: string]: string | undefined;
}

// File Types
export interface FileUpload {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Timestamp Types
export type ISODateString = string;
export type UnixTimestamp = number;
