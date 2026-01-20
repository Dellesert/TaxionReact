# Work Schedules Frontend Implementation

## Обзор

Реализация модуля графиков работы для React Native приложения TaxionReact. Модуль должен быть вынесен из `features/dashboard/` в отдельную feature `features/schedules/`.

## Структура нового модуля

```
src/features/schedules/
├── api/
│   └── schedule.api.ts              # API вызовы
├── components/
│   ├── ScheduleCard.tsx             # Карточка графика
│   ├── ScheduleEntryCard.tsx        # Карточка записи в графике
│   ├── ScheduleEntryRow.tsx         # Строка записи (в списке)
│   ├── ScheduleHeader.tsx           # Заголовок экрана
│   ├── ScheduleWeekView.tsx         # Недельный вид
│   ├── ScheduleMonthView.tsx        # Месячный вид
│   ├── ScheduleCalendarDay.tsx      # День в календаре
│   ├── ShiftTypeBadge.tsx           # Бейдж типа смены
│   ├── ScheduleFilters.tsx          # Фильтры
│   ├── CreateScheduleModal.tsx      # Модалка создания графика
│   ├── CreateEntryModal.tsx         # Модалка создания записи
│   ├── TemplateSelector.tsx         # Выбор шаблона
│   └── ImportPreview.tsx            # Превью импорта
├── hooks/
│   ├── useSchedules.ts              # Загрузка списка графиков
│   ├── useScheduleDetails.ts        # Детали графика
│   ├── useScheduleEntries.ts        # Записи графика
│   ├── useMyScheduleEntries.ts      # Мои записи
│   ├── useScheduleTemplates.ts      # Шаблоны
│   └── useScheduleImport.ts         # Импорт из Word
├── screens/
│   ├── ScheduleListScreen.tsx       # Список графиков
│   ├── ScheduleDetailScreen.tsx     # Детали графика
│   ├── ScheduleCalendarScreen.tsx   # Календарный вид
│   ├── MyScheduleScreen.tsx         # Мои смены
│   └── ScheduleTemplatesScreen.tsx  # Шаблоны (админ)
├── store/
│   └── scheduleStore.ts             # Zustand store
├── types/
│   └── schedule.types.ts            # TypeScript типы
├── utils/
│   ├── scheduleHelpers.ts           # Вспомогательные функции
│   └── shiftColors.ts               # Цвета для смен
└── index.ts                         # Экспорты
```

---

## 1. TypeScript Types

### `src/features/schedules/types/schedule.types.ts`

```typescript
// ============================================
// ENUMS & CONSTANTS
// ============================================

export type ScheduleType = 'work' | 'paid_services' | 'on_duty' | 'shift' | 'custom';

export type ScheduleVisibility = 'creator_only' | 'management' | 'participants';

export type ShiftType = 'morning' | 'evening' | 'full_day' | 'custom';

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  work: 'Рабочий график',
  paid_services: 'Платные услуги',
  on_duty: 'Дежурства',
  shift: 'Сменный график',
  custom: 'Другое',
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
};

// ============================================
// MAIN ENTITIES
// ============================================

export interface Schedule {
  id: number;
  title: string;
  description?: string;
  type: ScheduleType;
  visibility: ScheduleVisibility;
  created_by: number;
  creator?: User;
  department_id?: number;
  start_date: string;  // ISO date
  end_date: string;    // ISO date
  morning_start: string;  // "10:00"
  morning_end: string;    // "14:00"
  evening_start: string;  // "14:00"
  evening_end: string;    // "18:00"
  color: string;          // "#4CAF50"
  is_active: boolean;
  imported_from?: string;
  entries_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEntry {
  id: number;
  schedule_id: number;
  schedule?: Schedule;
  user_id: number;
  user?: User;
  date: string;           // ISO date
  shift_type: ShiftType;
  start_time: string;     // ISO datetime
  end_time: string;       // ISO datetime
  title?: string;
  description?: string;
  location?: string;
  event_id?: number;      // Linked calendar event
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
  creator?: User;
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
  user_id?: number;      // null = для всех
  user?: User;
  day_of_week: number;   // 0-6 (Sunday-Saturday)
  start_time: string;    // "10:00"
  end_time: string;      // "18:00"
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
  start_date: string;
  end_date: string;
  morning_start?: string;
  morning_end?: string;
  evening_start?: string;
  evening_end?: string;
  color?: string;
  department_id?: number;
}

export interface UpdateScheduleRequest {
  title?: string;
  description?: string;
  type?: ScheduleType;
  visibility?: ScheduleVisibility;
  start_date?: string;
  end_date?: string;
  morning_start?: string;
  morning_end?: string;
  evening_start?: string;
  evening_end?: string;
  color?: string;
  is_active?: boolean;
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
  preview?: boolean;
}

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

export interface ScheduleViewMode {
  mode: 'week' | 'month' | 'list';
}

// ============================================
// USER (simplified, import from types/)
// ============================================

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
  position?: string;
}
```

---

## 2. API Layer

### `src/features/schedules/api/schedule.api.ts`

