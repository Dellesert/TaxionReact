/**
 * Task Types
 * Типы для работы с задачами и проектами
 */

import { ISODateString } from './common.types';
import { User } from './user.types';

// Task Status
export type TaskStatus = 'new' | 'in_progress' | 'review' | 'done' | 'cancelled';

// Task Priority
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

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
  comments?: TaskComment[];
  comments_count: number;
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
}

// Update Task DTO
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: number;
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
