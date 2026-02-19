/**
 * Task API
 * API клиент для работы с задачами и проектами
 */

import api from '@shared/api/axios.config';
import { API_ENDPOINTS, PAGINATION, API_BASE_URL } from '@shared/constants/api.constants';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
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
  TaskActivity,
  ActivityListResponse,
  TaskAttachment,
  TaskChecklist,
  CreateChecklistDto,
  UpdateChecklistDto,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
  DelegateTaskDto,
  UpdateTaskProgressDto,
  UpdateAssigneeStatusDto,
} from '../types/task.types';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../../../types/common.types';

// ============= Task Operations =============

/**
 * Get list of tasks with filters
 * @param filters - Task filters
 * @param pagination - Pagination params
 * @param since - ISO date string for differential sync (only tasks updated after this date)
 */
export const getTasks = async (
  filters?: TaskListFilters,
  pagination?: PaginationParams,
  since?: string
): Promise<PaginatedResponse<Task>> => {
  const params: any = {
    ...filters,
    limit: pagination?.limit || PAGINATION.DEFAULT_LIMIT,
    offset: pagination?.offset || PAGINATION.DEFAULT_OFFSET,
    include_permissions: true, // Request permissions from backend
  };

  // Add updated_since parameter for differential sync
  if (since) {
    params.updated_since = since;
  }

  const response = await api.get<ApiResponse<PaginatedResponse<Task>>>(
    API_ENDPOINTS.TASK.LIST,
    { params }
  );

  let result: PaginatedResponse<Task>;

  if (response.data.data) {
    result = response.data.data;
  } else if (Array.isArray(response.data)) {
    result = {
      data: response.data,
      total: response.data.length,
      limit: params.limit,
      offset: params.offset,
      hasMore: false,
    };
  } else if (response.data.tasks) {
    result = {
      data: response.data.tasks,
      total: response.data.total || response.data.tasks.length,
      limit: params.limit,
      offset: params.offset,
      hasMore: (params.offset + response.data.tasks.length) < (response.data.total || response.data.tasks.length),
    };
  } else {
    result = {
      data: [],
      total: 0,
      limit: params.limit,
      offset: params.offset,
      hasMore: false,
    };
  }

  // Note: delegation_chain is now included inline in the API response
  // No need for separate delegation chain loading

  return result;
};

/**
 * Get tasks by specific status with pagination
 * @param status - Task status
 * @param limit - Number of tasks to fetch
 * @param offset - Pagination offset
 * @param additionalFilters - Additional filters
 * @param since - ISO date string for differential sync
 */
export const getTasksByStatus = async (
  status: 'new' | 'in_progress' | 'review' | 'done',
  limit: number = 3,
  offset: number = 0,
  additionalFilters?: Record<string, any>,
  since?: string
): Promise<PaginatedResponse<Task>> => {
  // If additionalFilters already has a status (array or single), use it instead of the status parameter
  const filters = { ...additionalFilters };

  // Only set status if it's not already present in additionalFilters
  if (!filters.status) {
    filters.status = status;
  }

  return getTasks(filters, { limit, offset }, since);
};

/**
 * Create new task
 */
export const createTask = async (data: CreateTaskDto): Promise<Task> => {
  const response = await api.post<ApiResponse<Task>>(API_ENDPOINTS.TASK.CREATE, data);

  if (response.data.data) {
    return response.data.data;
  } else if (response.data.task) {
    return response.data.task;
  }

  return response.data as any;
};

/**
 * Get task by ID
 */
export const getTask = async (id: number): Promise<Task> => {
  const response = await api.get<ApiResponse<Task>>(API_ENDPOINTS.TASK.BY_ID(id), {
    params: {
      include: 'attachments.uploaded_by'
    }
  });

  let task: Task;
  if (response.data.data) {
    task = response.data.data;
  } else if (response.data.task) {
    task = response.data.task;
  } else {
    task = response.data as any;
  }

  // Note: delegation_chain is now included inline in the API response
  // No need for separate delegation chain loading

  return task;
};

/**
 * Update task
 */
