/**
 * Calendar API
 * API клиент для работы с календарем и событиями
 */

import api from './axios.config';
import { API_ENDPOINTS } from '@constants/api.constants';
import {
  Event,
  CreateEventDto,
  UpdateEventDto,
  AddEventParticipantsDto,
  UpdateParticipantStatusDto,
  AddEventReminderDto,
  CheckConflictDto,
  ConflictResponse,
  EventListFilters,
  CalendarParams,
} from '../types/calendar.types';
import { ApiResponse } from '../types/common.types';

// ============= Event Operations =============

/**
 * Get list of events with filters
 */
export const getEvents = async (filters?: EventListFilters): Promise<Event[]> => {
  const response = await api.get<ApiResponse<Event[]>>(API_ENDPOINTS.EVENT.LIST, {
    params: filters,
  });
  return response.data.data;
};

/**
 * Create new event
 */
export const createEvent = async (data: CreateEventDto): Promise<Event> => {
  const response = await api.post<ApiResponse<Event>>(API_ENDPOINTS.EVENT.CREATE, data);
  return response.data.data;
};

/**
 * Get event by ID
 */
export const getEvent = async (id: number): Promise<Event> => {
  const response = await api.get<ApiResponse<Event>>(API_ENDPOINTS.EVENT.BY_ID(id));
  return response.data.data;
};

/**
 * Update event
 */
export const updateEvent = async (id: number, data: UpdateEventDto): Promise<Event> => {
  const response = await api.put<ApiResponse<Event>>(API_ENDPOINTS.EVENT.UPDATE(id), data);
  return response.data.data;
};

/**
 * Delete event
 */
export const deleteEvent = async (id: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.EVENT.DELETE(id));
};

/**
 * Get calendar view (day/week/month)
 */
export const getCalendar = async (params: CalendarParams): Promise<Event[]> => {
  const response = await api.get<ApiResponse<Event[]>>(API_ENDPOINTS.EVENT.CALENDAR, {
    params,
  });
  return response.data.data;
};

/**
 * Search events
 */
export const searchEvents = async (query: string): Promise<Event[]> => {
  const response = await api.get<ApiResponse<Event[]>>(API_ENDPOINTS.EVENT.SEARCH, {
    params: { query },
  });
  return response.data.data;
};

/**
 * Check for scheduling conflicts
 */
export const checkConflict = async (data: CheckConflictDto): Promise<ConflictResponse> => {
  const response = await api.post<ApiResponse<ConflictResponse>>(
    API_ENDPOINTS.EVENT.CHECK_CONFLICT,
    data
  );
  return response.data.data;
};

// ============= Event Participants =============

/**
 * Add participants to event
 */
export const addEventParticipants = async (
  eventId: number,
  data: AddEventParticipantsDto
): Promise<Event> => {
  const response = await api.post<ApiResponse<Event>>(
    API_ENDPOINTS.EVENT.PARTICIPANTS(eventId),
    data
  );
  return response.data.data;
};

/**
 * Remove participant from event
 */
export const removeEventParticipant = async (
  eventId: number,
  userId: number
): Promise<void> => {
  await api.delete(API_ENDPOINTS.EVENT.REMOVE_PARTICIPANT(eventId, userId));
};

/**
 * Update participant status (accept/decline/maybe)
 */
export const updateParticipantStatus = async (
  eventId: number,
  data: UpdateParticipantStatusDto
): Promise<Event> => {
  const response = await api.put<ApiResponse<Event>>(
    API_ENDPOINTS.EVENT.UPDATE_STATUS(eventId),
    data
  );
  return response.data.data;
};

// ============= Event Reminders =============

/**
 * Add reminder to event
 */
export const addEventReminder = async (
  eventId: number,
  data: AddEventReminderDto
): Promise<Event> => {
  const response = await api.post<ApiResponse<Event>>(
    API_ENDPOINTS.EVENT.REMINDERS(eventId),
    data
  );
  return response.data.data;
};

/**
 * Delete event reminder
 */
export const deleteEventReminder = async (
  eventId: number,
  reminderId: number
): Promise<void> => {
  await api.delete(API_ENDPOINTS.EVENT.DELETE_REMINDER(eventId, reminderId));
};
