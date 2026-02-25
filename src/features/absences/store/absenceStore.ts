import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { absenceApi } from '../api/absence.api';
import { getZustandAbsenceStorage, isNative } from '@shared/storage';
import type {
  Absence,
  AbsenceFilters,
  CreateAbsenceRequest,
  UpdateAbsenceRequest,
  Substitution,
  CreateSubstitutionRequest,
  UpdateSubstitutionRequest,
} from '../types/absence.types';

interface AbsenceState {
  // Data
  absences: Absence[];
  currentAbsence: Absence | null;
  userAbsences: Absence[];

  // Substitutions
  substitutions: Substitution[];
  isLoadingSubstitutions: boolean;
  isSubmittingSubstitution: boolean;

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
  loadAbsences: (filters?: AbsenceFilters, reset?: boolean, explicitOffset?: number) => Promise<void>;
  loadAbsenceById: (id: number) => Promise<Absence>;
  createAbsence: (data: CreateAbsenceRequest) => Promise<Absence>;
  updateAbsence: (id: number, data: UpdateAbsenceRequest) => Promise<void>;
  deleteAbsence: (id: number) => Promise<void>;

  // Actions - User Absences
  loadUserAbsences: (userId: number, startDate?: string, endDate?: string) => Promise<void>;

  // Actions - Substitutions
  loadSubstitutions: (absenceId: number) => Promise<Substitution[]>;
  createSubstitution: (
    absenceId: number,
    data: CreateSubstitutionRequest
  ) => Promise<Substitution>;
  updateSubstitution: (
    absenceId: number,
    substitutionId: number,
    data: UpdateSubstitutionRequest
  ) => Promise<Substitution>;
  deleteSubstitution: (absenceId: number, substitutionId: number) => Promise<void>;
  clearSubstitutions: () => void;

  // Utility
  setFilters: (filters: AbsenceFilters) => void;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  absences: [] as Absence[],
  currentAbsence: null as Absence | null,
  userAbsences: [] as Absence[],
  substitutions: [] as Substitution[],
  isLoadingSubstitutions: false,
  isSubmittingSubstitution: false,
  isLoading: false,
  isLoadingUser: false,
  isSubmitting: false,
  total: 0,
  hasMore: true,
  filters: { sort_order: 'asc' } as AbsenceFilters,
  error: null as string | null,
};

// Pre-load from localStorage on web (skipHydration prevents auto-rehydration)
let preloadedAbsences: Absence[] | null = null;
let preloadedTotal: number | null = null;
let preloadedFilters: AbsenceFilters | null = null;
if (!isNative) {
  try {
    const stored = localStorage.getItem('taxion-absence-storage:absence-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed?.state?.absences)) {
        preloadedAbsences = parsed.state.absences;
      }
      if (typeof parsed?.state?.total === 'number') {
        preloadedTotal = parsed.state.total;
      }
      if (parsed?.state?.filters && typeof parsed.state.filters === 'object') {
        preloadedFilters = parsed.state.filters;
      }
    }
  } catch {
    // Ignore — will use initial state
  }
}

export const useAbsenceStore = create<AbsenceState>()(
  persist(
    (set, get) => ({
  ...initialState,
  absences: preloadedAbsences || [],
  total: preloadedTotal ?? 0,
  filters: preloadedFilters || { sort_order: 'asc' } as AbsenceFilters,

  // ============================================
  // ABSENCES
  // ============================================

  loadAbsences: async (filters, reset = false, explicitOffset) => {
    const state = get();

    if (state.isLoading) {
      return;
    }

    const offset = explicitOffset !== undefined ? explicitOffset : (reset ? 0 : state.absences.length);

    // Stale-while-revalidate: only show skeleton when no cached data
    const hasCachedData = state.absences.length > 0;
    set({ isLoading: !hasCachedData, error: null });

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
  // SUBSTITUTIONS
  // ============================================

  loadSubstitutions: async (absenceId) => {
    set({ isLoadingSubstitutions: true, error: null });

    try {
      const substitutions = await absenceApi.getSubstitutions(absenceId);
      set({ substitutions });
      return substitutions;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось загрузить замещения';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoadingSubstitutions: false });
    }
  },

  createSubstitution: async (absenceId, data) => {
    set({ isSubmittingSubstitution: true, error: null });

    try {
      const substitution = await absenceApi.createSubstitution(absenceId, data);
      set((state) => ({
        substitutions: [...state.substitutions, substitution],
      }));
      return substitution;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось создать замещение';
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmittingSubstitution: false });
    }
  },

  updateSubstitution: async (absenceId, substitutionId, data) => {
    set({ isSubmittingSubstitution: true, error: null });

    try {
      const updated = await absenceApi.updateSubstitution(
        absenceId,
        substitutionId,
        data
      );
      set((state) => ({
        substitutions: state.substitutions.map((s) =>
          s.id === substitutionId ? updated : s
        ),
      }));
      return updated;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось обновить замещение';
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmittingSubstitution: false });
    }
  },

  deleteSubstitution: async (absenceId, substitutionId) => {
    set({ isSubmittingSubstitution: true, error: null });

    try {
      await absenceApi.deleteSubstitution(absenceId, substitutionId);
      set((state) => ({
        substitutions: state.substitutions.filter((s) => s.id !== substitutionId),
      }));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Не удалось удалить замещение';
      set({ error: message });
      throw error;
    } finally {
      set({ isSubmittingSubstitution: false });
    }
  },

  clearSubstitutions: () => set({ substitutions: [] }),

  // ============================================
  // UTILITY
  // ============================================

  setFilters: (filters) => set({ filters }),
  clearError: () => set({ error: null }),
  reset: () => set(initialState),
    }),
    {
      name: 'absence-storage',
      storage: createJSONStorage(() => getZustandAbsenceStorage()),
      partialize: (state) => ({
        absences: state.absences,
        total: state.total,
        filters: state.filters,
      }),
      skipHydration: !isNative,
      version: 1,
    }
  )
);
