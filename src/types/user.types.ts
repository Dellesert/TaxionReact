/**
 * User Types
 * Типы для работы с пользователями и аутентификацией
 */

import { ISODateString } from './common.types';

// User Roles
export type UserRole = 'employee' | 'department_head' | 'admin' | 'super_admin';

// User Status
export type UserStatus = 'online' | 'offline' | 'busy' | 'away';

// Department Interface
export interface Department {
  id: number;
  name: string;
  description?: string;
  head_id?: number;
  head?: User;
  members_count?: number;
  user_count?: number; // Backend returns user_count
  created_at: ISODateString;
  updated_at: ISODateString;
}

// User Interface
export interface User {
  id: number;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  birth_date?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  avatar_thumbnail?: string; // Thumbnail for small avatars (400x300px)
  position?: string;
  department_id?: number;
  department?: Department;
  phone?: string;
  bio?: string;
  color?: string; // HEX color for calendar display
  is_active: boolean;
  two_factor_enabled: boolean;
  last_seen_at?: ISODateString;
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Profile Update Types
export interface UpdateProfileDto {
  name?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  birth_date?: string;
  position?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  avatar_thumbnail?: string; // Thumbnail URL from file-service
  department_id?: number;
  color?: string; // HEX color for calendar display
}

export interface UpdatePasswordDto {
  current_password: string;
  new_password: string;
}

export interface UpdateStatusDto {
  status: UserStatus;
}

// Auth Types
export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

// Session Authentication Types
export interface SessionInfo {
  session_id: string;
  expires_at: number;
}

export type AuthMode = 'jwt' | 'session';

// Active Session Management
export interface ActiveSession {
  session_id: string;
  user_id: number;
  email: string;
  role: UserRole;
  ip_address: string;
  user_agent: string;
  custom_name?: string;
  created_at: string;
  expires_at: string;
  last_active_at: string;
}

export interface GetSessionsResponse {
  sessions: ActiveSession[];
  total: number;
}

export interface LoginResponse {
  message: string;
  user: User;
  tokens?: TokenPair; // Optional for JWT mode
  session?: SessionInfo; // Optional for Session mode
  auth_mode: AuthMode;
  must_change_password?: boolean;
  request_id: string;
}

export interface RegisterDto {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
  position?: string;
  department_id?: number;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface RefreshTokenDto {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
}

// User Management (Admin)
export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  position?: string;
  department_id?: number;
  phone?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: UserRole;
  position?: string;
  department_id?: number | null;
  phone?: string;
  is_active?: boolean;
  color?: string; // HEX color for calendar display
}

// Department Management
export interface CreateDepartmentDto {
  name: string;
  description?: string;
  head_id?: number;
}

export interface UpdateDepartmentDto {
  name?: string;
  description?: string;
  head_id?: number;
}

// User List Filters
export interface UserListFilters {
  // Basic filters
  role?: UserRole;
  department_id?: number;
  status?: UserStatus;
  is_active?: boolean;
  search?: string;
  for_task_assignment?: boolean; // Get all users regardless of current user's department

  // Extended filters
  exclude_roles?: string; // Comma-separated roles to exclude (e.g., "admin,super_admin")
  include_roles?: string; // Comma-separated roles to include (e.g., "employee,department_head")
  only_heads?: boolean; // Show only department heads
  include_other_dept_heads?: boolean; // For dept heads: own department + other department heads
  exclude_me?: boolean; // Exclude current user from list

  // Sorting and ordering
  sort_by?: 'name' | 'email' | 'created_at' | 'department' | 'role'; // Field to sort by
  sort_order?: 'asc' | 'desc'; // Sort order
  prioritize_my_dept?: boolean; // My department first
  dept_head_first?: boolean; // Department heads first within each department
}

// Two-Factor Authentication Types
export interface Send2FADto {
  email: string;
  password: string;
}

export interface Send2FAResponse {
  message: string;
  request_id: string;
  code_expires_in: number;      // 300 seconds (5 minutes)
  can_resend_after: number;     // 60 seconds
}

export interface Verify2FADto {
  email: string;
  code: string;
}

export interface Verify2FAResponse {
  message: string;
  user: User;
  tokens?: TokenPair;
  session?: SessionInfo;
  auth_mode: AuthMode;
  request_id?: string;
}

// Passkey Types
export interface Passkey {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  attestation_type: string;
  aaguid: string;
  sign_count: number;
  name?: string;  // Backend uses 'name', not 'device_name'
  last_used_at?: ISODateString;
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface PasskeyLoginBeginDto {
  email: string;
}

export interface PasskeyLoginBeginResponse {
  publicKey: any; // PublicKeyCredentialRequestOptions
}

export interface PasskeyLoginFinishResponse {
  message: string;
  user: User;
  tokens?: TokenPair;
  session?: SessionInfo;
  auth_mode: AuthMode;
}

export interface PasskeyRegisterBeginResponse {
  publicKey: any; // PublicKeyCredentialCreationOptions
}

export interface PasskeyRegisterFinishDto {
  credential: any; // PublicKeyCredential response
  name: string;
}

export interface PasskeyRegisterFinishResponse {
  message: string;
  passkey: Passkey;
}

export interface PasskeyListResponse {
  passkeys: Passkey[];
}

export interface UpdatePasskeyDto {
  name: string;  // Backend expects 'name', not 'device_name'
}