```typescript
import api from '@shared/api/axios.config';
import { API_ENDPOINTS } from '@shared/constants/api.constants';
import type {
  Schedule,
  ScheduleEntry,
  ScheduleTemplate,
  ScheduleListResponse,
  ScheduleEntriesResponse,
  TemplateListResponse,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  CreateScheduleEntryRequest,
  CreateBatchEntriesRequest,
  UpdateScheduleEntryRequest,
  CreateTemplateRequest,
  CreateTemplateEntryRequest,
  ApplyTemplateRequest,
  ApplyTemplateResponse,
  ImportScheduleRequest,
  ImportPreviewResponse,
  ImportResultResponse,
  ScheduleFilters,
  ScheduleEntryFilters,
} from '../types/schedule.types';

// Добавить в shared/constants/api.constants.ts:
// SCHEDULE: {
//   LIST: '/schedules',
//   DETAIL: (id: number) => `/schedules/${id}`,
//   ENTRIES: (id: number) => `/schedules/${id}/entries`,
//   ENTRY: (scheduleId: number, entryId: number) => `/schedules/${scheduleId}/entries/${entryId}`,
//   MY_ENTRIES: '/schedules/my-entries',
//   IMPORT: '/schedules/import',
//   IMPORT_FORMATS: '/schedules/import/formats',
// },
// SCHEDULE_TEMPLATE: {
//   LIST: '/schedule-templates',
//   DETAIL: (id: number) => `/schedule-templates/${id}`,
//   ENTRIES: (id: number) => `/schedule-templates/${id}/entries`,
//   ENTRY: (templateId: number, entryId: number) => `/schedule-templates/${templateId}/entries/${entryId}`,
//   APPLY: (id: number) => `/schedule-templates/${id}/apply`,
// },

const SCHEDULE_ENDPOINTS = {
  LIST: '/schedules',
  DETAIL: (id: number) => `/schedules/${id}`,
  ENTRIES: (id: number) => `/schedules/${id}/entries`,
  ENTRY: (scheduleId: number, entryId: number) => `/schedules/${scheduleId}/entries/${entryId}`,
  MY_ENTRIES: '/schedules/my-entries',
  IMPORT: '/schedules/import',
  IMPORT_FORMATS: '/schedules/import/formats',
};

const TEMPLATE_ENDPOINTS = {
  LIST: '/schedule-templates',
  DETAIL: (id: number) => `/schedule-templates/${id}`,
  ENTRIES: (id: number) => `/schedule-templates/${id}/entries`,
  ENTRY: (templateId: number, entryId: number) => `/schedule-templates/${templateId}/entries/${entryId}`,
  APPLY: (id: number, scheduleId: number) => `/schedule-templates/${id}/apply?schedule_id=${scheduleId}`,
};

// ============================================
// SCHEDULES
// ============================================

export const scheduleApi = {
  // Get list of schedules
  getSchedules: async (
    filters?: ScheduleFilters,
    pagination?: { limit?: number; offset?: number }
  ): Promise<ScheduleListResponse> => {
    const params = {
      ...filters,
      limit: pagination?.limit || 20,
      offset: pagination?.offset || 0,
    };

    const response = await api.get<{ schedules: Schedule[]; total: number; limit: number; offset: number }>(
      SCHEDULE_ENDPOINTS.LIST,
      { params }
    );

    return response.data;
  },

  // Get schedule by ID
  getScheduleById: async (id: number): Promise<Schedule> => {
    const response = await api.get<{ schedule: Schedule }>(
      SCHEDULE_ENDPOINTS.DETAIL(id)
    );
    return response.data.schedule;
  },

  // Create schedule
  createSchedule: async (data: CreateScheduleRequest): Promise<Schedule> => {
    const response = await api.post<{ schedule: Schedule }>(
      SCHEDULE_ENDPOINTS.LIST,
      data
    );
    return response.data.schedule;
  },

  // Update schedule
  updateSchedule: async (id: number, data: UpdateScheduleRequest): Promise<Schedule> => {
    const response = await api.put<{ schedule: Schedule }>(
      SCHEDULE_ENDPOINTS.DETAIL(id),
      data
    );
    return response.data.schedule;
  },

  // Delete schedule
  deleteSchedule: async (id: number): Promise<void> => {
    await api.delete(SCHEDULE_ENDPOINTS.DETAIL(id));
  },

  // ============================================
  // SCHEDULE ENTRIES
  // ============================================

  // Get schedule entries
  getScheduleEntries: async (
    scheduleId: number,
    filters?: ScheduleEntryFilters,
    pagination?: { limit?: number; offset?: number }
  ): Promise<ScheduleEntriesResponse> => {
    const params = {
      ...filters,
      limit: pagination?.limit || 100,
      offset: pagination?.offset || 0,
    };

    const response = await api.get<ScheduleEntriesResponse>(
      SCHEDULE_ENDPOINTS.ENTRIES(scheduleId),
      { params }
    );

    return response.data;
  },

  // Get my schedule entries
  getMyScheduleEntries: async (
    filters?: { start_date?: string; end_date?: string },
    pagination?: { limit?: number; offset?: number }
  ): Promise<ScheduleEntriesResponse> => {
    const params = {
      ...filters,
      limit: pagination?.limit || 100,
      offset: pagination?.offset || 0,
    };

    const response = await api.get<ScheduleEntriesResponse>(
      SCHEDULE_ENDPOINTS.MY_ENTRIES,
      { params }
    );

    return response.data;
  },

  // Create single entry
  createScheduleEntry: async (
    scheduleId: number,
    data: CreateScheduleEntryRequest
  ): Promise<ScheduleEntry> => {
    const response = await api.post<{ entry: ScheduleEntry }>(
      SCHEDULE_ENDPOINTS.ENTRIES(scheduleId),
      data
    );
    return response.data.entry;
  },

  // Create batch entries
  createBatchEntries: async (
    scheduleId: number,
    data: CreateBatchEntriesRequest
  ): Promise<ScheduleEntry[]> => {
    const response = await api.post<{ entries: ScheduleEntry[] }>(
      SCHEDULE_ENDPOINTS.ENTRIES(scheduleId),
      data
    );
    return response.data.entries;
  },

  // Update entry
  updateScheduleEntry: async (
    scheduleId: number,
    entryId: number,
    data: UpdateScheduleEntryRequest
  ): Promise<ScheduleEntry> => {
    const response = await api.put<{ entry: ScheduleEntry }>(
      SCHEDULE_ENDPOINTS.ENTRY(scheduleId, entryId),
      data
    );
    return response.data.entry;
  },

  // Delete entry
  deleteScheduleEntry: async (scheduleId: number, entryId: number): Promise<void> => {
    await api.delete(SCHEDULE_ENDPOINTS.ENTRY(scheduleId, entryId));
  },

  // ============================================
  // IMPORT
  // ============================================

  // Preview import
  previewImport: async (data: ImportScheduleRequest): Promise<ImportPreviewResponse> => {
    const response = await api.post<{ preview: ImportPreviewResponse }>(
      SCHEDULE_ENDPOINTS.IMPORT,
      { ...data, preview: true }
    );
    return response.data.preview;
  },

  // Execute import
  importSchedule: async (data: ImportScheduleRequest): Promise<ImportResultResponse> => {
    const response = await api.post<{ result: ImportResultResponse }>(
      SCHEDULE_ENDPOINTS.IMPORT,
      { ...data, preview: false }
    );
    return response.data.result;
  },

  // Get supported formats
  getSupportedFormats: async (): Promise<{ formats: any[]; file_types: string[] }> => {
    const response = await api.get(SCHEDULE_ENDPOINTS.IMPORT_FORMATS);
    return response.data;
  },
};

// ============================================
// TEMPLATES
// ============================================

export const templateApi = {
  // Get templates list
  getTemplates: async (
    filters?: { type?: string; is_active?: boolean },
    pagination?: { limit?: number; offset?: number }
  ): Promise<TemplateListResponse> => {
    const params = {
      ...filters,
      limit: pagination?.limit || 20,
      offset: pagination?.offset || 0,
    };

    const response = await api.get<TemplateListResponse>(
      TEMPLATE_ENDPOINTS.LIST,
      { params }
    );

    return response.data;
  },

  // Get template by ID
  getTemplateById: async (id: number): Promise<ScheduleTemplate> => {
    const response = await api.get<{ template: ScheduleTemplate }>(
      TEMPLATE_ENDPOINTS.DETAIL(id)
    );
    return response.data.template;
  },

  // Create template
  createTemplate: async (data: CreateTemplateRequest): Promise<ScheduleTemplate> => {
    const response = await api.post<{ template: ScheduleTemplate }>(
      TEMPLATE_ENDPOINTS.LIST,
      data
    );
    return response.data.template;
  },

  // Update template
  updateTemplate: async (id: number, data: Partial<CreateTemplateRequest>): Promise<ScheduleTemplate> => {
    const response = await api.put<{ template: ScheduleTemplate }>(
      TEMPLATE_ENDPOINTS.DETAIL(id),
      data
    );
    return response.data.template;
  },

  // Delete template
  deleteTemplate: async (id: number): Promise<void> => {
    await api.delete(TEMPLATE_ENDPOINTS.DETAIL(id));
  },

  // Add entry to template
  addTemplateEntry: async (
    templateId: number,
    data: CreateTemplateEntryRequest
  ): Promise<ScheduleTemplate> => {
    const response = await api.post<{ template: ScheduleTemplate }>(
      TEMPLATE_ENDPOINTS.ENTRIES(templateId),
      data
    );
    return response.data.template;
  },

  // Delete template entry
  deleteTemplateEntry: async (templateId: number, entryId: number): Promise<void> => {
    await api.delete(TEMPLATE_ENDPOINTS.ENTRY(templateId, entryId));
  },

  // Apply template to schedule
  applyTemplate: async (
    templateId: number,
    scheduleId: number,
    data: ApplyTemplateRequest
  ): Promise<ApplyTemplateResponse> => {
    const response = await api.post<ApplyTemplateResponse>(
      TEMPLATE_ENDPOINTS.APPLY(templateId, scheduleId),
      data
    );
    return response.data;
  },
};
```

