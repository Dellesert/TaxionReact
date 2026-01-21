import { create } from 'zustand';
import { absenceApi } from '../api/absence.api';
import type {
  Absence,
  AbsenceFilters,
  CreateAbsenceRequest,
  UpdateAbsenceRequest,
} from '../types/absence.types';

interface AbsenceState {
  // Data
  absences: Absence[];
  currentAbsence: Absence | null;
  userAbsences: Absence[];

  // Loading states
  isLoading: boolean;
  isLoadingUser: boolean;
  isSubmitting: boolean;

  // Pagination
  total: number;
  hasMore: boolean;

  // Filters
  filters: AbsenceFilters;

  // Error
  error: string | null;

  // Actions - Absences
  loadAbsences: (filters?: AbsenceFilters, reset?: boolean) => Promise<void>;
  loadAbsenceById: (id: number) => Promise<Absence>;
  createAbsence: (data: CreateAbsenceRequest) => Promise<Absence>;
  updateAbsence: (id: number, data: UpdateAbsenceRequest) => Promise<void>;
  deleteAbsence: (id: number) => Promise<void>;

  // Actions - User Absences
  loadUserAbsences: (userId: number, startDate?: string, endDate?: string) => Promise<void>;

  // Utility
  setFilters: (filters: AbsenceFilters) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  absences: [] as Absence[],
  currentAbsence: null as Absence | null,
  userAbsences: [] as Absence[],
  isLoading: false,
  isLoadingUser: false,
  isSubmitting: false,
  total: 0,
  hasMore: true,
  filters: {} as AbsenceFilters,
  error: null as string | null,
};

export const useAbsenceStore = create<AbsenceState>((set, get) => ({
  ...initialState,

  // ============================================
  // ABSENCES
  // ============================================

  loadAbsences: async (filters, reset = false) => {
    const state = get();

    if (state.isLoading) {
      return;
    }

    const offset = reset ? 0 : state.absences.length;

    set({ isLoading: true, error: null });

    try {
      const mergedFilters = { ...state.filters, ...filters };
      const response = await absenceApi.getAbsences(mergedFilters, {
        offset,
        limit: 20,
      });

      set({
        absences: reset
          ? response.absences
          : [...state.absences, ...response.absences],
        total: response.total,
        hasMore: response.absences.length === 20,
        filters: mergedFilters,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить отсутствия';
      set({ error: message, hasMore: false });
    } finally {
      set({ isLoading: false });
    }
  },

  loadAbsenceById: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const absence = await absenceApi.getAbsenceById(id);
      set({ currentAbsence: absence });
      return absence;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить отсутствие';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  createAbsence: async (data) => {
    set({ isSubmitting: true, error: null });

    try {
      const absence = await absenceApi.createAbsence(data);
      set((state) => ({
        absences: [absence, ...state.absences],
        total: state.total + 1,
      }));
      return absence;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось создать отсутствие';
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  updateAbsence: async (id, data) => {
    set({ isSubmitting: true, error: null });

    try {
      const updated = await absenceApi.updateAbsence(id, data);
      set((state) => ({
        absences: state.absences.map((a) => (a.id === id ? updated : a)),
        currentAbsence:
          state.currentAbsence?.id === id ? updated : state.currentAbsence,
        userAbsences: state.userAbsences.map((a) => (a.id === id ? updated : a)),
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось обновить отсутствие';
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  deleteAbsence: async (id) => {
    set({ isSubmitting: true, error: null });

    try {
      await absenceApi.deleteAbsence(id);
      set((state) => ({
        absences: state.absences.filter((a) => a.id !== id),
        total: state.total - 1,
        currentAbsence:
          state.currentAbsence?.id === id ? null : state.currentAbsence,
        userAbsences: state.userAbsences.filter((a) => a.id !== id),
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось удалить отсутствие';
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  // ============================================
  // USER ABSENCES
  // ============================================

  loadUserAbsences: async (userId, startDate, endDate) => {
    set({ isLoadingUser: true, error: null });

    try {
      const absences = await absenceApi.getUserAbsences(userId, startDate, endDate);
      set({ userAbsences: absences });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Не удалось загрузить отсутствия пользователя';
      set({ error: message });
    } finally {
      set({ isLoadingUser: false });
    }
  },

  // ============================================
  // UTILITY
  // ============================================

  setFilters: (filters) => set({ filters }),
  clearError: () => set({ error: null }),
  reset: () => set(initialState),
}));
