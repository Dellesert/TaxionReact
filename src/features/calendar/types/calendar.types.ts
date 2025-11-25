/**
 * Calendar Types
 * Типы для работы с календарем и событиями
 */

import { ISODateString } from '@/types/common.types';
import { User } from '@/types/user.types';

// Event Types
export type EventType = 'personal' | 'meeting' | 'deadline';

// Event Participant Status
export type EventParticipantStatus = 'pending' | 'accepted' | 'declined' | 'maybe';

// Calendar View Type
export type CalendarView = 'day' | 'week' | 'month';

// Event Reminder Interface
export interface EventReminder {
  id: number;
  event_id: number;
  minutes_before: number;
  reminded_at?: ISODateString;
  created_at: ISODateString;
}

// Event Participant Interface
export interface EventParticipant {
  id: number;
  event_id: number;
  user_id: number;
  user?: User;
  status: EventParticipantStatus;
  response_note?: string;
  responded_at?: ISODateString;
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Recurrence Rule (simplified - can be extended)
export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // repeat every N days/weeks/months/years
  until?: ISODateString; // end date
  count?: number; // number of occurrences
  by_weekday?: number[]; // 0 = Sunday, 1 = Monday, etc.
  by_month_day?: number[]; // days of month (1-31)
  by_month?: number[]; // months (1-12)
}

// Event Interface
export interface Event {
  id: number;
  title: string;
  description?: string;
  start_time: ISODateString;
  end_time: ISODateString;
  all_day: boolean;
  location?: string;
  type: EventType;
  color: string;
  is_private: boolean;
  is_recurring: boolean;
  recurrence_rule?: RecurrenceRule;
  created_by: number;
  creator?: User;
  participants?: EventParticipant[]; // Only loaded when fetching single event
  participant_count?: number; // From backend (snake_case)
  participants_count?: number; // Alias for compatibility
  user_status?: EventParticipantStatus; // Current user's status
  reminders?: EventReminder[];
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Create Event DTO
export interface CreateEventDto {
  title: string;
  description?: string;
  start_time: ISODateString;
  end_time: ISODateString;
  all_day?: boolean;
  location?: string;
  type?: EventType;
  color?: string;
  is_private?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
  participant_ids?: number[];
  reminder_minutes?: number[]; // Array of minutes before event
}

// Update Event DTO
export interface UpdateEventDto {
  title?: string;
  description?: string;
  start_time?: ISODateString;
  end_time?: ISODateString;
  all_day?: boolean;
  location?: string;
  type?: EventType;
  color?: string;
  is_private?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
}

// Add Event Participants DTO
export interface AddEventParticipantsDto {
  user_ids: number[];
}

// Update Participant Status DTO
export interface UpdateParticipantStatusDto {
  status: EventParticipantStatus;
  response_note?: string;
}

// Add Event Reminder DTO
export interface AddEventReminderDto {
  minutes_before: number;
}

// Check Conflict DTO
export interface CheckConflictDto {
  user_ids: number[];
  start_time: ISODateString;
  end_time: ISODateString;
  exclude_event_id?: number;
}

// Conflict Response
export interface ConflictResponse {
  has_conflict: boolean;
  conflicts: {
    user_id: number;
    user?: User;
    conflicting_events: Event[];
  }[];
}

// Event List Filters
export interface EventListFilters {
  type?: EventType;
  start?: ISODateString;
  end?: ISODateString;
  is_private?: boolean;
  participant_id?: number;
  search?: string;
}

// Calendar Params
export interface CalendarParams {
  view: CalendarView;
  date: ISODateString;
  user_id?: number;
}