---

## 3. Zustand Store

### `src/features/schedules/store/scheduleStore.ts`

```typescript
import { create } from 'zustand';
import { scheduleApi, templateApi } from '../api/schedule.api';
import type {
  Schedule,
  ScheduleEntry,
  ScheduleTemplate,
  ScheduleFilters,
  ScheduleEntryFilters,
  CreateScheduleRequest,
  CreateScheduleEntryRequest,
} from '../types/schedule.types';

interface ScheduleState {
  // Data
  schedules: Schedule[];
  currentSchedule: Schedule | null;
  entries: ScheduleEntry[];
  myEntries: ScheduleEntry[];
  templates: ScheduleTemplate[];

  // Loading states
  isLoading: boolean;
  isLoadingEntries: boolean;
  isLoadingMyEntries: boolean;
  isSubmitting: boolean;

  // Pagination
  total: number;
  hasMore: boolean;

  // Filters
  filters: ScheduleFilters;
  entryFilters: ScheduleEntryFilters;

  // Error
  error: string | null;

  // Actions - Schedules
  loadSchedules: (filters?: ScheduleFilters, reset?: boolean) => Promise<void>;
  loadScheduleById: (id: number) => Promise<Schedule>;
  createSchedule: (data: CreateScheduleRequest) => Promise<Schedule>;
  updateSchedule: (id: number, data: Partial<CreateScheduleRequest>) => Promise<void>;
  deleteSchedule: (id: number) => Promise<void>;

  // Actions - Entries
  loadScheduleEntries: (scheduleId: number, filters?: ScheduleEntryFilters) => Promise<void>;
  loadMyEntries: (startDate?: string, endDate?: string) => Promise<void>;
  createEntry: (scheduleId: number, data: CreateScheduleEntryRequest) => Promise<ScheduleEntry>;
  updateEntry: (scheduleId: number, entryId: number, data: Partial<CreateScheduleEntryRequest>) => Promise<void>;
  deleteEntry: (scheduleId: number, entryId: number) => Promise<void>;

  // Actions - Templates
  loadTemplates: () => Promise<void>;
  applyTemplate: (templateId: number, scheduleId: number, startDate: string, endDate: string, userIds?: number[]) => Promise<number>;

  // Utility
  setFilters: (filters: ScheduleFilters) => void;
  setEntryFilters: (filters: ScheduleEntryFilters) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  schedules: [],
  currentSchedule: null,
  entries: [],
  myEntries: [],
  templates: [],
  isLoading: false,
  isLoadingEntries: false,
  isLoadingMyEntries: false,
  isSubmitting: false,
  total: 0,
  hasMore: true,
  filters: {},
  entryFilters: {},
  error: null,
};

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  ...initialState,

  // ============================================
  // SCHEDULES
  // ============================================

  loadSchedules: async (filters, reset = false) => {
    const state = get();
    const offset = reset ? 0 : state.schedules.length;

    set({ isLoading: true, error: null });

    try {
      const mergedFilters = { ...state.filters, ...filters };
      const response = await scheduleApi.getSchedules(mergedFilters, { offset, limit: 20 });

      set({
        schedules: reset ? response.schedules : [...state.schedules, ...response.schedules],
        total: response.total,
        hasMore: response.schedules.length === 20,
        filters: mergedFilters,
      });
    } catch (error: any) {
      set({ error: error.message || 'Не удалось загрузить графики' });
    } finally {
      set({ isLoading: false });
    }
  },

  loadScheduleById: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const schedule = await scheduleApi.getScheduleById(id);
      set({ currentSchedule: schedule });
      return schedule;
    } catch (error: any) {
      set({ error: error.message || 'Не удалось загрузить график' });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createSchedule: async (data) => {
    set({ isSubmitting: true, error: null });

    try {
      const schedule = await scheduleApi.createSchedule(data);
      set((state) => ({
        schedules: [schedule, ...state.schedules],
        total: state.total + 1,
      }));
      return schedule;
    } catch (error: any) {
      set({ error: error.message || 'Не удалось создать график' });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateSchedule: async (id, data) => {
    set({ isSubmitting: true, error: null });

    try {
      const updated = await scheduleApi.updateSchedule(id, data);
      set((state) => ({
        schedules: state.schedules.map((s) => (s.id === id ? updated : s)),
        currentSchedule: state.currentSchedule?.id === id ? updated : state.currentSchedule,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Не удалось обновить график' });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteSchedule: async (id) => {
    set({ isSubmitting: true, error: null });

    try {
      await scheduleApi.deleteSchedule(id);
      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== id),
        total: state.total - 1,
        currentSchedule: state.currentSchedule?.id === id ? null : state.currentSchedule,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Не удалось удалить график' });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  // ============================================
  // ENTRIES
  // ============================================

  loadScheduleEntries: async (scheduleId, filters) => {
    set({ isLoadingEntries: true, error: null });

    try {
      const mergedFilters = { ...get().entryFilters, ...filters };
      const response = await scheduleApi.getScheduleEntries(scheduleId, mergedFilters);

      set({
        entries: response.entries,
        entryFilters: mergedFilters,
      });
    } catch (error: any) {
      set({ error: error.message || 'Не удалось загрузить записи' });
    } finally {
      set({ isLoadingEntries: false });
    }
  },

  loadMyEntries: async (startDate, endDate) => {
    set({ isLoadingMyEntries: true, error: null });

    try {
      const response = await scheduleApi.getMyScheduleEntries({
        start_date: startDate,
        end_date: endDate,
      });

      set({ myEntries: response.entries });
    } catch (error: any) {
      set({ error: error.message || 'Не удалось загрузить мои записи' });
    } finally {
      set({ isLoadingMyEntries: false });
    }
  },

  createEntry: async (scheduleId, data) => {
    set({ isSubmitting: true, error: null });

    try {
      const entry = await scheduleApi.createScheduleEntry(scheduleId, data);
      set((state) => ({
        entries: [...state.entries, entry].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
      }));
      return entry;
    } catch (error: any) {
      set({ error: error.message || 'Не удалось создать запись' });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateEntry: async (scheduleId, entryId, data) => {
    set({ isSubmitting: true, error: null });

    try {
      const updated = await scheduleApi.updateScheduleEntry(scheduleId, entryId, data);
      set((state) => ({
        entries: state.entries.map((e) => (e.id === entryId ? updated : e)),
        myEntries: state.myEntries.map((e) => (e.id === entryId ? updated : e)),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Не удалось обновить запись' });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteEntry: async (scheduleId, entryId) => {
    set({ isSubmitting: true, error: null });

    try {
      await scheduleApi.deleteScheduleEntry(scheduleId, entryId);
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== entryId),
        myEntries: state.myEntries.filter((e) => e.id !== entryId),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Не удалось удалить запись' });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  // ============================================
  // TEMPLATES
  // ============================================

  loadTemplates: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await templateApi.getTemplates({ is_active: true });
      set({ templates: response.templates });
    } catch (error: any) {
      set({ error: error.message || 'Не удалось загрузить шаблоны' });
    } finally {
      set({ isLoading: false });
    }
  },

  applyTemplate: async (templateId, scheduleId, startDate, endDate, userIds) => {
    set({ isSubmitting: true, error: null });

    try {
      const result = await templateApi.applyTemplate(templateId, scheduleId, {
        start_date: startDate,
        end_date: endDate,
        user_ids: userIds,
      });

      // Reload entries after applying template
      await get().loadScheduleEntries(scheduleId);

      return result.entries_created;
    } catch (error: any) {
      set({ error: error.message || 'Не удалось применить шаблон' });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  // ============================================
  // UTILITY
  // ============================================

  setFilters: (filters) => set({ filters }),
  setEntryFilters: (filters) => set({ entryFilters: filters }),
  clearError: () => set({ error: null }),
  reset: () => set(initialState),
}));
```

