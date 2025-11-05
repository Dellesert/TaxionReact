/**
 * Task Types
 * Типы для работы с задачами и проектами
 */

import { ISODateString } from './common.types';
import { User } from './user.types';

// Task Status
export type TaskStatus = 'new' | 'viewed' | 'in_progress' | 'review' | 'done' | 'cancelled';

// Task Priority
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// Task Activity Action Types
export type TaskActivityAction =
  | 'task_created'
  | 'task_updated_title'
  | 'task_updated_description'
  | 'task_updated_priority'
  | 'task_updated_due_date'
  | 'task_status_changed'
  | 'task_assigned'
  | 'task_delegated'
  | 'task_viewed'
  | 'comment_added'
  | 'attachment_added'
  | 'attachment_deleted'
  | 'checklist_added'
  | 'checklist_item_completed'
  | 'checklist_item_uncompleted'
  | 'subtask_created'
  | 'subtask_status_changed'
  | 'progress_updated'
  | 'task_deleted';

// Task Comment Interface
export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  user?: User;
  content: string;
  created_at: ISODateString;
  updated_at: ISODateString;
}

// User Info (for task assignees and creators)
export interface TaskUserInfo {
  id: number;
  name: string;
  email: string;
  position?: string;
  avatar?: string;
}

// Task Activity Interface
export interface TaskActivity {
  id: number;
  task_id: number;
  task_title?: string;
  user_id: number;
  user?: TaskUserInfo;
  action_type: TaskActivityAction;
  old_value?: string;
  new_value?: string;
  details?: string; // JSON string with additional details
  assignees?: TaskUserInfo[]; // For subtask_created activities
  created_at: ISODateString;
}

// Task Attachment Interface
export interface TaskAttachment {
  id: number;
  task_id: number;
  uploaded_by_user_id: number;
  uploaded_by?: TaskUserInfo;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: ISODateString;
}

// Task Checklist Item Interface
export interface TaskChecklistItem {
  id: number;
  checklist_id: number;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Task Checklist Interface
export interface TaskChecklist {
  id: number;
  task_id: number;
  title: string;
  description?: string;
  position: number;
  items: TaskChecklistItem[];
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Task Interface
export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: number; // Deprecated: use assignee_ids
  assignee?: User;
  assignee_ids?: number[]; // Multiple assignees
  assignees?: TaskUserInfo[]; // User info for assignees
  assigned_to_department?: string; // Department assignment
  project_id?: number;
  project?: Project;
  due_date?: ISODateString;
  tags: string[];
  created_by: number;
  creator?: TaskUserInfo; // User info for creator
  last_status_changed_by?: number; // ID of user who last changed status
  last_status_changer?: TaskUserInfo; // User info for last status changer
  comments?: TaskComment[];
  comment_count: number; // Backend returns comment_count not comments_count

  // NEW: Hierarchy fields
  parent_task_id?: number;
  parent_task?: Task;
  subtasks?: Task[];

  // NEW: Delegation fields
  created_by_user_id?: number;
  assigned_to_user_id?: number;
  delegated_from_user_id?: number;
  original_assignee_id?: number;
  delegation_chain?: TaskUserInfo[];

  // NEW: Progress tracking
  progress_percentage?: number;

  // NEW: First-view tracking
  first_viewed_at?: ISODateString;
  first_viewed_by_user_id?: number;
  completed_at?: ISODateString;

  // NEW: Associated data
  activities?: TaskActivity[];
  attachments?: TaskAttachment[];
  checklists?: TaskChecklist[];

  created_at: ISODateString;
  updated_at: ISODateString;
}

// Project Interface
export interface Project {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_by: number;
  creator?: User;
  members: number[];
  tasks_count: number;
  completed_tasks_count: number;
  progress: number;
  start_date?: ISODateString;
  end_date?: ISODateString;
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Checklist data for task creation
export interface CreateTaskChecklistDto {
  title: string;
  items: string[]; // Array of item titles
}

// Create Task DTO
export interface CreateTaskDto {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: number; // Deprecated: use assignee_ids
  assignee_ids?: number[]; // Multiple assignees
  assigned_to_department?: string; // Department assignment
  project_id?: number;
  due_date?: ISODateString;
  tags?: string[];
  checklists?: CreateTaskChecklistDto[]; // Checklists to create with task
}

// Update Task DTO
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: number; // Deprecated: use assignee_ids
  assignee_ids?: number[]; // Multiple assignees
  assigned_to_department?: string; // Department assignment
  project_id?: number;
  due_date?: ISODateString;
  tags?: string[];
}

// Update Task Status DTO
export interface UpdateTaskStatusDto {
  status: TaskStatus;
}

// Assign Task DTO
export interface AssignTaskDto {
  user_id: number;
}

// Add Task Comment DTO
export interface AddTaskCommentDto {
  content: string;
}

// Create Project DTO
export interface CreateProjectDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  member_ids?: number[];
  start_date?: ISODateString;
  end_date?: ISODateString;
}

// Update Project DTO
export interface UpdateProjectDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  member_ids?: number[];
  start_date?: ISODateString;
  end_date?: ISODateString;
}

// Task List Filters
export interface TaskListFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: number;
  created_by?: number;
  project_id?: number;
  tags?: string[];
  due_date_from?: ISODateString;
  due_date_to?: ISODateString;
  search?: string;
}

// Task Statistics
export interface TaskStats {
  total: number;
  by_status: {
    [K in TaskStatus]: number;
  };
  by_priority: {
    [K in TaskPriority]: number;
  };
  overdue: number;
  completed_this_week: number;
  completed_this_month: number;
}

// NEW DTOs

// Delegate Task DTO
export interface DelegateTaskDto {
  to_user_id: number;
}

// Update Task Progress DTO
export interface UpdateTaskProgressDto {
  progress: number; // 0-100
}

// Create Checklist DTO
export interface CreateChecklistDto {
  title: string;
  description?: string;
}

// Update Checklist DTO
export interface UpdateChecklistDto {
  title?: string;
  description?: string;
}

// Create Checklist Item DTO
export interface CreateChecklistItemDto {
  title: string;
  position?: number;
}

// Update Checklist Item DTO
export interface UpdateChecklistItemDto {
  title?: string;
  is_completed?: boolean;
  position?: number;
}

// Activity List Response
export interface ActivityListResponse {
  activities: TaskActivity[];
  total: number;
  limit: number;
  offset: number;
}

// Attachment Upload Response (multipart/form-data)
// File will be sent as FormData with key 'file'
