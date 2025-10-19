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
} from '../types/user.types';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/common.types';

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

  console.log('📞 getUsers called with params:', params);
  console.log('🔗 Endpoint:', API_ENDPOINTS.USER.LIST);
  console.log('🌐 Full URL will be:', `${process.env.EXPO_PUBLIC_API_BASE_URL}${API_ENDPOINTS.USER.LIST}`);

  const response = await api.get<ApiResponse<PaginatedResponse<User>>>(
    API_ENDPOINTS.USER.LIST,
    { params }
  );

  console.log('✅ getUsers full response:', response);
  console.log('✅ getUsers response.data:', response.data);
  console.log('✅ getUsers response.data.data:', response.data.data);
  console.log('✅ getUsers response.data type:', typeof response.data);
  console.log('✅ getUsers response.data keys:', Object.keys(response.data));

  // Пробуем разные варианты структуры ответа
  if (response.data.data) {
    console.log('📦 Using response.data.data');
    return response.data.data;
  } else if (Array.isArray(response.data)) {
    console.log('📦 Response.data is array, wrapping it');
    return {
      data: response.data,
      total: response.data.length,
      limit: params.limit,
      offset: params.offset,
      hasMore: false,
    };
  } else if (response.data.users) {
    console.log('📦 Using response.data.users');
    return {
      data: response.data.users,
      total: response.data.total || response.data.users.length,
      limit: params.limit,
      offset: params.offset,
      hasMore: response.data.has_more || false,
    };
  } else {
    console.log('📦 Unknown response structure, returning as is');
    return response.data as any;
  }
};

/**
 * Get single user by ID (Admin)
 */
export const getUser = async (id: number): Promise<User> => {
  console.log('📞 getUser called for ID:', id);
  const response = await api.get<ApiResponse<User>>(API_ENDPOINTS.USER.BY_ID(id));

  console.log('✅ getUser full response:', response);
  console.log('✅ getUser response.data:', response.data);
  console.log('✅ getUser response.data keys:', Object.keys(response.data));

  // Пробуем разные форматы ответа
  if (response.data.data) {
    console.log('📦 Using response.data.data');
    return response.data.data;
  } else if (response.data.user) {
    console.log('📦 Using response.data.user');
    return response.data.user;
  } else if (response.data.id) {
    console.log('📦 Using response.data directly (has id field)');
    return response.data as User;
  } else {
    console.log('⚠️ Unknown response structure!');
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