---

## 4. Custom Hooks

### `src/features/schedules/hooks/useSchedules.ts`

```typescript
import { useCallback, useEffect } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import type { ScheduleFilters } from '../types/schedule.types';

export const useSchedules = (initialFilters?: ScheduleFilters) => {
  const {
    schedules,
    isLoading,
    error,
    hasMore,
    total,
    filters,
    loadSchedules,
    setFilters,
    clearError,
  } = useScheduleStore();

  // Initial load
  useEffect(() => {
    loadSchedules(initialFilters, true);
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    loadSchedules(filters, true);
  }, [filters, loadSchedules]);

  // Load more (pagination)
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadSchedules(filters, false);
    }
  }, [isLoading, hasMore, filters, loadSchedules]);

  // Update filters and reload
  const updateFilters = useCallback((newFilters: ScheduleFilters) => {
    setFilters(newFilters);
    loadSchedules(newFilters, true);
  }, [setFilters, loadSchedules]);

  return {
    schedules,
    isLoading,
    error,
    hasMore,
    total,
    filters,
    refresh,
    loadMore,
    updateFilters,
    clearError,
  };
};
```

### `src/features/schedules/hooks/useMyScheduleEntries.ts`

```typescript
import { useCallback, useEffect, useMemo } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

type ViewMode = 'week' | 'month';

export const useMyScheduleEntries = (viewMode: ViewMode = 'week', baseDate: Date = new Date()) => {
  const {
    myEntries,
    isLoadingMyEntries,
    error,
    loadMyEntries,
    clearError,
  } = useScheduleStore();

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(baseDate, { weekStartsOn: 1 }),
        end: endOfWeek(baseDate, { weekStartsOn: 1 }),
      };
    }
    return {
      start: startOfMonth(baseDate),
      end: endOfMonth(baseDate),
    };
  }, [viewMode, baseDate]);

  // Load entries when date range changes
  useEffect(() => {
    loadMyEntries(
      format(dateRange.start, 'yyyy-MM-dd'),
      format(dateRange.end, 'yyyy-MM-dd')
    );
  }, [dateRange, loadMyEntries]);

  // Refresh
  const refresh = useCallback(() => {
    loadMyEntries(
      format(dateRange.start, 'yyyy-MM-dd'),
      format(dateRange.end, 'yyyy-MM-dd')
    );
  }, [dateRange, loadMyEntries]);

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, typeof myEntries> = {};

    myEntries.forEach((entry) => {
      const dateKey = format(new Date(entry.date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });

    return grouped;
  }, [myEntries]);

  return {
    entries: myEntries,
    entriesByDate,
    isLoading: isLoadingMyEntries,
    error,
    dateRange,
    refresh,
    clearError,
  };
};
```

