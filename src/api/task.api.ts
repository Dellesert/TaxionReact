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
} from '../types/task.types';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../types/common.types';

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

  console.log('📋 Fetching tasks with params:', params);

  const response = await api.get<ApiResponse<PaginatedResponse<Task>>>(
    API_ENDPOINTS.TASK.LIST,
    { params }
  );

  console.log('📋 Tasks response:', response.data);

  // Handle different response formats from backend
  if (response.data.data) {
    return response.data.data;
  } else if (Array.isArray(response.data)) {
    // Server returns array directly
    return {
      data: response.data,
      total: response.data.length,
      limit: params.limit,
      offset: params.offset,
      hasMore: false,
    };
  } else if (response.data.tasks) {
    // Server returns {tasks: [...], count: number}
    return {
      data: response.data.tasks,
      total: response.data.count || response.data.tasks.length,
      limit: params.limit,
      offset: params.offset,
      hasMore: response.data.tasks.length === params.limit,
    };
  }

  // Fallback
  return {
    data: [],
    total: 0,
    limit: params.limit,
    offset: params.offset,
    hasMore: false,
  };
};

/**
 * Create new task
 */
export const createTask = async (data: CreateTaskDto): Promise<Task> => {
  console.log('📋 Creating task:', data);

  const response = await api.post<ApiResponse<Task>>(API_ENDPOINTS.TASK.CREATE, data);

  console.log('📋 Task created:', response.data);

  // Handle different response formats
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.task) {
    return response.data.task;
  }

  // Server might return task directly
  return response.data as any;
};

/**
 * Get task by ID
 */
export const getTask = async (id: number): Promise<Task> => {
  console.log('📋 Fetching task:', id);

  const response = await api.get<ApiResponse<Task>>(API_ENDPOINTS.TASK.BY_ID(id));

  console.log('📋 Task response:', response.data);

  // Handle different response formats
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.task) {
    return response.data.task;
  }

  return response.data as any;
};

/**
 * Update task
 */
export const updateTask = async (id: number, data: UpdateTaskDto): Promise<Task> => {
  console.log('📋 Updating task:', id, data);

  const response = await api.put<ApiResponse<Task>>(API_ENDPOINTS.TASK.UPDATE(id), data);

  console.log('📋 Task updated:', response.data);

  // Handle different response formats
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.task) {
    return response.data.task;
  }

  return response.data as any;
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
  const response = await api.patch<ApiResponse<Task>>(
    API_ENDPOINTS.TASK.UPDATE_STATUS(id),
    data
  );

  // Handle different response formats
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.task) {
    return response.data.task;
  }

  return response.data as any;
};

/**
 * Assign task to user
 */
export const assignTask = async (id: number, data: AssignTaskDto): Promise<Task> => {
  console.log(`📌 Assigning task ${id} to user ${data.user_id}`);

  const response = await api.post<ApiResponse<Task>>(API_ENDPOINTS.TASK.ASSIGN(id), data);

  console.log(`✅ Task ${id} assigned successfully`);

  // Handle different response formats
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.task) {
    return response.data.task;
  }

  return response.data as any;
};

/**
 * Unassign task from user
 */
export const unassignTask = async (id: number): Promise<Task> => {
  console.log(`📌 Unassigning task ${id}`);

  const response = await api.delete<ApiResponse<Task>>(API_ENDPOINTS.TASK.UNASSIGN(id));

  console.log(`✅ Task ${id} unassigned successfully`);

  // Handle different response formats
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.task) {
    return response.data.task;
  }

  return response.data as any;
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
 * Get task comments with pagination
 */
export const getTaskComments = async (
  taskId: number,
  limit: number = 20,
  offset: number = 0
): Promise<{ comments: TaskComment[], total: number, hasMore: boolean }> => {
  console.log(`💬 Getting comments for task ${taskId} (limit: ${limit}, offset: ${offset})`);

  const response = await api.get<any>(
    API_ENDPOINTS.TASK.COMMENTS(taskId),
    { params: { limit, offset } }
  );

  console.log(`💬 Comments response:`, response.data);

  // Handle different response formats
  if (response.data.comments !== undefined) {
    // Backend returns {comments: [...], total: number, limit: number, offset: number}
    const comments = response.data.comments;
    const total = response.data.total || comments.length;
    const hasMore = (offset + comments.length) < total;

    console.log(`✅ Found ${comments.length} comments (total: ${total}, hasMore: ${hasMore})`);

    return { comments, total, hasMore };
  } else if (response.data.data) {
    const comments = response.data.data;
    return { comments, total: comments.length, hasMore: false };
  } else if (Array.isArray(response.data)) {
    const comments = response.data;
    return { comments, total: comments.length, hasMore: false };
  }

  console.log(`⚠️ No comments found, returning empty array`);
  return { comments: [], total: 0, hasMore: false };
};

/**
 * Add comment to task
 */
export const addTaskComment = async (
  taskId: number,
  data: AddTaskCommentDto
): Promise<TaskComment> => {
  console.log(`💬 Adding comment to task ${taskId}`);

  const response = await api.post<ApiResponse<TaskComment>>(
    API_ENDPOINTS.TASK.ADD_COMMENT(taskId),
    data
  );

  console.log(`✅ Comment added to task ${taskId}`);

  // Handle different response formats
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.comment) {
    return response.data.comment;
  }

  return response.data as any;
};

/**
 * Update comment
 */
export const updateComment = async (
  commentId: number,
  content: string
): Promise<TaskComment> => {
  console.log(`💬 Updating comment ${commentId}`);

  const response = await api.put<ApiResponse<TaskComment>>(
    API_ENDPOINTS.TASK.UPDATE_COMMENT(commentId),
    { content }
  );

  console.log(`✅ Comment ${commentId} updated successfully`);

  // Handle different response formats
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.comment) {
    return response.data.comment;
  }

  return response.data as any;
};

/**
 * Delete comment
 */
export const deleteComment = async (commentId: number): Promise<void> => {
  console.log(`💬 Deleting comment ${commentId}`);
  await api.delete(API_ENDPOINTS.TASK.DELETE_COMMENT(commentId));
  console.log(`✅ Comment ${commentId} deleted successfully`);
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
