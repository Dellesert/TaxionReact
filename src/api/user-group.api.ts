/**
 * User Group API
 * API клиент для работы с группами пользователей
 */

import api from '../shared/api/axios.config';
import { API_ENDPOINTS } from '@shared/constants/api.constants';
import {
  UserGroup,
  UserGroupWithMembers,
  CreateUserGroupDto,
  UpdateUserGroupDto,
  UpdateUserGroupMembersDto,
  ReorderUserGroupsDto,
} from '../types/user.types';
import { ApiResponse } from '../types/common.types';

// ============= User Group Operations =============

/**
 * Get all user groups
 * @param withMembers - if true, returns groups with full member data
 */
export const getUserGroups = async (withMembers?: boolean): Promise<UserGroup[] | UserGroupWithMembers[]> => {
  const params = withMembers ? { with_members: 'true' } : {};
  const response = await api.get<ApiResponse<any>>(API_ENDPOINTS.USER_GROUP.LIST, { params });

  if (response.data.groups) {
    return response.data.groups;
  }
  return [];
};

/**
 * Get a user group by ID with its members
 */
export const getUserGroup = async (id: number): Promise<UserGroupWithMembers> => {
  const response = await api.get<ApiResponse<any>>(API_ENDPOINTS.USER_GROUP.BY_ID(id));

  if (response.data.group) {
    return response.data.group;
  }
  return response.data as any;
};

/**
 * Create a new user group
 */
export const createUserGroup = async (data: CreateUserGroupDto): Promise<UserGroup> => {
  const response = await api.post<ApiResponse<any>>(API_ENDPOINTS.USER_GROUP.CREATE, data);

  if (response.data.group) {
    return response.data.group;
  }
  return response.data as any;
};

/**
 * Update a user group
 */
export const updateUserGroup = async (id: number, data: UpdateUserGroupDto): Promise<UserGroup> => {
  const response = await api.put<ApiResponse<any>>(API_ENDPOINTS.USER_GROUP.UPDATE(id), data);

  if (response.data.group) {
    return response.data.group;
  }
  return response.data as any;
};

/**
 * Delete a user group
 */
export const deleteUserGroup = async (id: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.USER_GROUP.DELETE(id));
};

/**
 * Replace all members of a user group
 */
export const updateUserGroupMembers = async (id: number, data: UpdateUserGroupMembersDto): Promise<UserGroupWithMembers> => {
  const response = await api.put<ApiResponse<any>>(API_ENDPOINTS.USER_GROUP.MEMBERS(id), data);

  if (response.data.group) {
    return response.data.group;
  }
  return response.data as any;
};

/**
 * Add members to a user group
 */
export const addUserGroupMembers = async (id: number, data: UpdateUserGroupMembersDto): Promise<void> => {
  await api.post(API_ENDPOINTS.USER_GROUP.MEMBERS(id), data);
};

/**
 * Remove members from a user group
 */
export const removeUserGroupMembers = async (id: number, data: UpdateUserGroupMembersDto): Promise<void> => {
  await api.delete(API_ENDPOINTS.USER_GROUP.MEMBERS(id), { data });
};

/**
 * Reorder user groups by providing an ordered list of group IDs
 */
export const reorderUserGroups = async (data: ReorderUserGroupsDto): Promise<void> => {
  await api.put(API_ENDPOINTS.USER_GROUP.REORDER, data);
};