### `src/features/schedules/hooks/useScheduleDetails.ts`

```typescript
import { useCallback, useEffect } from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import type { ScheduleEntryFilters } from '../types/schedule.types';

export const useScheduleDetails = (scheduleId: number) => {
  const {
    currentSchedule,
    entries,
    isLoading,
    isLoadingEntries,
    error,
    loadScheduleById,
    loadScheduleEntries,
    clearError,
  } = useScheduleStore();

  // Load schedule and entries
  useEffect(() => {
    loadScheduleById(scheduleId);
    loadScheduleEntries(scheduleId);
  }, [scheduleId]);

  // Refresh
  const refresh = useCallback(() => {
    loadScheduleById(scheduleId);
    loadScheduleEntries(scheduleId);
  }, [scheduleId, loadScheduleById, loadScheduleEntries]);

  // Filter entries
  const filterEntries = useCallback((filters: ScheduleEntryFilters) => {
    loadScheduleEntries(scheduleId, filters);
  }, [scheduleId, loadScheduleEntries]);

  return {
    schedule: currentSchedule,
    entries,
    isLoading,
    isLoadingEntries,
    error,
    refresh,
    filterEntries,
    clearError,
  };
};
```

---

## 5. Utility Functions

### `src/features/schedules/utils/scheduleHelpers.ts`

