/**
 * User API
 * API клиент для работы с пользователями и департаментами
 */

import api from './axios.config';
import { API_ENDPOINTS, API_BASE_URL, PAGINATION } from '@constants/api.constants';
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
} from '../types/user.types';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/common.types';

// ============= Profile Operations =============

/**
 * Get current user profile
 */
export const getProfile = async (): Promise<User> => {
  const response = await api.get<ApiResponse<User>>(API_ENDPOINTS.USER.PROFILE);

  if (response.data.data) {
    return response.data.data;
  } else if (response.data.profile) {
    return response.data.profile;
  } else if (response.data.user) {
    return response.data.user;
  } else if (response.data.id) {
    return response.data as User;
  } else {
    return response.data as any;
  }
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

  // Try different response formats
  if (response.data.profile) {
    return response.data.profile;
  } else if (response.data.data) {
    return response.data.data;
  } else if (response.data.user) {
    return response.data.user;
  } else if (response.data.id) {
    return response.data as User;
  } else {
    return response.data as any;
  }
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

  if (response.data.data) {
    return response.data.data;
  } else if (Array.isArray(response.data)) {
    return {
      data: response.data,
      total: response.data.length,
      limit: params.limit,
      offset: params.offset,
      hasMore: false,
    };
  } else if (response.data.users) {
    return {
      data: response.data.users,
      total: response.data.total || response.data.users.length,
      limit: params.limit,
      offset: params.offset,
      hasMore: response.data.has_more || false,
    };
  } else {
    return response.data as any;
  }
};

/**
 * Get single user by ID (Admin)
 */
export const getUser = async (id: number): Promise<User> => {
  const response = await api.get<ApiResponse<User>>(API_ENDPOINTS.USER.BY_ID(id));

  if (response.data.data) {
    return response.data.data;
  } else if (response.data.user) {
    return response.data.user;
  } else if (response.data.id) {
    return response.data as User;
  } else {
    return response.data as any;
  }
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

  // Try different response structures
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.user) {
    return response.data.user;
  } else if (response.data.id) {
    return response.data as User;
  } else {
    return response.data as any;
  }
};

/**
 * Update user role (Admin only)
 */
export const updateUserRole = async (id: number, role: string): Promise<User> => {
  const response = await api.put<ApiResponse<User>>(API_ENDPOINTS.USER.UPDATE_ROLE(id), { role });

  // Try different response structures
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.user) {
    return response.data.user;
  } else if (response.data.id) {
    return response.data as User;
  } else {
    return response.data as any;
  }
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

  // Try different response structures
  if (response.data.data) {
    return response.data.data;
  } else if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data.departments) {
    return response.data.departments;
  } else {
    return response.data as any;
  }
};

/**
 * Get department by ID
 */
export const getDepartment = async (id: number): Promise<Department> => {
  const response = await api.get<ApiResponse<Department>>(API_ENDPOINTS.DEPARTMENT.BY_ID(id));

  // Try different response structures
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.department) {
    return response.data.department;
  } else if (response.data.id) {
    return response.data as Department;
  } else {
    return response.data as any;
  }
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

  // Try different response structures
  if (response.data.department?.users) {
    // Backend returns {department: {users: [...]}}
    return response.data.department.users;
  } else if (response.data.data) {
    return response.data.data;
  } else if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data.users) {
    return response.data.users;
  } else {
    console.warn('Unexpected response format from getDepartmentUsers:', response.data);
    return [];
  }
};

/**
 * Update user avatar
 */
export const updateAvatar = async (avatarUrl: string): Promise<User> => {
  const response = await api.put<ApiResponse<User>>(API_ENDPOINTS.USER.PROFILE, {
    avatar: avatarUrl,
  });

  if (response.data.data) {
    return response.data.data;
  } else if (response.data.profile) {
    return response.data.profile;
  } else if (response.data.user) {
    return response.data.user;
  } else if (response.data.id) {
    return response.data as User;
  } else {
    return response.data as any;
  }
};