export const updateTask = async (id: number, data: UpdateTaskDto): Promise<Task> => {
  const response = await api.put<ApiResponse<Task>>(API_ENDPOINTS.TASK.UPDATE(id), data);

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
 * Emergency complete task (for overdue tasks by delegation chain users)
 */
export const emergencyCompleteTask = async (id: number): Promise<Task> => {
  const response = await api.post<ApiResponse<Task>>(
    `/tasks/${id}/emergency-complete`
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
  const response = await api.post<ApiResponse<Task>>(API_ENDPOINTS.TASK.ASSIGN(id), data);

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
  const response = await api.delete<ApiResponse<Task>>(API_ENDPOINTS.TASK.UNASSIGN(id));

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
  const response = await api.get<any>(
    API_ENDPOINTS.TASK.COMMENTS(taskId),
    { params: { limit, offset } }
  );

  if (response.data.comments !== undefined) {
    const comments = response.data.comments;
    const total = response.data.total || comments.length;
    const hasMore = (offset + comments.length) < total;
    return { comments, total, hasMore };
  } else if (response.data.data) {
    const comments = response.data.data;
    return { comments, total: comments.length, hasMore: false };
  } else if (Array.isArray(response.data)) {
    const comments = response.data;
    return { comments, total: comments.length, hasMore: false };
  }

  return { comments: [], total: 0, hasMore: false };
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
  const response = await api.put<ApiResponse<TaskComment>>(
    API_ENDPOINTS.TASK.UPDATE_COMMENT(commentId),
    { content }
  );

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
  await api.delete(API_ENDPOINTS.TASK.DELETE_COMMENT(commentId));
};

// ============= Task Hierarchy =============

/**
 * Create subtask
 */
export const createSubtask = async (
  parentTaskId: number,
  data: CreateTaskDto
): Promise<Task> => {
  const response = await api.post<Task>(
    `/tasks/${parentTaskId}/subtasks`,
    data
  );
  return response.data;
};

/**
 * Get subtasks
 */
export const getSubtasks = async (parentTaskId: number): Promise<Task[]> => {
  const response = await api.get<Task[]>(
    `/tasks/${parentTaskId}/subtasks`
  );
  return response.data;
};

/**
 * Get task hierarchy (task with subtasks and parent)
 */
export const getTaskHierarchy = async (taskId: number): Promise<Task> => {
  const response = await api.get<ApiResponse<Task>>(
    `/tasks/${taskId}/hierarchy`
  );
  return response.data.data || response.data.task || (response.data as any);
};

// ============= Task Delegation =============

/**
 * Delegate task to another user
 */
export const delegateTask = async (
  taskId: number,
  data: DelegateTaskDto
): Promise<Task> => {
  const response = await api.post<ApiResponse<Task>>(
    `/tasks/${taskId}/delegate`,
    data
  );
  return response.data.data || response.data.task || (response.data as any);
};

/**
 * Get delegation chain
 */
export const getDelegationChain = async (taskId: number): Promise<any> => {
  const response = await api.get<ApiResponse<any>>(
    `/tasks/${taskId}/delegation-chain`
  );
  return response.data.delegation_chain || response.data.data || [];
};

// ============= Task Tracking =============

/**
 * Mark task as viewed
 */
export const markTaskAsViewed = async (taskId: number): Promise<Task> => {
  const response = await api.post<ApiResponse<Task>>(
    `/tasks/${taskId}/view`
  );
  return response.data.data || response.data.task || (response.data as any);
};

/**
 * Update task progress manually
 */
export const updateTaskProgress = async (
  taskId: number,
  data: UpdateTaskProgressDto
): Promise<Task> => {
  const response = await api.patch<ApiResponse<Task>>(
    `/tasks/${taskId}/progress`,
    data
  );
  return response.data.data || response.data.task || (response.data as any);
};

// ============= Group Task Operations =============

/**
 * Update assignee status for a group task
 */
export const updateAssigneeStatus = async (
  taskId: number,
  data: UpdateAssigneeStatusDto
): Promise<Task> => {
  const response = await api.patch<ApiResponse<Task>>(
    `/tasks/${taskId}/assignee-status`,
    data
  );
  if (response.data.data) {
    return response.data.data;
  } else if (response.data.task) {
    return response.data.task;
  }
  return response.data as any;
};

// ============= Task Activities =============

/**
 * Get task activities (activity log)
 */
export const getTaskActivities = async (
  taskId: number,
  limit: number = 50,
  offset: number = 0
): Promise<ActivityListResponse> => {
  const response = await api.get<ApiResponse<ActivityListResponse>>(
    `/tasks/${taskId}/activities`,
    { params: { limit, offset } }
  );
  return response.data.data || response.data as any;
};

// ============= Task Attachments =============

/**
 * Upload attachment to task
 */
export const uploadAttachment = async (
  taskId: number,
  file: File | { uri: string; name: string; type: string }
): Promise<TaskAttachment> => {

  const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
  if (!sessionId) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();

  // Format file for FormData
  if (file instanceof File) {
    formData.append('file', file, file.name);
  } else {
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
  }

  // Use XMLHttpRequest like in fileApi - it handles React Native FormData correctly
  const xhr = new XMLHttpRequest();

  return new Promise<TaskAttachment>((resolve, reject) => {
    xhr.addEventListener('load', () => {

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          console.error('❌ Failed to parse response:', error);
          reject(new Error('Failed to parse response'));
        }
      } else {
        console.error('❌ Upload failed:', {
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.responseText
        });
        let errorMessage = `Upload failed with status ${xhr.status}`;
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          if (errorResponse.error) {
            errorMessage += `: ${errorResponse.error}`;
          }
        } catch (e) {
          // Unable to parse error response
        }
        reject(new Error(errorMessage));
      }
    });

    xhr.addEventListener('error', () => {
      console.error('❌ Network error during upload');
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      console.error('❌ Upload aborted');
      reject(new Error('Upload aborted'));
    });

    xhr.open('POST', `${API_BASE_URL}/tasks/${taskId}/attachments`);
    xhr.setRequestHeader('X-Session-ID', sessionId);
    // Don't set Content-Type - XMLHttpRequest will set it automatically with boundary
    xhr.send(formData);
  });
};

