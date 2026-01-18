/**
 * Dashboard Types
 * Типы для экрана сводки (Dashboard)
 */

import { Task } from '@/features/tasks/types/task.types';
import { Poll } from '@/features/polls/types/poll.types';

/**
 * Счетчики для Dashboard
 */
export interface DashboardCounts {
  new_tasks_count: number;
  active_tasks_count: number;
  overdue_tasks_count: number;
  pending_polls_count: number;
}

/**
 * Данные Dashboard
 */
export interface DashboardData {
  /** Новые задачи (status = 'new') */
  new_tasks: Task[];
  /** Активные задачи пользователя (status = 'in_progress' | 'review') */
  active_tasks: Task[];
  /** Просроченные задачи (due_date < now) */
  overdue_tasks: Task[];
  /** Опросы в которых пользователь не голосовал */
  pending_polls: Poll[];
  /** Счетчики по категориям */
  counts: DashboardCounts;
}

/**
 * Ответ API Dashboard
 */
export interface DashboardApiResponse {
  success: boolean;
  data: DashboardData;
}

/**
 * Типы секций Dashboard
 */
export type DashboardSectionType =
  | 'new_tasks'
  | 'active_tasks'
  | 'overdue_tasks'
  | 'pending_polls';

/**
 * Конфигурация секции Dashboard
 */
export interface DashboardSectionConfig {
  key: DashboardSectionType;
  title: string;
  icon: string;
  emptyText: string;
  color: string;
}
