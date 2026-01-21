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
  UpdateScheduleRequest,
  UpdateScheduleEntryRequest,
} from '../types/schedule.types';
import type { ApiError } from '@/types/common.types';

/**
 * Extract error message from API error
 * Prefers details field which contains specific error reason from backend
 */
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!error) return fallback;

  // Check if it's an ApiError with details
  const apiError = error as ApiError;
  if (apiError.details) {
    // Details can be a string or an object with error/details fields
    if (typeof apiError.details === 'string') {
      return apiError.details;
    }
    if (typeof apiError.details === 'object') {
      const details = apiError.details as Record<string, unknown>;
      if (typeof details.details === 'string') {
        return details.details;
      }
      if (typeof details.error === 'string') {
        return details.error;
      }
    }
  }

  // Fallback to message
  if (apiError.message) {
    return apiError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

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
  updateSchedule: (
    id: number,
    data: UpdateScheduleRequest
  ) => Promise<void>;
  deleteSchedule: (id: number) => Promise<void>;

  // Actions - Entries
  loadScheduleEntries: (
    scheduleId: number,
    filters?: ScheduleEntryFilters
  ) => Promise<void>;
  loadMyEntries: (startDate?: string, endDate?: string) => Promise<void>;
  createEntry: (
    scheduleId: number,
    data: CreateScheduleEntryRequest
  ) => Promise<ScheduleEntry>;
  updateEntry: (
    scheduleId: number,
    entryId: number,
    data: UpdateScheduleEntryRequest
  ) => Promise<void>;
  deleteEntry: (scheduleId: number, entryId: number) => Promise<void>;

  // Actions - Templates
  loadTemplates: () => Promise<void>;
  applyTemplate: (
    templateId: number,
    scheduleId: number,
    startDate: string,
    endDate: string,
    userIds?: number[]
  ) => Promise<number>;

  // Utility
  setFilters: (filters: ScheduleFilters) => void;
  setEntryFilters: (filters: ScheduleEntryFilters) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  schedules: [] as Schedule[],
  currentSchedule: null as Schedule | null,
  entries: [] as ScheduleEntry[],
  myEntries: [] as ScheduleEntry[],
  templates: [] as ScheduleTemplate[],
  isLoading: false,
  isLoadingEntries: false,
  isLoadingMyEntries: false,
  isSubmitting: false,
  total: 0,
  hasMore: true,
  filters: {} as ScheduleFilters,
  entryFilters: {} as ScheduleEntryFilters,
  error: null as string | null,
};

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  ...initialState,

  // ============================================
  // SCHEDULES
  // ============================================

  loadSchedules: async (filters, reset = false) => {
    const state = get();

    // Prevent multiple simultaneous loads
    if (state.isLoading) {
      return;
    }

    const offset = reset ? 0 : state.schedules.length;

    set({ isLoading: true, error: null });

    try {
      const mergedFilters = { ...state.filters, ...filters };
      const response = await scheduleApi.getSchedules(mergedFilters, {
        offset,
        limit: 20,
      });

      set({
        schedules: reset
          ? response.schedules
          : [...state.schedules, ...response.schedules],
        total: response.total,
        hasMore: response.schedules.length === 20,
        filters: mergedFilters,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить графики';
      // Set hasMore to false on error to prevent infinite retry loops
      set({ error: message, hasMore: false });
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить график';
      set({ error: message });
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось создать график';
      set({ error: message });
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
        currentSchedule:
          state.currentSchedule?.id === id ? updated : state.currentSchedule,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось обновить график';
      set({ error: message });
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
        currentSchedule:
          state.currentSchedule?.id === id ? null : state.currentSchedule,
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось удалить график';
      set({ error: message });
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
      const response = await scheduleApi.getScheduleEntries(
        scheduleId,
        mergedFilters
      );

      set({
        entries: response.entries,
        entryFilters: mergedFilters,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить записи';
      set({ error: message });
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
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Не удалось загрузить мои записи';
      set({ error: message });
    } finally {
      set({ isLoadingMyEntries: false });
    }
  },

  createEntry: async (scheduleId, data) => {
    set({ isSubmitting: true, error: null });

    try {
      // Use single entry API - returns proper error message from backend if user is absent
      const entry = await scheduleApi.createScheduleEntry(scheduleId, data);

      set((state) => ({
        entries: [...state.entries, entry].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
      }));
      return entry;
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Не удалось создать запись');
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateEntry: async (scheduleId, entryId, data) => {
    set({ isSubmitting: true, error: null });

    try {
      const updated = await scheduleApi.updateScheduleEntry(
        scheduleId,
        entryId,
        data
      );
      set((state) => ({
        entries: state.entries.map((e) => (e.id === entryId ? updated : e)),
        myEntries: state.myEntries.map((e) => (e.id === entryId ? updated : e)),
      }));
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Не удалось обновить запись');
      set({ error: message });
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось удалить запись';
      set({ error: message });
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить шаблоны';
      set({ error: message });
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
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось применить шаблон';
      set({ error: message });
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