/**
 * Get task attachments
 */
export const getTaskAttachments = async (taskId: number): Promise<TaskAttachment[]> => {
  const response = await api.get<ApiResponse<TaskAttachment[]>>(
    `/tasks/${taskId}/attachments`
  );
  return response.data.data || response.data as any || [];
};

/**
 * Attach uploaded file to task
 */
export const attachFileToTask = async (taskId: number, fileId: number): Promise<TaskAttachment> => {
  const response = await api.post<ApiResponse<TaskAttachment>>(
    `/tasks/${taskId}/attachments`,
    { file_id: fileId }
  );
  return response.data.data || response.data as any;
};

/**
 * Delete attachment
 */
export const deleteAttachment = async (attachmentId: number): Promise<void> => {
  const response = await api.delete(`/attachments/${attachmentId}`);
};

// ============= Task Checklists =============

/**
 * Create checklist for task
 */
export const createChecklist = async (
  taskId: number,
  data: CreateChecklistDto
): Promise<TaskChecklist> => {
  const response = await api.post<ApiResponse<TaskChecklist>>(
    `/tasks/${taskId}/checklists`,
    data
  );
  return response.data.data || (response.data as any);
};

/**
 * Get task checklists with items
 */
export const getTaskChecklists = async (taskId: number): Promise<TaskChecklist[]> => {
  const response = await api.get<ApiResponse<TaskChecklist[]>>(
    `/tasks/${taskId}/checklists`
  );
  return response.data.data || response.data as any || [];
};

/**
 * Update checklist
 */
export const updateChecklist = async (
  checklistId: number,
  data: UpdateChecklistDto
): Promise<TaskChecklist> => {
  const response = await api.put<ApiResponse<TaskChecklist>>(
    `/checklists/${checklistId}`,
    data
  );
  return response.data.data || (response.data as any);
};

/**
 * Delete checklist
 */
export const deleteChecklist = async (checklistId: number): Promise<void> => {
  await api.delete(`/checklists/${checklistId}`);
};

/**
 * Create checklist item
 */
export const createChecklistItem = async (
  checklistId: number,
  data: CreateChecklistItemDto
): Promise<any> => {
  const response = await api.post<ApiResponse<any>>(
    `/checklists/${checklistId}/items`,
    data
  );
  return response.data.data || (response.data as any);
};

/**
 * Update checklist item
 */
export const updateChecklistItem = async (
  itemId: number,
  data: UpdateChecklistItemDto
): Promise<any> => {
  const response = await api.put<ApiResponse<any>>(
    `/checklist-items/${itemId}`,
    data
  );
  return response.data.data || (response.data as any);
};

/**
 * Toggle checklist item completion
 */
export const toggleChecklistItem = async (itemId: number): Promise<any> => {
  const response = await api.patch<ApiResponse<any>>(
    `/checklist-items/${itemId}/toggle`
  );
  return response.data.data || (response.data as any);
};

/**
 * Delete checklist item
 */
export const deleteChecklistItem = async (itemId: number): Promise<void> => {
  await api.delete(`/checklist-items/${itemId}`);
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