```typescript
import { format, parseISO, isToday, isSameDay, addDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ScheduleEntry, ShiftType, ScheduleCalendarDay } from '../types/schedule.types';

/**
 * Format date for display
 */
export const formatScheduleDate = (date: string | Date, formatStr: string = 'dd MMMM yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: ru });
};

/**
 * Format time range
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  const start = format(parseISO(startTime), 'HH:mm');
  const end = format(parseISO(endTime), 'HH:mm');
  return `${start} — ${end}`;
};

/**
 * Get shift duration in hours
 */
export const getShiftDuration = (startTime: string, endTime: string): number => {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

/**
 * Check if entry is for today
 */
export const isEntryToday = (entry: ScheduleEntry): boolean => {
  return isToday(parseISO(entry.date));
};

/**
 * Get entries for specific date
 */
export const getEntriesForDate = (entries: ScheduleEntry[], date: Date): ScheduleEntry[] => {
  return entries.filter((entry) => isSameDay(parseISO(entry.date), date));
};

/**
 * Generate week days array
 */
export const getWeekDays = (baseDate: Date = new Date()): Date[] => {
  const start = startOfWeek(baseDate, { weekStartsOn: 1 });
  return eachDayOfInterval({
    start,
    end: addDays(start, 6),
  });
};

/**
 * Generate calendar days for month view
 */
export const getCalendarDays = (
  year: number,
  month: number,
  entries: ScheduleEntry[]
): ScheduleCalendarDay[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = startOfWeek(firstDay, { weekStartsOn: 1 });
  const endDate = addDays(startOfWeek(addDays(lastDay, 6), { weekStartsOn: 1 }), 6);

  const days: ScheduleCalendarDay[] = [];
  let current = startDate;

  while (current <= endDate) {
    days.push({
      date: current,
      isCurrentMonth: current.getMonth() === month,
      isToday: isToday(current),
      entries: getEntriesForDate(entries, current),
    });
    current = addDays(current, 1);
  }

  return days;
};

/**
 * Get day of week label (short)
 */
export const getDayLabel = (date: Date): string => {
  return format(date, 'EEEEEE', { locale: ru }).toUpperCase();
};

/**
 * Get day of week label (full)
 */
export const getDayLabelFull = (date: Date): string => {
  return format(date, 'EEEE', { locale: ru });
};

/**
 * Get month label
 */
export const getMonthLabel = (date: Date): string => {
  return format(date, 'LLLL yyyy', { locale: ru });
};

/**
 * Parse time string "HH:mm" to Date
 */
export const parseTimeString = (timeStr: string, baseDate: Date = new Date()): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

/**
 * Calculate total hours for entries
 */
export const calculateTotalHours = (entries: ScheduleEntry[]): number => {
  return entries.reduce((total, entry) => {
    return total + getShiftDuration(entry.start_time, entry.end_time);
  }, 0);
};

/**
 * Group entries by user
 */
export const groupEntriesByUser = (entries: ScheduleEntry[]): Map<number, ScheduleEntry[]> => {
  const grouped = new Map<number, ScheduleEntry[]>();

  entries.forEach((entry) => {
    const existing = grouped.get(entry.user_id) || [];
    grouped.set(entry.user_id, [...existing, entry]);
  });

  return grouped;
};
```

### `src/features/schedules/utils/shiftColors.ts`

```typescript
import type { ShiftType } from '../types/schedule.types';

export const SHIFT_COLORS: Record<ShiftType, { background: string; text: string; border: string }> = {
  morning: {
    background: '#FEF3C7',  // amber-100
    text: '#D97706',        // amber-600
    border: '#FCD34D',      // amber-300
  },
  evening: {
    background: '#DBEAFE',  // blue-100
    text: '#2563EB',        // blue-600
    border: '#93C5FD',      // blue-300
  },
  full_day: {
    background: '#D1FAE5',  // green-100
    text: '#059669',        // green-600
    border: '#6EE7B7',      // green-300
  },
  custom: {
    background: '#F3E8FF',  // purple-100
    text: '#7C3AED',        // purple-600
    border: '#C4B5FD',      // purple-300
  },
};

export const getShiftColor = (shiftType: ShiftType) => {
  return SHIFT_COLORS[shiftType] || SHIFT_COLORS.custom;
};

export const SCHEDULE_TYPE_COLORS: Record<string, string> = {
  work: '#4CAF50',
  paid_services: '#2196F3',
  on_duty: '#FF9800',
  shift: '#9C27B0',
  custom: '#607D8B',
};
```

---

## 6. Компоненты

### `src/features/schedules/components/ShiftTypeBadge.tsx`

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SHIFT_TYPE_LABELS, type ShiftType } from '../types/schedule.types';
import { getShiftColor } from '../utils/shiftColors';

interface ShiftTypeBadgeProps {
  shiftType: ShiftType;
  size?: 'small' | 'medium';
}

