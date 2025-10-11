/**
 * Task API
 * API клиент для работы с задачами и проектами
 */

import api from './axios.config';
import { API_ENDPOINTS, PAGINATION } from '@constants/api.constants';
import {
  Task,
  Project,
  TaskComment,
  CreateTaskDto,
  UpdateTaskDto,
  UpdateTaskStatusDto,
  AssignTaskDto,
  AddTaskCommentDto,
  CreateProjectDto,
  UpdateProjectDto,
  TaskListFilters,
  TaskStats,
} from '@types/task.types';
import { ApiResponse, PaginatedResponse, PaginationParams } from '@types/common.types';

// ============= Task Operations =============

/**
 * Get list of tasks with filters
 */
export const getTasks = async (
  filters?: TaskListFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Task>> => {
  const params = {
    ...filters,
    limit: pagination?.limit || PAGINATION.DEFAULT_LIMIT,
    offset: pagination?.offset || PAGINATION.DEFAULT_OFFSET,
  };

  const response = await api.get<ApiResponse<PaginatedResponse<Task>>>(
    API_ENDPOINTS.TASK.LIST,
    { params }
  );
  return response.data.data;
};

/**
 * Create new task
 */
export const createTask = async (data: CreateTaskDto): Promise<Task> => {
  const response = await api.post<ApiResponse<Task>>(API_ENDPOINTS.TASK.CREATE, data);
  return response.data.data;
};

/**
 * Get task by ID
 */
export const getTask = async (id: number): Promise<Task> => {
  const response = await api.get<ApiResponse<Task>>(API_ENDPOINTS.TASK.BY_ID(id));
  return response.data.data;
};

/**
 * Update task
 */
export const updateTask = async (id: number, data: UpdateTaskDto): Promise<Task> => {
  const response = await api.put<ApiResponse<Task>>(API_ENDPOINTS.TASK.UPDATE(id), data);
  return response.data.data;
};

/**
 * Delete task
 */
export const deleteTask = async (id: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.TASK.DELETE(id));
};

/**
 * Update task status
 */
export const updateTaskStatus = async (
  id: number,
  data: UpdateTaskStatusDto
): Promise<Task> => {
  const response = await api.put<ApiResponse<Task>>(
    API_ENDPOINTS.TASK.UPDATE_STATUS(id),
    data
  );
  return response.data.data;
};

/**
 * Assign task to user
 */
export const assignTask = async (id: number, data: AssignTaskDto): Promise<Task> => {
  const response = await api.put<ApiResponse<Task>>(API_ENDPOINTS.TASK.ASSIGN(id), data);
  return response.data.data;
};

/**
 * Get task statistics
 */
export const getTaskStats = async (): Promise<TaskStats> => {
  const response = await api.get<ApiResponse<TaskStats>>(API_ENDPOINTS.TASK.STATS);
  return response.data.data;
};

// ============= Task Comments =============

/**
 * Get task comments
 */
export const getTaskComments = async (taskId: number): Promise<TaskComment[]> => {
  const response = await api.get<ApiResponse<TaskComment[]>>(
    API_ENDPOINTS.TASK.COMMENTS(taskId)
  );
  return response.data.data;
};

/**
 * Add comment to task
 */
export const addTaskComment = async (
  taskId: number,
  data: AddTaskCommentDto
): Promise<TaskComment> => {
  const response = await api.post<ApiResponse<TaskComment>>(
    API_ENDPOINTS.TASK.ADD_COMMENT(taskId),
    data
  );
  return response.data.data;
};

// ============= Project Operations =============

/**
 * Get list of projects
 */
export const getProjects = async (): Promise<Project[]> => {
  const response = await api.get<ApiResponse<Project[]>>(API_ENDPOINTS.PROJECT.LIST);
  return response.data.data;
};

/**
 * Create new project
 */
export const createProject = async (data: CreateProjectDto): Promise<Project> => {
  const response = await api.post<ApiResponse<Project>>(API_ENDPOINTS.PROJECT.CREATE, data);
  return response.data.data;
};

/**
 * Get project by ID
 */
export const getProject = async (id: number): Promise<Project> => {
  const response = await api.get<ApiResponse<Project>>(API_ENDPOINTS.PROJECT.BY_ID(id));
  return response.data.data;
};

/**
 * Update project
 */
export const updateProject = async (id: number, data: UpdateProjectDto): Promise<Project> => {
  const response = await api.put<ApiResponse<Project>>(
    API_ENDPOINTS.PROJECT.UPDATE(id),
    data
  );
  return response.data.data;
};

/**
 * Delete project
 */
export const deleteProject = async (id: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.PROJECT.DELETE(id));
};

/**
 * Get tasks in project
 */
export const getProjectTasks = async (projectId: number): Promise<Task[]> => {
  const response = await api.get<ApiResponse<Task[]>>(
    API_ENDPOINTS.PROJECT.TASKS(projectId)
  );
  return response.data.data;
};
