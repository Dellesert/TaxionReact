// ============================================
// ENUMS & CONSTANTS
// ============================================

export type AbsenceType =
  | 'vacation'
  | 'sick_leave'
  | 'day_off'
  | 'business_trip'
  | 'study_leave';

export const ABSENCE_TYPE_LABELS: Record<AbsenceType, string> = {
  vacation: 'Отпуск',
  sick_leave: 'Больничный',
  day_off: 'Отгул',
  business_trip: 'Командировка',
  study_leave: 'Учебный отпуск',
};

export const ABSENCE_TYPE_COLORS: Record<AbsenceType, string> = {
  vacation: '#4CAF50',
  sick_leave: '#F44336',
  day_off: '#FF9800',
  business_trip: '#2196F3',
  study_leave: '#9C27B0',
};

export const ABSENCE_TYPE_ICONS: Record<AbsenceType, string> = {
  vacation: 'sunny',
  sick_leave: 'medkit',
  day_off: 'time',
  business_trip: 'airplane',
  study_leave: 'school',
};

export const ABSENCE_TYPES: AbsenceType[] = [
  'vacation',
  'sick_leave',
  'day_off',
  'business_trip',
  'study_leave',
];

// ============================================
// MAIN ENTITIES
// ============================================

export interface AbsenceUser {
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

export interface Absence {
  id: number;
  user_id: number;
  user?: AbsenceUser;
  type: AbsenceType;
  start_date: string;
  end_date: string;
  reason?: string;
  created_by: number;
  creator?: AbsenceUser;
  created_at: string;
  updated_at: string;
  // Substitutions (optional, may be included in list response)
  substitutions?: Substitution[];
  substitution_count?: number;
}

// Forward declaration for Absence
export interface Substitution {
  id: number;
  absence_id: number;
  substitute_id: number;
  substitute?: AbsenceUser;
  start_date: string;
  end_date: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// REQUEST DTOs
// ============================================

export interface CreateAbsenceRequest {
  user_id: number;
  type: AbsenceType;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface UpdateAbsenceRequest {
  type?: AbsenceType;
  start_date?: string;
  end_date?: string;
  reason?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

export interface AbsenceListResponse {
  absences: Absence[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserAbsencesResponse {
  absences: Absence[];
  user_id: number;
  start_date: string;
  end_date: string;
}

// ============================================
// FILTERS
// ============================================

export interface AbsenceFilters {
  user_id?: number;
  type?: AbsenceType;
  start_date?: string;
  end_date?: string;
  sort_order?: 'asc' | 'desc';
}

// ============================================
// SUBSTITUTION REQUEST DTOs
// ============================================

export interface CreateSubstitutionRequest {
  substitute_id: number;
  start_date: string;
  end_date: string;
  note?: string;
}

export interface UpdateSubstitutionRequest {
  substitute_id?: number;
  start_date?: string;
  end_date?: string;
  note?: string;
}