export const ShiftTypeBadge: React.FC<ShiftTypeBadgeProps> = ({
  shiftType,
  size = 'medium',
}) => {
  const colors = getShiftColor(shiftType);
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: isSmall ? 10 : 12,
          },
        ]}
      >
        {SHIFT_TYPE_LABELS[shiftType]}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    fontWeight: '600',
  },
});
```

### `src/features/schedules/components/ScheduleEntryRow.tsx`

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ShiftTypeBadge } from './ShiftTypeBadge';
import { formatTimeRange, formatScheduleDate } from '../utils/scheduleHelpers';
import type { ScheduleEntry } from '../types/schedule.types';

interface ScheduleEntryRowProps {
  entry: ScheduleEntry;
  showDate?: boolean;
  showUser?: boolean;
  onPress?: () => void;
}

export const ScheduleEntryRow: React.FC<ScheduleEntryRowProps> = ({
  entry,
  showDate = false,
  showUser = false,
  onPress,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.leftSection}>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.timeText, { color: theme.text }]}>
            {formatTimeRange(entry.start_time, entry.end_time)}
          </Text>
        </View>

        {showDate && (
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {formatScheduleDate(entry.date, 'dd MMM')}
          </Text>
        )}

        {showUser && entry.user && (
          <Text style={[styles.userName, { color: theme.textSecondary }]}>
            {entry.user.name}
          </Text>
        )}

        {entry.title && (
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {entry.title}
          </Text>
        )}

        {entry.location && (
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.locationText, { color: theme.textSecondary }]} numberOfLines={1}>
              {entry.location}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rightSection}>
        <ShiftTypeBadge shiftType={entry.shift_type} size="small" />

        {entry.is_confirmed && (
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={theme.success}
            style={styles.confirmedIcon}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    marginTop: 2,
  },
  userName: {
    fontSize: 13,
    marginTop: 2,
  },
  title: {
    fontSize: 13,
    marginTop: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
  },
  confirmedIcon: {
    marginTop: 4,
  },
});
```

### `src/features/schedules/components/ScheduleWeekView.tsx`

```typescript
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { ScheduleEntryRow } from './ScheduleEntryRow';
import {
  getWeekDays,
  getEntriesForDate,
  getDayLabel,
  formatScheduleDate,
  isToday,
} from '../utils/scheduleHelpers';
import type { ScheduleEntry } from '../types/schedule.types';

interface ScheduleWeekViewProps {
  entries: ScheduleEntry[];
  baseDate?: Date;
  onEntryPress?: (entry: ScheduleEntry) => void;
}

export const ScheduleWeekView: React.FC<ScheduleWeekViewProps> = ({
  entries,
  baseDate = new Date(),
  onEntryPress,
}) => {
  const { theme } = useTheme();

  const weekDays = useMemo(() => getWeekDays(baseDate), [baseDate]);

  const renderDay = (date: Date) => {
    const dayEntries = getEntriesForDate(entries, date);
    const isTodayDate = isToday(date);

    return (
      <View
        key={date.toISOString()}
        style={[
          styles.dayContainer,
          isTodayDate && { backgroundColor: theme.primaryLight + '20' },
        ]}
      >
        <View style={styles.dayHeader}>
          <Text
            style={[
              styles.dayLabel,
              { color: isTodayDate ? theme.primary : theme.textSecondary },
            ]}
          >
            {getDayLabel(date)}
          </Text>
          <Text
            style={[
              styles.dayNumber,
              { color: isTodayDate ? theme.primary : theme.text },
            ]}
          >
            {date.getDate()}
          </Text>
          {isTodayDate && (
            <View style={[styles.todayBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.todayText}>Сегодня</Text>
            </View>
          )}
        </View>

        <View style={styles.entriesContainer}>
          {dayEntries.length > 0 ? (
            dayEntries.map((entry) => (
              <ScheduleEntryRow
                key={entry.id}
                entry={entry}
                onPress={onEntryPress ? () => onEntryPress(entry) : undefined}
              />
            ))
          ) : (
            <Text style={[styles.noEntriesText, { color: theme.textSecondary }]}>
              Нет записей
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
      {weekDays.map(renderDay)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  todayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  entriesContainer: {
    gap: 8,
  },
  noEntriesText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
```

---

## 7. Screens

### `src/features/schedules/screens/MyScheduleScreen.tsx`

