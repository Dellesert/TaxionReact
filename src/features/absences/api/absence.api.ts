import api from '@shared/api/axios.config';
import type {
  Absence,
  AbsenceListResponse,
  CreateAbsenceRequest,
  UpdateAbsenceRequest,
  AbsenceFilters,
} from '../types/absence.types';

const ENDPOINTS = {
  LIST: '/absences',
  BY_ID: (id: number) => `/absences/${id}`,
  USER_ABSENCES: (userId: number) => `/users/${userId}/absences`,
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
};
