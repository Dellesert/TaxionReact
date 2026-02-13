// ============================================
// ENUMS & CONSTANTS
// ============================================

export type ScheduleType = 'work' | 'paid_services' | 'on_duty' | 'vk' | 'trips';

export type ScheduleVisibility = 'creator_only' | 'management' | 'participants' | 'specific_users' | 'all';

export type ScheduleEditPermission = 'creator_only' | 'management' | 'specific_users' | 'all';

export type ShiftType = 'morning' | 'evening' | 'full_day' | 'custom';

export type ScheduleMode = 'recurring' | 'monthly';

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  work: 'Рабочий график',
  paid_services: 'Платные услуги',
  on_duty: 'Дежурства',
  vk: 'ВК',
  trips: 'Выезды',
};

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  morning: 'Утро',
  evening: 'Вечер',
  full_day: 'Полный день',
  custom: 'Особый',
};

export const VISIBILITY_LABELS: Record<ScheduleVisibility, string> = {
  creator_only: 'Только создатель',
  management: 'Руководство',
  participants: 'Участники',
  specific_users: 'Выбранные пользователи',
  all: 'Все',
};

export const EDIT_PERMISSION_LABELS: Record<ScheduleEditPermission, string> = {
  creator_only: 'Только создатель',
  management: 'Руководители',
  specific_users: 'Выбранные пользователи',
  all: 'Все',
};

export const SCHEDULE_MODE_LABELS: Record<ScheduleMode, string> = {
  recurring: 'Повторяющийся',
  monthly: 'Ежемесячный',
};

// ============================================
// MAIN ENTITIES
// ============================================

export interface ScheduleUser {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  email: string;
  avatar?: string;
  department?: string;
  position?: string;
}

export interface Schedule {
  id: number;
  title: string;
  description?: string;
  type: ScheduleType;
  visibility: ScheduleVisibility;
  edit_permission: ScheduleEditPermission;
  mode: ScheduleMode;
  template_id?: number;
  template?: ScheduleTemplate;
  created_by: number;
  creator?: ScheduleUser;
  department_id?: number;
  user_group_id?: number;
  start_date: string;
  end_date: string;
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
  color: string;
  is_active: boolean;
  imported_from?: string;
  entries_count?: number;
  viewer_ids?: number[];
  editor_ids?: number[];
  created_at: string;
  updated_at: string;
}

