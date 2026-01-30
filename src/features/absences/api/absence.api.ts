import api from '@shared/api/axios.config';
import type {
  Absence,
  AbsenceListResponse,
  CreateAbsenceRequest,
  UpdateAbsenceRequest,
  AbsenceFilters,
  Substitution,
  CreateSubstitutionRequest,
  UpdateSubstitutionRequest,
} from '../types/absence.types';

const ENDPOINTS = {
  LIST: '/absences',
  BY_ID: (id: number) => `/absences/${id}`,
  USER_ABSENCES: (userId: number) => `/users/${userId}/absences`,
  // Substitutions
  SUBSTITUTIONS: (absenceId: number) => `/absences/${absenceId}/substitutions`,
  SUBSTITUTION_BY_ID: (absenceId: number, subId: number) =>
    `/absences/${absenceId}/substitutions/${subId}`,
  USER_SUBSTITUTIONS: (userId: number) => `/users/${userId}/substitutions`,
};

export const absenceApi = {
  getAbsences: async (
    filters?: AbsenceFilters,
    pagination?: { limit?: number; offset?: number }
  ): Promise<AbsenceListResponse> => {
    const params = {
      ...filters,
      limit: pagination?.limit || 20,
      offset: pagination?.offset || 0,
    };

    const response = await api.get<AbsenceListResponse>(ENDPOINTS.LIST, { params });
    return response.data;
  },

  getAbsenceById: async (id: number): Promise<Absence> => {
    const response = await api.get<{ absence: Absence }>(ENDPOINTS.BY_ID(id));
    return response.data.absence;
  },

  createAbsence: async (data: CreateAbsenceRequest): Promise<Absence> => {
    const response = await api.post<{ absence: Absence }>(ENDPOINTS.LIST, data);
    return response.data.absence;
  },

  updateAbsence: async (id: number, data: UpdateAbsenceRequest): Promise<Absence> => {
    const response = await api.put<{ absence: Absence }>(ENDPOINTS.BY_ID(id), data);
    return response.data.absence;
  },

  deleteAbsence: async (id: number): Promise<void> => {
    await api.delete(ENDPOINTS.BY_ID(id));
  },

  getUserAbsences: async (
    userId: number,
    startDate?: string,
    endDate?: string
  ): Promise<Absence[]> => {
    const params: Record<string, string | undefined> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await api.get<{ absences: Absence[] }>(
      ENDPOINTS.USER_ABSENCES(userId),
      { params }
    );
    return response.data.absences;
  },

  // ============================================
  // SUBSTITUTIONS
  // ============================================

  getSubstitutions: async (absenceId: number): Promise<Substitution[]> => {
    const response = await api.get<{ substitutions: Substitution[] }>(
      ENDPOINTS.SUBSTITUTIONS(absenceId)
    );
    return response.data.substitutions;
  },

  createSubstitution: async (
    absenceId: number,
    data: CreateSubstitutionRequest
  ): Promise<Substitution> => {
    const response = await api.post<{ substitution: Substitution }>(
      ENDPOINTS.SUBSTITUTIONS(absenceId),
      data
    );
    return response.data.substitution;
  },

  updateSubstitution: async (
    absenceId: number,
    substitutionId: number,
    data: UpdateSubstitutionRequest
  ): Promise<Substitution> => {
    const response = await api.put<{ substitution: Substitution }>(
      ENDPOINTS.SUBSTITUTION_BY_ID(absenceId, substitutionId),
      data
    );
    return response.data.substitution;
  },

  deleteSubstitution: async (
    absenceId: number,
    substitutionId: number
  ): Promise<void> => {
    await api.delete(ENDPOINTS.SUBSTITUTION_BY_ID(absenceId, substitutionId));
  },

  getUserSubstitutions: async (
    userId: number,
    startDate?: string,
    endDate?: string
  ): Promise<Substitution[]> => {
    const params: Record<string, string | undefined> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await api.get<{ substitutions: Substitution[] }>(
      ENDPOINTS.USER_SUBSTITUTIONS(userId),
      { params }
    );
    return response.data.substitutions;
  },
};
