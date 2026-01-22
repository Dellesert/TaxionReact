import api from '@shared/api/axios.config';
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
  CreateBatchTemplateEntriesRequest,
  ApplyTemplateRequest,
  ApplyTemplateResponse,
  ImportScheduleRequest,
  ImportPreviewResponse,
  ImportResultResponse,
  ScheduleFilters,
  ScheduleEntryFilters,
} from '../types/schedule.types';

const SCHEDULE_ENDPOINTS = {
  LIST: '/schedules',
  DETAIL: (id: number) => `/schedules/${id}`,
  ENTRIES: (id: number) => `/schedules/${id}/entries`,
  ENTRY: (scheduleId: number, entryId: number) =>
    `/schedules/${scheduleId}/entries/${entryId}`,
  MY_ENTRIES: '/schedules/my-entries',
  IMPORT: '/schedules/import',
  IMPORT_FORMATS: '/schedules/import/formats',
};

const TEMPLATE_ENDPOINTS = {
  LIST: '/schedule-templates',
  DETAIL: (id: number) => `/schedule-templates/${id}`,
  ENTRIES: (id: number) => `/schedule-templates/${id}/entries`,
  ENTRY: (templateId: number, entryId: number) =>
    `/schedule-templates/${templateId}/entries/${entryId}`,
  APPLY: (id: number, scheduleId: number) =>
    `/schedule-templates/${id}/apply?schedule_id=${scheduleId}`,
};

// ============================================
// SCHEDULES
// ============================================

export const scheduleApi = {
  getSchedules: async (
    filters?: ScheduleFilters,
    pagination?: { limit?: number; offset?: number }
  ): Promise<ScheduleListResponse> => {
    const params = {
      ...filters,
      limit: pagination?.limit || 20,
      offset: pagination?.offset || 0,
    };

    const response = await api.get<{
      schedules: Schedule[];
      total: number;
      limit: number;
      offset: number;
    }>(SCHEDULE_ENDPOINTS.LIST, { params });

    return response.data;
  },

  getScheduleById: async (id: number): Promise<Schedule> => {
    const response = await api.get<{ schedule: Schedule }>(
      SCHEDULE_ENDPOINTS.DETAIL(id)
    );
    return response.data.schedule;
  },

  createSchedule: async (data: CreateScheduleRequest): Promise<Schedule> => {
    const response = await api.post<{ schedule: Schedule }>(
      SCHEDULE_ENDPOINTS.LIST,
      data
    );
    return response.data.schedule;
  },

  updateSchedule: async (
    id: number,
    data: UpdateScheduleRequest
  ): Promise<Schedule> => {
    const response = await api.put<{ schedule: Schedule }>(
      SCHEDULE_ENDPOINTS.DETAIL(id),
      data
    );
    return response.data.schedule;
  },

  deleteSchedule: async (id: number): Promise<void> => {
    await api.delete(SCHEDULE_ENDPOINTS.DETAIL(id));
  },

  // ============================================
  // SCHEDULE ENTRIES
  // ============================================

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

  deleteScheduleEntry: async (
    scheduleId: number,
    entryId: number
  ): Promise<void> => {
    await api.delete(SCHEDULE_ENDPOINTS.ENTRY(scheduleId, entryId));
  },

  // ============================================
  // IMPORT
  // ============================================

  previewImport: async (
    data: ImportScheduleRequest
  ): Promise<ImportPreviewResponse> => {
    const response = await api.post<{ preview: ImportPreviewResponse }>(
      SCHEDULE_ENDPOINTS.IMPORT,
      { ...data, preview: true }
    );
    return response.data.preview;
  },

  importSchedule: async (
    data: ImportScheduleRequest
  ): Promise<ImportResultResponse> => {
    const response = await api.post<{ result: ImportResultResponse }>(
      SCHEDULE_ENDPOINTS.IMPORT,
      { ...data, preview: false }
    );
    return response.data.result;
  },

  getSupportedFormats: async (): Promise<{
    formats: unknown[];
    file_types: string[];
  }> => {
    const response = await api.get(SCHEDULE_ENDPOINTS.IMPORT_FORMATS);
    return response.data;
  },
};

// ============================================
// TEMPLATES
// ============================================

export const templateApi = {
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

  getTemplateById: async (id: number): Promise<ScheduleTemplate> => {
    const response = await api.get<{ template: ScheduleTemplate }>(
      TEMPLATE_ENDPOINTS.DETAIL(id)
    );
    return response.data.template;
  },

  createTemplate: async (
    data: CreateTemplateRequest
  ): Promise<ScheduleTemplate> => {
    const response = await api.post<{ template: ScheduleTemplate }>(
      TEMPLATE_ENDPOINTS.LIST,
      data
    );
    return response.data.template;
  },

  updateTemplate: async (
    id: number,
    data: Partial<CreateTemplateRequest>
  ): Promise<ScheduleTemplate> => {
    const response = await api.put<{ template: ScheduleTemplate }>(
      TEMPLATE_ENDPOINTS.DETAIL(id),
      data
    );
    return response.data.template;
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await api.delete(TEMPLATE_ENDPOINTS.DETAIL(id));
  },

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

  addBatchTemplateEntries: async (
    templateId: number,
    data: CreateBatchTemplateEntriesRequest
  ): Promise<ScheduleTemplate> => {
    const response = await api.post<{ template: ScheduleTemplate }>(
      TEMPLATE_ENDPOINTS.ENTRIES(templateId),
      data
    );
    return response.data.template;
  },

  deleteTemplateEntry: async (
    templateId: number,
    entryId: number
  ): Promise<void> => {
    await api.delete(TEMPLATE_ENDPOINTS.ENTRY(templateId, entryId));
  },

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