export interface ScheduleEntry {
  id: number;
  schedule_id: number;
  schedule?: Schedule;
  user_id: number;
  user?: ScheduleUser;
  date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  title?: string;
  description?: string;
  location?: string;
  event_id?: number;
  is_confirmed: boolean;
  confirmed_at?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduleTemplate {
  id: number;
  title: string;
  description?: string;
  type: ScheduleType;
  created_by: number;
  creator?: ScheduleUser;
  department_id?: number;
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
  color: string;
  is_active: boolean;
  entries?: ScheduleTemplateEntry[];
  created_at: string;
  updated_at: string;
}

export interface ScheduleTemplateEntry {
  id: number;
  template_id: number;
  user_id?: number;
  user?: ScheduleUser;
  day_of_week: number;
  start_time: string;
  end_time: string;
  shift_type?: ShiftType;
  title?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// REQUEST DTOs
// ============================================

export interface CreateScheduleRequest {
  title: string;
  description?: string;
  type: ScheduleType;
  visibility?: ScheduleVisibility;
  edit_permission?: ScheduleEditPermission;
  mode?: ScheduleMode;
  template_id?: number;
  start_date: string;
  end_date: string;
  morning_start?: string;
  morning_end?: string;
  evening_start?: string;
  evening_end?: string;
  color?: string;
  department_id?: number;
  user_group_id?: number;
  viewer_ids?: number[];
  editor_ids?: number[];
}

export interface UpdateScheduleRequest {
  title?: string;
  description?: string;
  type?: ScheduleType;
  visibility?: ScheduleVisibility;
  edit_permission?: ScheduleEditPermission;
  mode?: ScheduleMode;
  start_date?: string;
  end_date?: string;
  morning_start?: string;
  morning_end?: string;
  evening_start?: string;
  evening_end?: string;
  color?: string;
  is_active?: boolean;
  user_group_id?: number | null;
  viewer_ids?: number[];
  editor_ids?: number[];
}

export interface CreateScheduleEntryRequest {
  user_id: number;
  date: string;
  shift_type: ShiftType;
  start_time?: string;
  end_time?: string;
  title?: string;
  description?: string;
  location?: string;
}

export interface CreateBatchEntriesRequest {
  entries: CreateScheduleEntryRequest[];
}

export interface UpdateScheduleEntryRequest {
  user_id?: number;
  shift_type?: ShiftType;
  start_time?: string;
  end_time?: string;
  title?: string;
  description?: string;
  location?: string;
  is_confirmed?: boolean;
}

export interface CreateTemplateRequest {
  title: string;
  description?: string;
  type: ScheduleType;
  morning_start?: string;
  morning_end?: string;
  evening_start?: string;
  evening_end?: string;
  color?: string;
  department_id?: number;
}

export interface CreateTemplateEntryRequest {
  user_id?: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  title?: string;
  shift_type?: ShiftType;
}

// Batch create template entries (for multiple days at once)
export interface CreateBatchTemplateEntriesRequest {
  entries: CreateTemplateEntryRequest[];
}

export interface ApplyTemplateRequest {
  start_date: string;
  end_date: string;
  user_ids?: number[];
}

export interface ImportScheduleRequest {
  file_id: string;
  title: string;
  description?: string;
  type: ScheduleType;
  start_date: string;
  end_date: string;
  color?: string;
  preview?: boolean;
  user_mapping_overrides?: UserMappingOverride[]; // Переопределения сопоставлений пользователей
}

// Цвета по умолчанию для типов графиков
export const DEFAULT_SCHEDULE_COLORS: Record<ScheduleType, string> = {
  on_duty: '#EF4444',      // Дежурства - красный
  paid_services: '#10B981', // Платные услуги - зеленый
  vk: '#3B82F6',           // ВК - синий
  trips: '#8B5CF6',        // Выезды - фиолетовый
  work: '#F59E0B',         // Рабочий график - желтый
};

// ============================================
// RESPONSE DTOs
// ============================================

export interface ScheduleListResponse {
  schedules: Schedule[];
  total: number;
  limit: number;
  offset: number;
}

export interface ScheduleEntriesResponse {
  entries: ScheduleEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface TemplateListResponse {
  templates: ScheduleTemplate[];
  total: number;
  limit: number;
  offset: number;
}

export interface ImportedUser {
  name: string;
  user_id?: number;
  match_score?: number;
  is_unmatched: boolean;
}

// Для переопределения сопоставления пользователей при импорте
export interface UserMappingOverride {
  original_name: string; // Имя из документа
  user_id: number; // ID выбранного пользователя в системе
}

export interface ImportPreviewResponse {
  schedule: Schedule;
  entries: ScheduleEntry[];
  entries_count: number;
  users: ImportedUser[];
  warnings?: string[];
}

export interface ImportResultResponse {
  schedule: Schedule;
  entries_count: number;
  imported_from: string;
  warnings?: string[];
}

export interface ApplyTemplateResponse {
  entries_created: number;
}

// ============================================
// FILTERS
// ============================================

export interface ScheduleFilters {
  type?: ScheduleType;
  is_active?: boolean;
  department_id?: number;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface ScheduleEntryFilters {
  user_id?: number;
  start_date?: string;
  end_date?: string;
  shift_type?: ShiftType;
}

// ============================================
// UI STATE
// ============================================

export interface ScheduleCalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  entries: ScheduleEntry[];
}

export type ScheduleViewMode = 'week' | 'month' | 'list';

export type ScheduleListTab = 'summary' | 'list';

// ============================================
// DAILY SUMMARY
// ============================================

export interface DailySummaryUser {
  user_id: number;
  user: ScheduleUser;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  location?: string;
}

export interface DailySummarySchedule {
  schedule_id: number;
  schedule_title: string;
  schedule_type: ScheduleType;
  color: string;
  users: DailySummaryUser[];
}

export interface DailySummaryAbsence {
  user_id: number;
  user: ScheduleUser;
  type: string;
  reason?: string;
}

export interface DailySummary {
  date: string;
  schedules: DailySummarySchedule[];
  absences: DailySummaryAbsence[];
}

export interface DailySummaryResponse {
  summary: DailySummary;
}
