/**
 * User Types
 * Типы для работы с пользователями и аутентификацией
 */

import { ISODateString } from './common.types';

// User Roles
export type UserRole = 'employee' | 'manager' | 'admin' | 'super_admin';

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
  created_at: ISODateString;
  updated_at: ISODateString;
}

// User Interface
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatar_url?: string;
  position?: string;
  department_id?: number;
  department?: Department;
  phone?: string;
  bio?: string;
  is_active: boolean;
  last_seen_at?: ISODateString;
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Profile Update Types
export interface UpdateProfileDto {
  name?: string;
  position?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
}

export interface UpdatePasswordDto {
  current_password: string;
  new_password: string;
  confirm_password: string;
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

export interface LoginResponse {
  message: string;
  user: User;
  tokens: TokenPair;
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
  department_id?: number;
  phone?: string;
  is_active?: boolean;
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
  role?: UserRole;
  department_id?: number;
  status?: UserStatus;
  is_active?: boolean;
  search?: string;
}
