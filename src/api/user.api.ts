/**
 * User API
 * API клиент для работы с пользователями и департаментами
 */

import api from './axios.config';
import { API_ENDPOINTS, PAGINATION } from '@constants/api.constants';
import {
  User,
  UpdateProfileDto,
  UpdatePasswordDto,
  UpdateStatusDto,
  CreateUserDto,
  UpdateUserDto,
  UserListFilters,
  Department,
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from '@types/user.types';
import { ApiResponse, PaginatedResponse, PaginationParams } from '@types/common.types';

// ============= Profile Operations =============

/**
 * Get current user profile
 */
export const getProfile = async (): Promise<User> => {
  const response = await api.get<ApiResponse<User>>(API_ENDPOINTS.USER.PROFILE);
  return response.data.data;
};

/**
 * Update current user profile
 */
export const updateProfile = async (data: UpdateProfileDto): Promise<User> => {
  const response = await api.put<ApiResponse<User>>(API_ENDPOINTS.USER.PROFILE, data);
  return response.data.data;
};

/**
 * Update password
 */
export const updatePassword = async (data: UpdatePasswordDto): Promise<void> => {
  await api.put(API_ENDPOINTS.USER.UPDATE_PASSWORD, data);
};

/**
 * Update user status
 */
export const updateStatus = async (data: UpdateStatusDto): Promise<User> => {
  const response = await api.put<ApiResponse<User>>(API_ENDPOINTS.USER.UPDATE_STATUS, data);
  return response.data.data;
};

/**
 * Get user by ID
 */
export const getUserById = async (id: number): Promise<User> => {
  const response = await api.get<ApiResponse<User>>(API_ENDPOINTS.USER.PROFILE_BY_ID(id));
  return response.data.data;
};

// ============= User Management (Admin) =============

/**
 * Get list of users with filters and pagination
 */
export const getUsers = async (
  filters?: UserListFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<User>> => {
  const params = {
    ...filters,
    limit: pagination?.limit || PAGINATION.DEFAULT_LIMIT,
    offset: pagination?.offset || PAGINATION.DEFAULT_OFFSET,
  };

  const response = await api.get<ApiResponse<PaginatedResponse<User>>>(
    API_ENDPOINTS.USER.LIST,
    { params }
  );
  return response.data.data;
};

/**
 * Get single user by ID (Admin)
 */
export const getUser = async (id: number): Promise<User> => {
  const response = await api.get<ApiResponse<User>>(API_ENDPOINTS.USER.BY_ID(id));
  return response.data.data;
};

/**
 * Create new user (Admin only)
 */
export const createUser = async (data: CreateUserDto): Promise<User> => {
  const response = await api.post<ApiResponse<User>>(API_ENDPOINTS.USER.CREATE, data);
  return response.data.data;
};

/**
 * Update user (Admin only)
 */
export const updateUser = async (id: number, data: UpdateUserDto): Promise<User> => {
  const response = await api.put<ApiResponse<User>>(API_ENDPOINTS.USER.UPDATE(id), data);
  return response.data.data;
};

/**
 * Delete user (Admin only)
 */
export const deleteUser = async (id: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.USER.DELETE(id));
};

// ============= Department Operations =============

/**
 * Get list of departments
 */
export const getDepartments = async (): Promise<Department[]> => {
  const response = await api.get<ApiResponse<Department[]>>(API_ENDPOINTS.DEPARTMENT.LIST);
  return response.data.data;
};

/**
 * Get department by ID
 */
export const getDepartment = async (id: number): Promise<Department> => {
  const response = await api.get<ApiResponse<Department>>(API_ENDPOINTS.DEPARTMENT.BY_ID(id));
  return response.data.data;
};

/**
 * Create department (Admin only)
 */
export const createDepartment = async (data: CreateDepartmentDto): Promise<Department> => {
  const response = await api.post<ApiResponse<Department>>(
    API_ENDPOINTS.DEPARTMENT.CREATE,
    data
  );
  return response.data.data;
};

/**
 * Update department (Admin only)
 */
export const updateDepartment = async (
  id: number,
  data: UpdateDepartmentDto
): Promise<Department> => {
  const response = await api.put<ApiResponse<Department>>(
    API_ENDPOINTS.DEPARTMENT.UPDATE(id),
    data
  );
  return response.data.data;
};

/**
 * Delete department (Admin only)
 */
export const deleteDepartment = async (id: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.DEPARTMENT.DELETE(id));
};

/**
 * Get users in department
 */
export const getDepartmentUsers = async (id: number): Promise<User[]> => {
  const response = await api.get<ApiResponse<User[]>>(API_ENDPOINTS.DEPARTMENT.USERS(id));
  return response.data.data;
};