```typescript
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { addWeeks, subWeeks, format } from 'date-fns';
import { ru } from 'date-fns/locale';

import { useTheme } from '@shared/hooks/useTheme';
import { useMyScheduleEntries } from '../hooks/useMyScheduleEntries';
import { ScheduleWeekView } from '../components/ScheduleWeekView';
import { calculateTotalHours } from '../utils/scheduleHelpers';
import type { ScheduleEntry } from '../types/schedule.types';

export const MyScheduleScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [currentDate, setCurrentDate] = useState(new Date());

  const { entries, isLoading, refresh, dateRange } = useMyScheduleEntries('week', currentDate);

  const totalHours = calculateTotalHours(entries);

  const goToPreviousWeek = useCallback(() => {
    setCurrentDate((prev) => subWeeks(prev, 1));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentDate((prev) => addWeeks(prev, 1));
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleEntryPress = useCallback((entry: ScheduleEntry) => {
    // Navigate to entry details or show modal
    console.log('Entry pressed:', entry);
  }, []);

  const weekLabel = `${format(dateRange.start, 'd MMM', { locale: ru })} — ${format(dateRange.end, 'd MMM', { locale: ru })}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Моё расписание</Text>

        <TouchableOpacity
          style={[styles.todayButton, { borderColor: theme.primary }]}
          onPress={goToToday}
        >
          <Text style={[styles.todayButtonText, { color: theme.primary }]}>
            Сегодня
          </Text>
        </TouchableOpacity>
      </View>

      {/* Week Navigation */}
      <View style={[styles.weekNavigation, { backgroundColor: theme.backgroundSecondary }]}>
        <TouchableOpacity onPress={goToPreviousWeek} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.weekLabel, { color: theme.text }]}>{weekLabel}</Text>

        <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={[styles.summaryContainer, { backgroundColor: theme.backgroundSecondary }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>
            {entries.length}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
            смен
          </Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: theme.primary }]}>
            {totalHours}
          </Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
            часов
          </Text>
        </View>
      </View>

      {/* Week View */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={theme.primary}
          />
        }
      >
        <ScheduleWeekView
          entries={entries}
          baseDate={currentDate}
          onEntryPress={handleEntryPress}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    padding: 8,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  summaryItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
  },
  content: {
    flex: 1,
  },
});
```

---

## 8. Navigation Integration

### Добавить в `src/navigation/types.ts`:

```typescript
export type ScheduleStackParamList = {
  ScheduleList: undefined;
  ScheduleDetail: { scheduleId: number };
  ScheduleCalendar: { scheduleId: number };
  MySchedule: undefined;
  ScheduleTemplates: undefined;
};
```

### Создать `src/features/schedules/navigation/ScheduleNavigator.tsx`:

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ScheduleListScreen } from '../screens/ScheduleListScreen';
import { ScheduleDetailScreen } from '../screens/ScheduleDetailScreen';
import { MyScheduleScreen } from '../screens/MyScheduleScreen';
import { ScheduleTemplatesScreen } from '../screens/ScheduleTemplatesScreen';

import type { ScheduleStackParamList } from '@navigation/types';

const Stack = createNativeStackNavigator<ScheduleStackParamList>();

export const ScheduleNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ScheduleList" component={ScheduleListScreen} />
      <Stack.Screen name="ScheduleDetail" component={ScheduleDetailScreen} />
      <Stack.Screen name="MySchedule" component={MyScheduleScreen} />
      <Stack.Screen name="ScheduleTemplates" component={ScheduleTemplatesScreen} />
    </Stack.Navigator>
  );
};
```

---

## 9. Миграция из Dashboard

### Шаги:

1. **Удалить** `src/features/dashboard/screens/ScheduleScreen.tsx`

2. **Обновить** навигацию в Dashboard для перехода на новый модуль:

```typescript
// В DashboardScreen.tsx
import { useNavigation } from '@react-navigation/native';

const handleSchedulePress = () => {
  navigation.navigate('Schedules', { screen: 'MySchedule' });
};
```

3. **Обновить** Bottom Tab Navigator:

```typescript
// В MainTabNavigator.tsx
import { ScheduleNavigator } from '@features/schedules/navigation/ScheduleNavigator';

<Tab.Screen
  name="Schedules"
  component={ScheduleNavigator}
  options={{
    tabBarLabel: 'Расписание',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="calendar-outline" size={size} color={color} />
    ),
  }}
/>
```

---

## 10. API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/schedules` | Список графиков |
| GET | `/schedules/:id` | Детали графика |
| POST | `/schedules` | Создать график |
| PUT | `/schedules/:id` | Обновить график |
| DELETE | `/schedules/:id` | Удалить график |
| GET | `/schedules/:id/entries` | Записи графика |
| POST | `/schedules/:id/entries` | Создать запись |
| PUT | `/schedules/:id/entries/:entry_id` | Обновить запись |
| DELETE | `/schedules/:id/entries/:entry_id` | Удалить запись |
| GET | `/schedules/my-entries` | Мои записи |
| POST | `/schedules/import` | Импорт из Word |
| GET | `/schedules/import/formats` | Форматы импорта |
| GET | `/schedule-templates` | Список шаблонов |
| GET | `/schedule-templates/:id` | Детали шаблона |
| POST | `/schedule-templates` | Создать шаблон |
| PUT | `/schedule-templates/:id` | Обновить шаблон |
| DELETE | `/schedule-templates/:id` | Удалить шаблон |
| POST | `/schedule-templates/:id/entries` | Добавить запись в шаблон |
| DELETE | `/schedule-templates/:id/entries/:entry_id` | Удалить запись шаблона |
| POST | `/schedule-templates/:id/apply` | Применить шаблон |

---

## 11. Дополнительные зависимости

```bash
npm install date-fns
# date-fns уже должен быть установлен
```

---

## 12. Checklist реализации

- [ ] Создать структуру папок `src/features/schedules/`
- [ ] Реализовать типы в `types/schedule.types.ts`
- [ ] Реализовать API в `api/schedule.api.ts`
- [ ] Реализовать store в `store/scheduleStore.ts`
- [ ] Реализовать hooks
- [ ] Реализовать утилиты
- [ ] Реализовать компоненты
- [ ] Реализовать экраны
- [ ] Настроить навигацию
- [ ] Удалить старый `ScheduleScreen` из dashboard
- [ ] Обновить Bottom Tab Navigator
- [ ] Добавить API endpoints в constants
- [ ] Протестировать все функции

---

## Заключение

Этот документ описывает полную реализацию модуля графиков работы для React Native приложения в стиле существующего кодбейза TaxionReact. Модуль использует:

- **Zustand** для управления состоянием
- **Axios** для API вызовов с session-based auth
- **date-fns** для работы с датами
- **React Native StyleSheet** с темизацией
- **Feature-based architecture** с разделением на api/components/hooks/screens/store/types/utils

Реализация полностью совместима с backend API, описанным в `WORK_SCHEDULES_API_EXAMPLES.md`.
